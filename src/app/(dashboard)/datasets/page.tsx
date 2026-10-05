'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useToast } from '@/components/Toast';
import { createDataset, deleteDataset, listDatasets, listGrades, listSubjects, updateDataset } from '@/lib/api';
import { normalizeError } from '@/lib/errors';
import { useAsyncData } from '@/lib/useAsyncData';
import { subjectLabel, type SchoolDataset } from '@/lib/types';

const isInactive = (d: SchoolDataset) => d.subjectEnabled === false;

interface BankFormState {
  name: string;
  description: string;
  subjectId: string;
  grade: string;
}

const EMPTY_FORM: BankFormState = { name: '', description: '', subjectId: '', grade: '' };

export default function DatasetsPage() {
  const { show } = useToast();
  const state = useAsyncData('datasets', () => listDatasets());
  const gradesState = useAsyncData('grades', () => listGrades());
  // A bank needs a real Class: only ACTIVE grades that have sections (POST 404s otherwise).
  const grades =
    gradesState.status === 'success'
      ? gradesState.data
          .filter((g) => g.status === 'ACTIVE' && g.sectionCount > 0)
          .map((g) => g.grade)
          .sort((a, b) => a - b)
      : [];

  const datasets = state.status === 'success' ? state.data : [];
  const assigned = datasets.filter((d) => !d.owned);
  const ownBanks = datasets.filter((d) => d.owned);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolDataset | null>(null);
  const [form, setForm] = useState<BankFormState>(EMPTY_FORM);
  const [formBusy, setFormBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SchoolDataset | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Subjects are per grade - only load the ones enabled for the picked Class.
  const subjectsState = useAsyncData(
    formOpen && !editing && form.grade ? `subjects-grade:${form.grade}` : null,
    () => listSubjects(Number(form.grade)),
  );
  const subjects = subjectsState.status === 'success' ? subjectsState.data : [];

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openRename(bank: SchoolDataset) {
    setEditing(bank);
    setForm({ ...EMPTY_FORM, name: bank.name, description: bank.description ?? '' });
    setFormOpen(true);
  }

  async function handleFormSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormBusy(true);
    try {
      if (editing) {
        await updateDataset(editing.id, { name: form.name.trim(), description: form.description.trim() });
        show('Question bank updated.', 'success');
      } else {
        await createDataset({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          subjectId: form.subjectId,
          grade: Number(form.grade),
        });
        show('Question bank created.', 'success');
      }
      setFormOpen(false);
      if (state.status === 'success') state.refetch();
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setFormBusy(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteDataset(deleteTarget.id);
      show('Question bank deleted.', 'success');
      setDeleteTarget(null);
      if (state.status === 'success') state.refetch();
    } catch (cause) {
      // 409 carries a readable reason (e.g. used by homework/a question paper).
      show(normalizeError(cause).message, 'error');
      setDeleteTarget(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  const nameColumn: GridColDef<SchoolDataset> = {
    field: 'name', headerName: 'Name', flex: 1, minWidth: 200,
    renderCell: (params) => (
      <span>
        {params.row.name}
        {isInactive(params.row) ? (
          <span className="tag red" style={{ marginLeft: 8 }}>
            Inactive - subject disabled by your platform admin
          </span>
        ) : null}
      </span>
    ),
  };
  const subjectColumns: GridColDef<SchoolDataset>[] = [
    {
      field: 'subjectName',
      headerName: 'Subject',
      width: 160,
      valueGetter: (_value, row) => row.subjectName ?? '—',
    },
    {
      field: 'grade',
      headerName: 'Class',
      width: 110,
      valueGetter: (_value, row) => (row.grade !== null ? `Class ${row.grade}` : '—'),
    },
  ];

  const assignedColumns: GridColDef<SchoolDataset>[] = [
    nameColumn,
    ...subjectColumns,
    { field: 'questionCount', headerName: 'Questions', width: 120 },
    { field: 'description', headerName: 'Description', flex: 2, minWidth: 280 },
    {
      field: 'actions',
      headerName: '',
      width: 160,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params) => (
        <Link href={`/datasets/${params.row.id}`} className="btn white sm">
          View questions
        </Link>
      ),
    },
  ];

  const ownBankColumns: GridColDef<SchoolDataset>[] = [
    nameColumn,
    ...subjectColumns,
    { field: 'questionCount', headerName: 'Questions', width: 110 },
    {
      field: 'actions',
      headerName: '',
      width: 240,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params) => (
        <div className="table-actions">
          <Link href={`/datasets/${params.row.id}`} className="btn white sm">
            Open
          </Link>
          {/* Writes to a bank whose subject is disabled are refused (409) - read-only until re-enabled. */}
          <button
            type="button"
            className="btn white sm"
            disabled={isInactive(params.row)}
            onClick={() => openRename(params.row)}
          >
            Rename
          </button>
          <button
            type="button"
            className="btn white sm"
            disabled={isInactive(params.row)}
            onClick={() => setDeleteTarget(params.row)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Datasets</h1>
          <button type="button" className="btn yellow" onClick={openCreate}>
            + New question bank
          </button>
        </div>
        <p className="lead">
          Question datasets your teachers can use - the ones Nool assigns to your school, plus the question
          banks you build yourself for a subject and class.
        </p>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading datasets" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' ? (
        <>
          <div className="section-head" style={{ marginBottom: 12 }}>
            <h3>Assigned by Nool</h3>
          </div>
          <p className="lead" style={{ marginBottom: 16 }}>
            The platform team assigns these to your school - they&apos;re read-only here. Need one that isn&apos;t
            listed? Ask your platform admin.
          </p>
          {assigned.length === 0 ? (
            <p style={{ color: 'var(--color-muted)' }}>No datasets assigned to your school yet.</p>
          ) : (
            <DataTable rows={assigned} columns={assignedColumns} />
          )}

          <div className="section-head" style={{ marginTop: 'var(--space-8)', marginBottom: 12 }}>
            <h3>Your question banks</h3>
          </div>
          <p className="lead" style={{ marginBottom: 16 }}>
            Banks you own, one per subject and class - visible only to your school. Open one to add, edit or
            bulk import its questions.
          </p>
          {ownBanks.length === 0 ? (
            <EmptyState
              title="No question banks yet"
              message="Create a bank for a subject and class, then add questions to it one by one or in bulk."
              actionLabel="New question bank"
              onAction={openCreate}
            />
          ) : (
            <DataTable rows={ownBanks} columns={ownBankColumns} />
          )}
        </>
      ) : null}

      <Modal
        open={formOpen}
        title={editing ? 'Rename question bank' : 'New question bank'}
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-row">
            <label htmlFor="bank-name">Name</label>
            <input
              id="bank-name"
              className="field"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="bank-description">Description (optional)</label>
            <textarea
              id="bank-description"
              className="field"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          {!editing ? (
            <div className="form-row-inline">
              <div className="form-row">
                <label htmlFor="bank-grade">Class</label>
                <select
                  id="bank-grade"
                  className="field"
                  value={form.grade}
                  onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value, subjectId: '' }))}
                  required
                  disabled={grades.length === 0}
                >
                  <option value="" disabled>
                    {grades.length === 0 ? 'No classes with sections yet' : 'Select a class'}
                  </option>
                  {grades.map((grade) => (
                    <option key={grade} value={grade}>
                      Class {grade}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="bank-subject">Subject</label>
                <select
                  id="bank-subject"
                  className="field"
                  value={form.subjectId}
                  onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
                  required
                  disabled={!form.grade || subjects.length === 0}
                >
                  <option value="" disabled>
                    {!form.grade
                      ? 'Pick a class first'
                      : subjectsState.status === 'loading'
                        ? 'Loading subjects…'
                        : subjects.length === 0
                          ? 'No subjects assigned to this class'
                          : 'Select a subject'}
                  </option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {subjectLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
          {!editing && subjectsState.status === 'error' ? (
            <p style={{ color: 'var(--color-red)' }}>{subjectsState.error.message}</p>
          ) : null}
          <div className="modal-actions">
            <button type="button" className="btn white" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn dark" disabled={formBusy}>
              {formBusy ? 'Saving…' : editing ? 'Save changes' : 'Create bank'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this question bank?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" and all ${deleteTarget.questionCount} of its questions will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
