'use client';

import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';

import { AssignClassModal } from '@/components/AssignClassModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable, EMPTY_SELECTION, selectedIdsFrom } from '@/components/DataTable';
import { BanIcon, CheckCircleIcon, EditIcon, PlusIcon, TrashIcon, UsersIcon } from '@/components/Icon';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Modal } from '@/components/Modal';
import { SearchableSelect } from '@/components/SearchableSelect';
import { SelectionBar } from '@/components/SelectionBar';
import { useToast } from '@/components/Toast';
import {
  createClass,
  deleteClass,
  listClasses,
  listGrades,
  listTeachers,
  updateClass,
  updateClassAssignments,
  updateClassStatus,
} from '@/lib/api';
import { runBulk } from '@/lib/bulk';
import { normalizeError } from '@/lib/errors';
import { useAsyncData } from '@/lib/useAsyncData';
import type { ClassAssignment, SchoolAdminClass } from '@/lib/types';
import { statusLabel } from '@/lib/statusLabel';

export default function ClassesPage() {
  const state = useAsyncData('classes', () => listClasses());
  const teachersState = useAsyncData('teachers', () => listTeachers());
  const gradesState = useAsyncData('grades-for-sections', () => listGrades());
  const { show } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<SchoolAdminClass | null>(null);
  const [editGrade, setEditGrade] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [assigning, setAssigning] = useState<SchoolAdminClass | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SchoolAdminClass | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selection, setSelection] = useState<GridRowSelectionModel>(EMPTY_SELECTION);

  const classes = state.status === 'success' ? state.data : [];
  const selectedIds = selectedIdsFrom(selection, classes, (c) => c.id);
  // Only grades your platform admin has actually allocated to this school
  // (an active SchoolGrade row) are selectable for a new/edited Section -
  // previously this was a free-typed 1-12 number, letting a section get
  // created under a Class that was never set up for this school at all.
  const allocatedGrades = gradesState.status === 'success' ? gradesState.data.filter((g) => g.status === 'ACTIVE') : [];

  function validGrade(value: string): number | null {
    const n = Number(value);
    if (!Number.isInteger(n) || !allocatedGrades.some((g) => g.grade === n)) return null;
    return n;
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const gradeNum = validGrade(grade);
    if (gradeNum === null) {
      setFormError('Select a Class that has been allocated to this school.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createClass({ grade: gradeNum, section });
      setCreateOpen(false);
      setGrade('');
      setSection('');
      if (state.status === 'success') state.refetch();
    } catch (cause) {
      setFormError(normalizeError(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(schoolClass: SchoolAdminClass) {
    setEditTarget(schoolClass);
    setEditGrade(String(schoolClass.grade));
    setEditSection(schoolClass.section);
    setEditError(null);
  }

  async function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editTarget) return;
    const gradeNum = validGrade(editGrade);
    if (gradeNum === null) {
      setEditError('Select a Class that has been allocated to this school.');
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateClass(editTarget.id, { grade: gradeNum, section: editSection });
      if (state.status === 'success') state.refetch();
      show('Section updated.', 'success');
      setEditTarget(null);
    } catch (cause) {
      setEditError(normalizeError(cause).message);
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleSaveAssignments(classId: string, assignments: ClassAssignment[]) {
    await updateClassAssignments(classId, assignments);
    if (state.status === 'success') state.refetch();
    show('Assignments updated.', 'success');
  }

  async function handleToggleStatus(schoolClass: SchoolAdminClass) {
    setBusyId(schoolClass.id);
    try {
      const next = schoolClass.status === 'DEACTIVATED' ? 'ACTIVE' : 'DEACTIVATED';
      await updateClassStatus(schoolClass.id, next);
      if (state.status === 'success') state.refetch();
      show(next === 'ACTIVE' ? 'Section reactivated.' : 'Section deactivated.', 'success');
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteClass(deleteTarget.id);
      show(`Class ${deleteTarget.grade} · ${deleteTarget.section} deleted.`, 'success');
      setDeleteTarget(null);
      if (state.status === 'success') state.refetch();
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleBulkDelete() {
    setBulkBusy(true);
    const { failedIds, summary } = await runBulk(selectedIds, (id) => deleteClass(id), {
      noun: 'section',
      verb: 'deleted',
      label: (id) => {
        const c = classes.find((x) => x.id === id);
        return c ? `Class ${c.grade} · ${c.section}` : id;
      },
    });
    show(summary, failedIds.length > 0 ? 'error' : 'success');
    // Keep only the rows that failed selected, so the admin can retry them.
    setSelection({ type: 'include', ids: new Set(failedIds) });
    setBulkDeleteOpen(false);
    if (state.status === 'success') state.refetch();
    setBulkBusy(false);
  }

  async function handleBulkStatus(next: 'ACTIVE' | 'DEACTIVATED') {
    setBulkBusy(true);
    const { failedIds, summary } = await runBulk(selectedIds, (id) => updateClassStatus(id, next), {
      noun: 'section',
      verb: 'updated',
      label: (id) => {
        const c = classes.find((x) => x.id === id);
        return c ? `Class ${c.grade} · ${c.section}` : id;
      },
    });
    show(summary, failedIds.length > 0 ? 'error' : 'success');
    // Keep only the rows that failed selected, so the admin can retry them.
    setSelection({ type: 'include', ids: new Set(failedIds) });
    setBulkDeactivateOpen(false);
    if (state.status === 'success') state.refetch();
    setBulkBusy(false);
  }

  const columns: GridColDef<SchoolAdminClass>[] = [
    {
      field: 'grade',
      headerName: 'Section',
      width: 160,
      valueGetter: (_value, row) => `Class ${row.grade} · ${row.section}`,
    },
    { field: 'studentCount', headerName: 'Students', width: 110 },
    {
      field: 'assignments',
      headerName: 'Assignments',
      flex: 1,
      minWidth: 180,
      valueGetter: (_value, row) =>
        row.assignments.length === 0
          ? 'None'
          : `${row.assignments.length} subject${row.assignments.length === 1 ? '' : 's'} assigned`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <span className={`tag ${params.row.status === 'DEACTIVATED' ? 'red' : 'green'}`}>{statusLabel(params.row.status)}</span>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 180,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params) => (
        <div style={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Assign teachers/subjects">
            <IconButton size="small" onClick={() => setAssigning(params.row)}>
              <UsersIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.status === 'DEACTIVATED' ? 'Activate' : 'Deactivate'}>
            <IconButton size="small" disabled={busyId === params.row.id} onClick={() => handleToggleStatus(params.row)}>
              {params.row.status === 'DEACTIVATED' ? <CheckCircleIcon /> : <BanIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => setDeleteTarget(params.row)} sx={{ color: 'var(--color-red)' }}>
              <TrashIcon />
            </IconButton>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Sections</h1>
          <button type="button" className="btn yellow" onClick={() => setCreateOpen(true)}>
            <PlusIcon /> Add section
          </button>
        </div>
        <p className="lead">
          Add sections within each Class (grade 1–12) and see teacher/subject assignments at a glance.
        </p>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading sections" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' && classes.length === 0 ? (
        <EmptyState
          title="No sections yet"
          message="Add your first section to start building the roster."
          actionLabel="Add section"
          onAction={() => setCreateOpen(true)}
        />
      ) : null}

      {state.status === 'success' && classes.length > 0 ? (
        <>
          <SelectionBar count={selectedIds.length}>
            <button type="button" className="btn white sm" disabled={bulkBusy} onClick={() => void handleBulkStatus('ACTIVE')}>
              <CheckCircleIcon /> Activate
            </button>
            <button type="button" className="btn white sm" disabled={bulkBusy} onClick={() => setBulkDeactivateOpen(true)}>
              <BanIcon /> Deactivate
            </button>
            <button type="button" className="btn danger sm" disabled={bulkBusy} onClick={() => setBulkDeleteOpen(true)}>
              <TrashIcon /> Delete
            </button>
          </SelectionBar>

          <DataTable
            rows={classes}
            columns={columns}
            checkboxSelection
            selectionModel={selection}
            onSelectionModelChange={setSelection}
          />
        </>
      ) : null}

      <Modal open={createOpen} title="Add section" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreate}>
          <div className="form-row-inline">
            <div className="form-row">
              <label htmlFor="class-grade">Class</label>
              <SearchableSelect
                id="class-grade"
                value={grade}
                onChange={setGrade}
                required
                disabled={allocatedGrades.length === 0}
                placeholder={allocatedGrades.length === 0 ? 'No classes allocated yet' : 'Select a class'}
                options={allocatedGrades.map((g) => ({ value: String(g.grade), label: `Class ${g.grade}` }))}
              />
            </div>
            <div className="form-row">
              <label htmlFor="class-section">Section</label>
              <input
                id="class-section"
                className="field"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                required
              />
            </div>
          </div>
          {allocatedGrades.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', marginTop: -8, marginBottom: 16 }}>
              No classes have been allocated to this school yet - ask your platform admin to add one.
            </p>
          ) : null}
          {formError ? <p style={{ color: 'var(--color-red)' }}>{formError}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn white" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn yellow" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add section'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={editTarget !== null} title="Edit section" onClose={() => setEditTarget(null)}>
        <form onSubmit={handleEditSubmit}>
          <div className="form-row-inline">
            <div className="form-row">
              <label htmlFor="edit-class-grade">Class</label>
              <SearchableSelect
                id="edit-class-grade"
                value={editGrade}
                onChange={setEditGrade}
                required
                options={[
                  ...allocatedGrades.map((g) => ({ value: String(g.grade), label: `Class ${g.grade}` })),
                  // Preserves this section's current grade as a selectable
                  // option even if it's since been deallocated/deactivated -
                  // otherwise editing it (without touching Class at all)
                  // would silently drop it once the SearchableSelect has no
                  // matching option to show as selected.
                  ...(editGrade && !allocatedGrades.some((g) => String(g.grade) === editGrade)
                    ? [{ value: editGrade, label: `Class ${editGrade}` }]
                    : []),
                ]}
              />
            </div>
            <div className="form-row">
              <label htmlFor="edit-class-section">Section</label>
              <input
                id="edit-class-section"
                className="field"
                value={editSection}
                onChange={(e) => setEditSection(e.target.value)}
                required
              />
            </div>
          </div>
          {editError ? <p style={{ color: 'var(--color-red)' }}>{editError}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn white" onClick={() => setEditTarget(null)}>
              Cancel
            </button>
            <button type="submit" className="btn dark" disabled={editSubmitting}>
              {editSubmitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      <AssignClassModal
        open={assigning !== null}
        schoolClass={assigning}
        gradeId={
          gradesState.status === 'success' && assigning
            ? (gradesState.data.find((g) => g.grade === assigning.grade)?.id ?? null)
            : null
        }
        teachers={teachersState.status === 'success' ? teachersState.data : []}
        onSave={handleSaveAssignments}
        onClose={() => setAssigning(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete section?"
        message={
          deleteTarget
            ? `This permanently deletes Class ${deleteTarget.grade} · ${deleteTarget.section}. This can't be undone - deactivate instead if you just want to hide it temporarily.`
            : ''
        }
        confirmLabel="Delete permanently"
        danger
        busy={deleteBusy}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.length} section${selectedIds.length === 1 ? '' : 's'}?`}
        message="This permanently deletes every selected section. This can't be undone."
        confirmLabel="Delete permanently"
        danger
        busy={bulkBusy}
        onConfirm={() => void handleBulkDelete()}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      <ConfirmDialog
        open={bulkDeactivateOpen}
        title={`Deactivate ${selectedIds.length} section${selectedIds.length === 1 ? '' : 's'}?`}
        message="This hides every selected section from active use. You can reactivate them any time."
        confirmLabel="Deactivate"
        danger
        busy={bulkBusy}
        onConfirm={() => void handleBulkStatus('DEACTIVATED')}
        onCancel={() => setBulkDeactivateOpen(false)}
      />
    </div>
  );
}
