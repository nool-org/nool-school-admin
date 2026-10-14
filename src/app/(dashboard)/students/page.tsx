'use client';

import Link from 'next/link';
import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';

import { BulkUploadModal } from '@/components/BulkUploadModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CredentialReveal } from '@/components/CredentialReveal';
import { DataTable, EMPTY_SELECTION, selectedIdsFrom } from '@/components/DataTable';
import { BanIcon, CheckCircleIcon, DownloadIcon, EditIcon, KeyIcon, PlusIcon, TrashIcon, UploadIcon } from '@/components/Icon';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Modal } from '@/components/Modal';
import { SelectionBar } from '@/components/SelectionBar';
import { useToast } from '@/components/Toast';
import {
  bulkCreateStudents,
  createStudent,
  deleteStudent,
  exportStudents,
  listClasses,
  listStudents,
  resetStudentPassword,
  sendStudentCredentialsEmail,
  updateStudent,
} from '@/lib/api';
import { runBulk } from '@/lib/bulk';
import { normalizeError } from '@/lib/errors';
import { useAsyncData } from '@/lib/useAsyncData';
import { useUrlParam } from '@/lib/useUrlState';
import type { SchoolStudent, UserStatus } from '@/lib/types';
import { statusLabel } from '@/lib/statusLabel';

interface StudentCredential {
  id: string;
  displayName: string;
  email: string;
  tempPassword: string;
}

