'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import Switch from '@mui/material/Switch';

import { DataTable } from '@/components/DataTable';
import { ErrorState, LoadingState } from '@/components/states';
import { getCustomQuestionCollectionsSummary, listDatasets, updateDatasets } from '@/lib/api';
import { normalizeError } from '@/lib/errors';
import { useAsyncData } from '@/lib/useAsyncData';
import type { CustomQuestionCollectionSummary, SchoolDataset } from '@/lib/types';

export default function DatasetsPage() {
  const state = useAsyncData('datasets', () => listDatasets());
  const ownBankState = useAsyncData('own-question-bank-datasets', () => getCustomQuestionCollectionsSummary());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleToggle(datasetId: string, currentlyEnabled: boolean) {
    if (state.status !== 'success') return;
    setSavingId(datasetId);
    setSaveError(null);
    const nextEnabledIds = state.data
      .filter((d) => (d.id === datasetId ? !currentlyEnabled : d.enabled))
      .map((d) => d.id);
    try {
      await updateDatasets(nextEnabledIds);
      state.refetch();
    } catch (cause) {
      setSaveError(normalizeError(cause).message);
    } finally {
      setSavingId(null);
    }
  }

  const columns: GridColDef<SchoolDataset>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
    { field: 'questionCount', headerName: 'Questions', width: 120 },
    { field: 'description', headerName: 'Description', flex: 2, minWidth: 280 },
    {
      field: 'restricted',
      headerName: 'Availability',
      width: 130,
      sortable: false,
      renderCell: (params) =>
        params.row.restricted ? (
          <span className="tag yellow">Restricted</span>
        ) : (
          <span className="tag" style={{ color: 'var(--color-muted)' }}>
            Shared catalog
          </span>
        ),
    },
    {
      field: 'enabled',
      headerName: 'Active',
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Switch
          checked={params.row.enabled}
          disabled={savingId === params.row.id}
          onChange={() => handleToggle(params.row.id, params.row.enabled)}
        />
      ),
    },
  ];

  const ownBankColumns: GridColDef<CustomQuestionCollectionSummary>[] = [
    {
      field: 'collectionName',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
      valueGetter: (_value, row) => row.collectionName ?? 'School question bank (no set)',
    },
    { field: 'questionCount', headerName: 'Questions', width: 120 },
    {
      field: 'actions',
      headerName: '',
      width: 160,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params) => (
        <Link
          href={params.row.collectionName ? `/question-bank?collection=${encodeURIComponent(params.row.collectionName)}` : '/question-bank'}
          className="btn white sm"
        >
          Manage questions
        </Link>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Datasets</h1>
        </div>
        <p className="lead">
          Choose which question banks are available to teachers at this school. Dataset creation
          and editing is Super Admin&apos;s job (they&apos;re a shared, cross-school catalog) — this
          page only controls availability here.
        </p>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading datasets" /> : null}
      {state.status === 'error' ? <ErrorState onRetry={state.retry} /> : null}

      {state.status === 'success' ? (
        <>
          {saveError ? <p style={{ color: 'var(--color-red)', marginBottom: 12 }}>{saveError}</p> : null}
          <DataTable rows={state.data} columns={columns} />
        </>
      ) : null}

      <div className="section-head" style={{ marginTop: 'var(--space-8)', marginBottom: 12 }}>
        <h3>Your own question bank</h3>
      </div>
      <p className="lead" style={{ marginBottom: 16 }}>
        Every question set you&apos;ve built yourself (from the Question bank page) is, structurally, a
        dataset too - shown here for visibility. Add or edit questions from the Question bank page itself.
      </p>
      {ownBankState.status === 'loading' ? <LoadingState label="Loading your question bank" /> : null}
      {ownBankState.status === 'error' ? <ErrorState onRetry={ownBankState.retry} /> : null}
      {ownBankState.status === 'success' && ownBankState.data.length === 0 ? (
        <p style={{ color: 'var(--color-muted)' }}>
          No questions of your own yet - add some from the Question bank page.
        </p>
      ) : null}
      {ownBankState.status === 'success' && ownBankState.data.length > 0 ? (
        <DataTable rows={ownBankState.data} columns={ownBankColumns} getRowId={(row) => row.collectionName ?? '__general__'} />
      ) : null}
    </div>
  );
}
