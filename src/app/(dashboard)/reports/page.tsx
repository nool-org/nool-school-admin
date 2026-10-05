'use client';

import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { ExecutiveReport } from '@/components/ExecutiveReport';
import { DownloadIcon, PlusIcon, TrashIcon } from '@/components/Icon';
import { ErrorState, LoadingState } from '@/components/states';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import {
  createReportConfig,
  deleteReportConfig,
  exportReportConfig,
  exportSharedReport,
  listReportConfigs,
  listReportDimensions,
  listSharedReports,
  runReport,
  runSharedReport,
} from '@/lib/api';
import { normalizeError } from '@/lib/errors';
import { useAsyncData } from '@/lib/useAsyncData';
import type { DimensionSpec, ReportConfiguration, ReportResult, SharedReport } from '@/lib/types';

/**
 * The class/section/student report builder - pick a dimension (Class,
 * Section, or Student - the SCHOOL-scoped subset of nool-core's
 * src/services/reporting.py DIMENSIONS registry, the same registry
 * nool-super-admin's own Reports page uses), pick metrics, run, save,
 * export. Also shows reports a Super Admin has shared with this school.
 */
export default function ReportsPage() {
  const { show } = useToast();
  const dimensionsState = useAsyncData('report-dimensions', () => listReportDimensions());
  const configsState = useAsyncData('report-configs', () => listReportConfigs());
  const sharedState = useAsyncData('shared-reports', () => listSharedReports());

  const dimensions = dimensionsState.status === 'success' ? dimensionsState.data : [];

  const [selectedDimension, setSelectedDimension] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('');

  const [result, setResult] = useState<ReportResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const [saveOpen, setSaveOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ReportConfiguration | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [sharedResult, setSharedResult] = useState<{ share: SharedReport; result: ReportResult } | null>(null);
  const [sharedRunning, setSharedRunning] = useState<string | null>(null);

  // Falls back to the first available dimension until the user picks one
  // explicitly - a derived default rather than a setState-in-effect, so
  // there's no extra render once dimensions load. Not memoized: `dimensions`
  // is a small, freshly-derived array every render, so a useMemo here would
  // never actually skip the find() - just do it directly.
  const effectiveDimensionKey = selectedDimension || dimensions[0]?.key || '';
  const activeDimension: DimensionSpec | undefined = dimensions.find((d) => d.key === effectiveDimensionKey);

  function selectDimension(key: string) {
    setSelectedDimension(key);
    setSelectedMetrics(new Set());
    setStatusFilter('');
    setResult(null);
    setRunError(null);
  }

  function toggleMetric(key: string) {
    setSelectedMetrics((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function currentFilters(): Record<string, unknown> {
    return statusFilter ? { status: statusFilter } : {};
  }

  async function handleRun() {
    if (!activeDimension || selectedMetrics.size === 0) return;
    setRunning(true);
    setRunError(null);
    try {
      const res = await runReport({
        dimension: activeDimension.key,
        metrics: Array.from(selectedMetrics),
        filters: currentFilters(),
      });
      setResult(res);
    } catch (cause) {
      setRunError(normalizeError(cause).message);
    } finally {
      setRunning(false);
    }
  }

  function openSave() {
    setReportName('');
    setSaveError(null);
    setSaveOpen(true);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!activeDimension) return;
    setSaving(true);
    setSaveError(null);
    try {
      await createReportConfig({
        name: reportName,
        dimension: activeDimension.key,
        metrics: Array.from(selectedMetrics),
        filters: currentFilters(),
      });
      setSaveOpen(false);
      if (configsState.status === 'success') configsState.refetch();
      show('Report saved.', 'success');
    } catch (cause) {
      setSaveError(normalizeError(cause).message);
    } finally {
      setSaving(false);
    }
  }

  function loadSavedReport(config: ReportConfiguration) {
    setSelectedDimension(config.dimension);
    setSelectedMetrics(new Set(config.metrics));
    setStatusFilter(typeof config.filters.status === 'string' ? config.filters.status : '');
    setResult(null);
    setRunError(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteReportConfig(deleteTarget.id);
      show(`"${deleteTarget.name}" deleted.`, 'success');
      setDeleteTarget(null);
      if (configsState.status === 'success') configsState.refetch();
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleExport(config: ReportConfiguration) {
    try {
      await exportReportConfig(config.id, `${config.name}.csv`);
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    }
  }

  async function handleRunShared(share: SharedReport & { shareId: string }) {
    setSharedRunning(share.shareId);
    try {
      const res = await runSharedReport(share.shareId);
      setSharedResult({ share, result: res });
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setSharedRunning(null);
    }
  }

  async function handleExportShared(share: SharedReport) {
    try {
      await exportSharedReport(share.shareId, `${share.name}.csv`);
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    }
  }

  function resultColumns(res: ReportResult, dimensionLabel: string): GridColDef[] {
    return [
      { field: 'label', headerName: dimensionLabel, flex: 1, minWidth: 180 },
      ...res.metrics.map((m) => ({
        field: m,
        headerName: activeDimension?.metrics.find((spec) => spec.key === m)?.label ?? m,
        flex: 1,
        minWidth: 140,
        valueGetter: (_value: unknown, row: Record<string, unknown>) => {
          const v = row[m];
          if (typeof v === 'boolean') return v ? 'Yes' : 'No';
          return v ?? '—';
        },
      })),
    ];
  }

  const configColumns: GridColDef<ReportConfiguration>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    { field: 'dimension', headerName: 'Dimension', width: 130 },
    {
      field: 'metrics',
      headerName: 'Metrics',
      flex: 1,
      minWidth: 200,
      valueGetter: (_value, row) => row.metrics.join(', '),
    },
    {
      field: 'actions',
      headerName: '',
      width: 220,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn white sm" onClick={() => loadSavedReport(params.row)}>
            Load
          </button>
          <button type="button" className="btn white sm" onClick={() => void handleExport(params.row)}>
            <DownloadIcon /> Export
          </button>
          <button type="button" className="btn danger sm" onClick={() => setDeleteTarget(params.row)}>
            <TrashIcon />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Reports</h1>
        </div>
        <p className="lead">
          A snapshot of real school performance, ready to share with school leadership - plus a builder
          below for custom reports at the Class, Section, or Student level.
        </p>
      </div>

      <div className="section-head" style={{ marginBottom: 12 }}>
        <h3>School report</h3>
      </div>
      <ExecutiveReport />

      <div className="section-head" style={{ marginBottom: 12 }}>
        <h3>Custom report builder</h3>
      </div>

      {dimensionsState.status === 'loading' ? <LoadingState label="Loading report options" /> : null}
      {dimensionsState.status === 'error' ? <ErrorState error={dimensionsState.error} onRetry={dimensionsState.retry} /> : null}

      {dimensionsState.status === 'success' ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Build a report</h3>
          <div className="form-row">
            <label htmlFor="report-dimension">Level</label>
            <select
              id="report-dimension"
              className="field"
              value={effectiveDimensionKey}
              onChange={(e) => selectDimension(e.target.value)}
            >
              {dimensions.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {activeDimension ? (
            <>
              <div className="form-row">
                <label>Metrics</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {activeDimension.metrics.map((m) => (
                    <label
                      key={m.key}
                      className="checkrow"
                      style={{ padding: '6px 10px', border: '1px solid var(--color-line)', borderRadius: 8 }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMetrics.has(m.key)}
                        onChange={() => toggleMetric(m.key)}
                        style={{ marginRight: 8 }}
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row-inline">
                <div className="form-row">
                  <label htmlFor="report-status-filter">Status filter (optional)</label>
                  <select
                    id="report-status-filter"
                    className="field"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Any status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="DEACTIVATED">Deactivated</option>
                  </select>
                </div>
              </div>

              {runError ? <p style={{ color: 'var(--color-red)' }}>{runError}</p> : null}

              <div className="modal-actions" style={{ justifyContent: 'flex-start', gap: 8 }}>
                <button
                  type="button"
                  className="btn yellow"
                  disabled={running || selectedMetrics.size === 0}
                  onClick={() => void handleRun()}
                >
                  {running ? 'Running…' : 'Run report'}
                </button>
                <button type="button" className="btn white" disabled={selectedMetrics.size === 0} onClick={openSave}>
                  <PlusIcon /> Save report
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Results</h3>
          {result.rows.length === 0 ? (
            <p style={{ color: 'var(--color-muted)' }}>No rows match this report.</p>
          ) : (
            <DataTable
              rows={result.rows}
              columns={resultColumns(result, activeDimension?.label ?? 'Label')}
              getRowId={(row) => row.label}
            />
          )}
        </div>
      ) : null}

      <div className="section-head" style={{ marginBottom: 12 }}>
        <h3>Saved reports</h3>
      </div>
      {configsState.status === 'loading' ? <LoadingState label="Loading saved reports" /> : null}
      {configsState.status === 'error' ? <ErrorState error={configsState.error} onRetry={configsState.retry} /> : null}
      {configsState.status === 'success' && configsState.data.length === 0 ? (
        <p style={{ color: 'var(--color-muted)' }}>No saved reports yet - build one above and save it.</p>
      ) : null}
      {configsState.status === 'success' && configsState.data.length > 0 ? (
        <DataTable rows={configsState.data} columns={configColumns} />
      ) : null}

      <div className="section-head" style={{ marginTop: 'var(--space-8)', marginBottom: 12 }}>
        <h3>Shared with your school</h3>
      </div>
      {sharedState.status === 'loading' ? <LoadingState label="Loading shared reports" /> : null}
      {sharedState.status === 'error' ? <ErrorState error={sharedState.error} onRetry={sharedState.retry} /> : null}
      {sharedState.status === 'success' && sharedState.data.length === 0 ? (
        <p style={{ color: 'var(--color-muted)' }}>
          No reports have been shared with your school by noolAI yet.
        </p>
      ) : null}
      {sharedState.status === 'success' && sharedState.data.length > 0 ? (
        <div className="panel-list">
          {sharedState.data.map((share) => (
            <div key={share.shareId} className="panel-list-row">
              <div>
                <div className="name">{share.name}</div>
                <div className="sub">
                  {share.dimension} · shared by {share.sharedByName} ·{' '}
                  {share.accessLevel === 'VIEW_EXPORT' ? 'view + export' : 'view only'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn white sm"
                  disabled={sharedRunning === share.shareId}
                  onClick={() => void handleRunShared(share)}
                >
                  {sharedRunning === share.shareId ? 'Loading…' : 'View'}
                </button>
                {share.accessLevel === 'VIEW_EXPORT' ? (
                  <button type="button" className="btn white sm" onClick={() => void handleExportShared(share)}>
                    <DownloadIcon /> Export
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Modal open={saveOpen} title="Save report" onClose={() => setSaveOpen(false)}>
        <form onSubmit={handleSave}>
          <div className="form-row">
            <label htmlFor="report-name">Name</label>
            <input
              id="report-name"
              className="field"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              required
            />
          </div>
          {saveError ? <p style={{ color: 'var(--color-red)' }}>{saveError}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn white" onClick={() => setSaveOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn yellow" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={sharedResult !== null}
        title={sharedResult ? sharedResult.share.name : 'Report'}
        onClose={() => setSharedResult(null)}
      >
        {sharedResult ? (
          sharedResult.result.rows.length === 0 ? (
            <p style={{ color: 'var(--color-muted)' }}>No rows match this report.</p>
          ) : (
            <DataTable
              rows={sharedResult.result.rows}
              columns={resultColumns(sharedResult.result, sharedResult.share.dimension)}
              getRowId={(row) => row.label}
            />
          )
        ) : null}
        <div className="modal-actions">
          <button type="button" className="btn dark" onClick={() => setSharedResult(null)}>
            Close
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete report?"
        message={deleteTarget ? `This permanently deletes "${deleteTarget.name}".` : ''}
        confirmLabel="Delete permanently"
        danger
        busy={deleteBusy}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
