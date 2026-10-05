'use client';

import { useState } from 'react';

import { Modal } from './Modal';
import { CopyButton } from './CopyButton';
import { DownloadIcon, UploadIcon } from './Icon';
import { normalizeError } from '@/lib/errors';
import type { BulkImportResult } from '@/lib/types';

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate(filename: string, headers: string[]) {
  downloadCsv(filename, [headers]);
}

/** The generated-password list a bulk upload returns - opens directly in
 * Excel/Sheets, which is what "return the passwords as an Excel list"
 * means in practice without pulling in a binary .xlsx-writing dependency
 * (the well-known npm `xlsx` package ships unpatched CVEs; `exceljs`
 * drags in ~100 transitive packages for one flat sheet) just for this. */
function downloadPasswordsCsv(result: BulkImportResult) {
  const rows: string[][] = [['Row', 'Email', 'Temporary password']];
  for (const row of result.results) {
    if (row.status === 'created' && row.tempPassword) {
      rows.push([String(row.row), row.email ?? '', row.tempPassword]);
    }
  }
  downloadCsv('generated-passwords.csv', rows);
}

/**
 * Shared by the Teachers and Students pages - parsing happens server-side
 * (see nool-core's src/services/bulk_import.py), this only uploads the
 * file and renders the per-row results it gets back, reusing the same
 * "temp password shown once" treatment as a single invite/create.
 */
export function BulkUploadModal({
  open,
  title,
  templateFilename,
  templateHeaders,
  onUpload,
  onClose,
  onImported,
}: {
  open: boolean;
  title: string;
  templateFilename: string;
  templateHeaders: string[];
  onUpload: (file: File) => Promise<BulkImportResult>;
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  function handleClose() {
    setFile(null);
    setFormError(null);
    setResult(null);
    onClose();
  }

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const imported = await onUpload(file);
      setResult(imported);
      if (imported.createdCount > 0) onImported();
    } catch (cause) {
      setFormError(normalizeError(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={title} onClose={handleClose} wide>
      {!result ? (
        <>
          <button
            type="button"
            className="link-btn"
            style={{ marginBottom: 16 }}
            onClick={() => downloadTemplate(templateFilename, templateHeaders)}
          >
            <DownloadIcon /> Download CSV template
          </button>

          <div className="file-drop">
            <input
              type="file"
              accept=".csv,.xlsx"
              disabled={submitting}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p style={{ marginTop: 10 }}>Accepts .csv or .xlsx, up to 500 rows.</p>
          </div>

          {formError ? <p style={{ color: 'var(--color-red)', marginTop: 12 }}>{formError}</p> : null}

          <div className="modal-actions">
            <button type="button" className="btn white" onClick={handleClose}>
              Cancel
            </button>
            <button type="button" className="btn yellow" disabled={!file || submitting} onClick={() => void handleSubmit()}>
              <UploadIcon /> {submitting ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="bulk-summary">
            <div className="stat">
              <small>Created</small>
              <strong style={{ color: 'var(--color-green)' }}>{result.createdCount}</strong>
            </div>
            <div className="stat">
              <small>Failed</small>
              <strong style={{ color: result.errorCount > 0 ? 'var(--color-red)' : undefined }}>
                {result.errorCount}
              </strong>
            </div>
          </div>

          <div className="bulk-results">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Email</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((row) => (
                  <tr key={row.row}>
                    <td>{row.row}</td>
                    <td>{row.email ?? '—'}</td>
                    <td>
                      {row.status === 'created' && row.tempPassword ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <code>{row.tempPassword}</code>
                          <CopyButton value={row.tempPassword} />
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-red)' }}>{row.error ?? row.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 12 }}>
            Temporary passwords above won&apos;t be shown again - share them now.
          </p>

          <div className="modal-actions">
            <button
              type="button"
              className="btn white"
              disabled={result.createdCount === 0}
              onClick={() => downloadPasswordsCsv(result)}
            >
              <DownloadIcon /> Download passwords
            </button>
            <button type="button" className="btn dark" onClick={handleClose}>
              Done
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