export default function StudentsPage() {
  const [classFilter, setClassFilter] = useUrlParam('classId', '');
  const classesState = useAsyncData('classes', () => listClasses());
  const studentsState = useAsyncData(`students:${classFilter}`, () => listStudents(classFilter || undefined));
  const { show } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [classId, setClassId] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<StudentCredential | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [editTarget, setEditTarget] = useState<SchoolStudent | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editGuardianName, setEditGuardianName] = useState('');
  const [editGuardianPhone, setEditGuardianPhone] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<SchoolStudent | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetResult, setResetResult] = useState<StudentCredential | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolStudent | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selection, setSelection] = useState<GridRowSelectionModel>(EMPTY_SELECTION);

  const classes = classesState.status === 'success' ? classesState.data : [];
  const students = studentsState.status === 'success' ? studentsState.data : [];
  const selectedIds = selectedIdsFrom(selection, students, (s) => s.id);

  function classLabel(id: string): string {
    const match = classes.find((c) => c.id === id);
    return match ? `Class ${match.grade} · ${match.section}` : id;
  }

  function resetCreateForm() {
    setDisplayName('');
    setEmail('');
    setClassId('');
    setRollNumber('');
    setGuardianName('');
    setGuardianPhone('');
    setDateOfBirth('');
  }

  function closeCreateModal() {
    setCreateOpen(false);
    setCreated(null);
    resetCreateForm();
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await createStudent({
        displayName,
        email,
        classId,
        rollNumber: Number(rollNumber),
        guardianName: guardianName || undefined,
        guardianPhone: guardianPhone || undefined,
        dateOfBirth: dateOfBirth || undefined,
      });
      setCreated({ id: result.id, displayName, email, tempPassword: result.tempPassword });
      if (studentsState.status === 'success') studentsState.refetch();
    } catch (cause) {
      setFormError(normalizeError(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(student: SchoolStudent) {
    setEditTarget(student);
    setEditDisplayName(student.displayName);
    setEditGuardianName(student.guardianName ?? '');
    setEditGuardianPhone(student.guardianPhone ?? '');
    setEditDateOfBirth(student.dateOfBirth ?? '');
    setEditError(null);
  }

  function closeEdit() {
    setEditTarget(null);
    setEditError(null);
  }

  async function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateStudent(editTarget.id, {
        displayName: editDisplayName,
        guardianName: editGuardianName || undefined,
        guardianPhone: editGuardianPhone || undefined,
        dateOfBirth: editDateOfBirth || undefined,
      });
      if (studentsState.status === 'success') studentsState.refetch();
      show('Student details updated.', 'success');
      closeEdit();
    } catch (cause) {
      setEditError(normalizeError(cause).message);
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleResetConfirm() {
    if (!resetTarget) return;
    setResetBusy(true);
    try {
      const result = await resetStudentPassword(resetTarget.id);
      setResetResult({
        id: resetTarget.id,
        displayName: resetTarget.displayName,
        email: resetTarget.email,
        tempPassword: result.tempPassword,
      });
      setResetTarget(null);
      if (studentsState.status === 'success') studentsState.refetch();
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
      setResetTarget(null);
    } finally {
      setResetBusy(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportStudents();
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleToggleStatus(student: SchoolStudent) {
    setBusyId(student.id);
    try {
      const next: UserStatus = student.status === 'DEACTIVATED' ? 'ACTIVE' : 'DEACTIVATED';
      await updateStudent(student.id, { status: next });
      if (studentsState.status === 'success') studentsState.refetch();
      show(next === 'ACTIVE' ? 'Student reactivated.' : 'Student deactivated.', 'success');
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
      await deleteStudent(deleteTarget.id);
      show(`${deleteTarget.displayName} deleted.`, 'success');
      setDeleteTarget(null);
      if (studentsState.status === 'success') studentsState.refetch();
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleBulkDelete() {
    setBulkBusy(true);
    const { failedIds, summary } = await runBulk(selectedIds, (id) => deleteStudent(id), {
      noun: 'student',
      verb: 'deleted',
      label: (id) => students.find((s) => s.id === id)?.displayName ?? id,
    });
    show(summary, failedIds.length > 0 ? 'error' : 'success');
    // Keep only the rows that failed selected, so the admin can retry them.
    setSelection({ type: 'include', ids: new Set(failedIds) });
    setBulkDeleteOpen(false);
    if (studentsState.status === 'success') studentsState.refetch();
    setBulkBusy(false);
  }

  async function handleBulkStatus(next: UserStatus) {
    setBulkBusy(true);
    const { failedIds, summary } = await runBulk(selectedIds, (id) => updateStudent(id, { status: next }), {
      noun: 'student',
      verb: 'updated',
      label: (id) => students.find((s) => s.id === id)?.displayName ?? id,
    });
    show(summary, failedIds.length > 0 ? 'error' : 'success');
    // Keep only the rows that failed selected, so the admin can retry them.
    setSelection({ type: 'include', ids: new Set(failedIds) });
    setBulkDeactivateOpen(false);
    if (studentsState.status === 'success') studentsState.refetch();
    setBulkBusy(false);
  }

  const columns: GridColDef<SchoolStudent>[] = [
    {
      field: 'displayName',
      headerName: 'Name',
      flex: 1,
      minWidth: 160,
      renderCell: (params) => (
        <Link href={`/students/${params.row.id}`} className="table-link">
          {params.row.displayName}
        </Link>
      ),
    },
    { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 200 },
    {
      field: 'classId',
      headerName: 'Class',
      width: 130,
      valueGetter: (_value, row) => classLabel(row.classId),
    },
    { field: 'rollNumber', headerName: 'Roll #', width: 80 },
    {
      field: 'guardianName',
      headerName: 'Guardian',
      width: 140,
      valueGetter: (_value, row) => row.guardianName ?? '—',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <span className={`tag ${params.row.status === 'ACTIVE' ? 'green' : 'red'}`}>{statusLabel(params.row.status)}</span>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 160,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params) => (
        <div style={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset password">
            <IconButton size="small" onClick={() => setResetTarget(params.row)}>
              <KeyIcon />
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
          <h1>Students</h1>
          <div className="page-head-actions">
            <button type="button" className="btn white" disabled={exporting} onClick={() => void handleExport()}>
              <DownloadIcon /> {exporting ? 'Exporting…' : 'Export roster'}
            </button>
            <button type="button" className="btn white" onClick={() => setBulkOpen(true)}>
              <UploadIcon /> Bulk upload
            </button>
            <button type="button" className="btn yellow" onClick={() => setCreateOpen(true)}>
              <PlusIcon /> Add student
            </button>
          </div>
        </div>
        <p className="lead">Add students and manage their class assignment.</p>
      </div>

      <div className="table-toolbar">
        <select className="field" style={{ maxWidth: 220 }} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              Class {c.grade} · {c.section}
            </option>
          ))}
        </select>
      </div>

      {studentsState.status === 'loading' ? <LoadingState label="Loading students" /> : null}
      {studentsState.status === 'error' ? <ErrorState error={studentsState.error} onRetry={studentsState.retry} /> : null}

      {studentsState.status === 'success' && students.length === 0 ? (
        <EmptyState
          title="No students yet"
          message="Add your first student to get started."
          actionLabel="Add student"
          onAction={() => setCreateOpen(true)}
        />
      ) : null}

      {studentsState.status === 'success' && students.length > 0 ? (
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
            rows={students}
            columns={columns}
            checkboxSelection
            selectionModel={selection}
            onSelectionModelChange={setSelection}
          />
        </>
      ) : null}

      <Modal open={createOpen} title={created ? 'Student added' : 'Add student'} onClose={closeCreateModal}>
        {created ? (
          <>
            <CredentialReveal
              displayName={created.displayName}
              email={created.email}
              tempPassword={created.tempPassword}
              onSendEmail={(input) => sendStudentCredentialsEmail(created.id, input)}
            />
            <div className="modal-actions">
              <button type="button" className="btn dark" onClick={closeCreateModal}>
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <label htmlFor="student-name">Name</label>
              <input
                id="student-name"
                className="field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="student-email">Email</label>
              <input
                id="student-email"
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-row-inline">
              <div className="form-row">
                <label htmlFor="student-class">Class</label>
                <select
                  id="student-class"
                  className="field"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a class
                  </option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Class {c.grade} · {c.section}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="student-roll">Roll number</label>
                <input
                  id="student-roll"
                  type="number"
                  className="field"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-row-inline">
              <div className="form-row">
                <label htmlFor="student-guardian-name">Guardian name (optional)</label>
                <input
                  id="student-guardian-name"
                  className="field"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                />
              </div>
              <div className="form-row">
                <label htmlFor="student-guardian-phone">Guardian phone (optional)</label>
                <input
                  id="student-guardian-phone"
                  className="field"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <label htmlFor="student-dob">Date of birth (optional)</label>
              <input
                id="student-dob"
                type="date"
                className="field"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
            {formError ? <p style={{ color: 'var(--color-red)' }}>{formError}</p> : null}
            <div className="modal-actions">
              <button type="button" className="btn white" onClick={closeCreateModal}>
                Cancel
              </button>
              <button type="submit" className="btn yellow" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add student'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={editTarget !== null} title="Edit student" onClose={closeEdit}>
        <form onSubmit={handleEditSubmit}>
          <div className="form-row">
            <label htmlFor="edit-student-name">Name</label>
            <input
              id="edit-student-name"
              className="field"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="form-row-inline">
            <div className="form-row">
              <label htmlFor="edit-student-guardian-name">Guardian name (optional)</label>
              <input
                id="edit-student-guardian-name"
                className="field"
                value={editGuardianName}
                onChange={(e) => setEditGuardianName(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label htmlFor="edit-student-guardian-phone">Guardian phone (optional)</label>
              <input
                id="edit-student-guardian-phone"
                className="field"
                value={editGuardianPhone}
                onChange={(e) => setEditGuardianPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <label htmlFor="edit-student-dob">Date of birth (optional)</label>
            <input
              id="edit-student-dob"
              type="date"
              className="field"
              value={editDateOfBirth}
              onChange={(e) => setEditDateOfBirth(e.target.value)}
            />
          </div>
          {editError ? <p style={{ color: 'var(--color-red)' }}>{editError}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn white" onClick={closeEdit}>
              Cancel
            </button>
            <button type="submit" className="btn dark" disabled={editSubmitting}>
              {editSubmitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={resetTarget !== null}
        title="Reset password?"
        message={
          resetTarget
            ? `This immediately invalidates ${resetTarget.displayName}'s current password and issues a new temporary one. They'll need to set their own password again the next time they sign in.`
            : ''
        }
        confirmLabel="Reset password"
        danger
        busy={resetBusy}
        onConfirm={() => void handleResetConfirm()}
        onCancel={() => setResetTarget(null)}
      />

      <Modal open={resetResult !== null} title="Password reset" onClose={() => setResetResult(null)}>
        {resetResult ? (
          <CredentialReveal
            displayName={resetResult.displayName}
            email={resetResult.email}
            tempPassword={resetResult.tempPassword}
            onSendEmail={(input) => sendStudentCredentialsEmail(resetResult.id, input)}
          />
        ) : null}
        {resetResult ? (
          <div className="modal-actions">
            <button type="button" className="btn dark" onClick={() => setResetResult(null)}>
              Done
            </button>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete student?"
        message={
          deleteTarget
            ? `This permanently deletes ${deleteTarget.displayName}'s account. This can't be undone - deactivate instead if you just want to revoke access.`
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
        title={`Delete ${selectedIds.length} student${selectedIds.length === 1 ? '' : 's'}?`}
        message="This permanently deletes every selected student's account. This can't be undone."
        confirmLabel="Delete permanently"
        danger
        busy={bulkBusy}
        onConfirm={() => void handleBulkDelete()}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      <ConfirmDialog
        open={bulkDeactivateOpen}
        title={`Deactivate ${selectedIds.length} student${selectedIds.length === 1 ? '' : 's'}?`}
        message="This immediately revokes access for every selected student. You can reactivate them any time."
        confirmLabel="Deactivate"
        danger
        busy={bulkBusy}
        onConfirm={() => void handleBulkStatus('DEACTIVATED')}
        onCancel={() => setBulkDeactivateOpen(false)}
      />

      <BulkUploadModal
        open={bulkOpen}
        title="Bulk-upload students"
        templateFilename="students-template.csv"
        templateHeaders={[
          'displayName',
          'email',
          'classGrade',
          'classSection',
          'rollNumber',
          'guardianName',
          'guardianPhone',
          'dateOfBirth',
        ]}
        onUpload={bulkCreateStudents}
        onClose={() => setBulkOpen(false)}
        onImported={() => {
          if (studentsState.status === 'success') studentsState.refetch();
        }}
      />
    </div>
  );
}
