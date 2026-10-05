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
import { ErrorState, LoadingState } from '@/components/states';
import { Modal } from '@/components/Modal';
import { SelectionBar } from '@/components/SelectionBar';
import { useToast } from '@/components/Toast';
import {
  bulkInviteTeachers,
  deleteTeacher,
  exportTeachers,
  inviteTeacher,
  listTeachers,
  resetTeacherPassword,
  sendTeacherCredentialsEmail,
  updateTeacher,
  updateTeacherStatus,
} from '@/lib/api';
import { runBulk } from '@/lib/bulk';
import { normalizeError } from '@/lib/errors';
import { useAsyncData } from '@/lib/useAsyncData';
import type { SchoolTeacher, UserStatus } from '@/lib/types';

function statusTagVariant(status: UserStatus): string {
  if (status === 'ACTIVE') return 'green';
  if (status === 'PENDING') return 'yellow';
  return 'red';
}

interface InvitedTeacher {
  id: string;
  displayName: string;
  email: string;
  tempPassword: string;
}

export default function TeachersPage() {
  const state = useAsyncData('teachers', () => listTeachers());
  const { show } = useToast();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [invited, setInvited] = useState<InvitedTeacher | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [editTarget, setEditTarget] = useState<SchoolTeacher | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<SchoolTeacher | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetResult, setResetResult] = useState<InvitedTeacher | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SchoolTeacher | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [selection, setSelection] = useState<GridRowSelectionModel>(EMPTY_SELECTION);

  const teachers = state.status === 'success' ? state.data : [];
  const selectedIds = selectedIdsFrom(selection, teachers, (t) => t.id);

  function resetInviteForm() {
    setEmail('');
    setDisplayName('');
    setPhoneNumber('');
    setEmployeeId('');
  }

  function closeInviteModal() {
    setInviteOpen(false);
    setInvited(null);
    resetInviteForm();
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await inviteTeacher({
        email,
        displayName,
        phoneNumber: phoneNumber || undefined,
        employeeId: employeeId || undefined,
      });
      setInvited({ id: result.id, displayName, email, tempPassword: result.tempPassword });
      if (state.status === 'success') state.refetch();
    } catch (cause) {
      setFormError(normalizeError(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(teacherId: string, current: UserStatus) {
    setBusyId(teacherId);
    try {
      const next: UserStatus = current === 'DEACTIVATED' ? 'ACTIVE' : 'DEACTIVATED';
      await updateTeacherStatus(teacherId, next);
      if (state.status === 'success') state.refetch();
      show(next === 'ACTIVE' ? 'Teacher reactivated.' : 'Teacher deactivated.', 'success');
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(teacher: SchoolTeacher) {
    setEditTarget(teacher);
    setEditDisplayName(teacher.displayName);
    setEditPhoneNumber(teacher.phoneNumber ?? '');
    setEditEmployeeId(teacher.employeeId ?? '');
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
      await updateTeacher(editTarget.id, {
        displayName: editDisplayName,
        phoneNumber: editPhoneNumber || undefined,
        employeeId: editEmployeeId || undefined,
      });
      if (state.status === 'success') state.refetch();
      show('Teacher details updated.', 'success');
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
      const result = await resetTeacherPassword(resetTarget.id);
      setResetResult({
        id: resetTarget.id,
        displayName: resetTarget.displayName,
        email: resetTarget.email,
        tempPassword: result.tempPassword,
      });
      setResetTarget(null);
      if (state.status === 'success') state.refetch();
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
      await exportTeachers();
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteTeacher(deleteTarget.id);
      show(`${deleteTarget.displayName} deleted.`, 'success');
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
    const { failedIds, summary } = await runBulk(selectedIds, (id) => deleteTeacher(id), {
      noun: 'teacher',
      verb: 'deleted',
      label: (id) => teachers.find((t) => t.id === id)?.displayName ?? id,
    });
    show(summary, failedIds.length > 0 ? 'error' : 'success');
    // Keep only the rows that failed selected, so the admin can retry them.
    setSelection({ type: 'include', ids: new Set(failedIds) });
    setBulkDeleteOpen(false);
    if (state.status === 'success') state.refetch();
    setBulkBusy(false);
  }

  async function handleBulkStatus(next: UserStatus) {
    setBulkBusy(true);
    const { failedIds, summary } = await runBulk(selectedIds, (id) => updateTeacherStatus(id, next), {
      noun: 'teacher',
      verb: 'updated',
      label: (id) => teachers.find((t) => t.id === id)?.displayName ?? id,
    });
    show(summary, failedIds.length > 0 ? 'error' : 'success');
    // Keep only the rows that failed selected, so the admin can retry them.
    setSelection({ type: 'include', ids: new Set(failedIds) });
    setBulkDeactivateOpen(false);
    if (state.status === 'success') state.refetch();
    setBulkBusy(false);
  }

  const columns: GridColDef<SchoolTeacher>[] = [
    {
      field: 'displayName',
      headerName: 'Name',
      flex: 1,
      minWidth: 160,
      renderCell: (params) => (
        <Link href={`/teachers/${params.row.id}`} className="table-link">
          {params.row.displayName}
        </Link>
      ),
    },
    { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 200 },
    {
      field: 'employeeId',
      headerName: 'Employee ID',
      width: 130,
      valueGetter: (_value, row) => row.employeeId ?? '—',
    },
    {
      field: 'classIds',
      headerName: 'Classes',
      width: 90,
      valueGetter: (_value, row) => row.classIds.length,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => <span className={`tag ${statusTagVariant(params.row.status)}`}>{params.row.status}</span>,
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
            <IconButton
              size="small"
              disabled={busyId === params.row.id}
              onClick={() => handleToggleStatus(params.row.id, params.row.status)}
            >
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
          <h1>Teachers</h1>
          <div className="page-head-actions">
            <button type="button" className="btn white" disabled={exporting} onClick={() => void handleExport()}>
              <DownloadIcon /> {exporting ? 'Exporting…' : 'Export roster'}
            </button>
            <button type="button" className="btn white" onClick={() => setBulkOpen(true)}>
              <UploadIcon /> Bulk upload
            </button>
            <button type="button" className="btn yellow" onClick={() => setInviteOpen(true)}>
              <PlusIcon /> Invite teacher
            </button>
          </div>
        </div>
        <p className="lead">Invite teachers and manage their access to this school.</p>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading teachers" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' ? (
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
            rows={teachers}
            columns={columns}
            checkboxSelection
            selectionModel={selection}
            onSelectionModelChange={setSelection}
          />
        </>
      ) : null}

      <Modal open={inviteOpen} title={invited ? 'Teacher invited' : 'Invite teacher'} onClose={closeInviteModal}>
        {invited ? (
          <>
            <CredentialReveal
              displayName={invited.displayName}
              email={invited.email}
              tempPassword={invited.tempPassword}
              onSendEmail={(input) => sendTeacherCredentialsEmail(invited.id, input)}
            />
            <div className="modal-actions">
              <button type="button" className="btn dark" onClick={closeInviteModal}>
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleInvite}>
            <div className="form-row">
              <label htmlFor="teacher-name">Name</label>
              <input
                id="teacher-name"
                className="field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="teacher-email">Email</label>
              <input
                id="teacher-email"
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-row-inline">
              <div className="form-row">
                <label htmlFor="teacher-phone">Phone (optional)</label>
                <input
                  id="teacher-phone"
                  className="field"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <div className="form-row">
                <label htmlFor="teacher-employee-id">Employee ID (optional)</label>
                <input
                  id="teacher-employee-id"
                  className="field"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                />
              </div>
            </div>
            {formError ? <p style={{ color: 'var(--color-red)' }}>{formError}</p> : null}
            <div className="modal-actions">
              <button type="button" className="btn white" onClick={closeInviteModal}>
                Cancel
              </button>
              <button type="submit" className="btn yellow" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={editTarget !== null} title="Edit teacher" onClose={closeEdit}>
        <form onSubmit={handleEditSubmit}>
          <div className="form-row">
            <label htmlFor="edit-teacher-name">Name</label>
            <input
              id="edit-teacher-name"
              className="field"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="form-row-inline">
            <div className="form-row">
              <label htmlFor="edit-teacher-phone">Phone (optional)</label>
              <input
                id="edit-teacher-phone"
                className="field"
                value={editPhoneNumber}
                onChange={(e) => setEditPhoneNumber(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label htmlFor="edit-teacher-employee-id">Employee ID (optional)</label>
              <input
                id="edit-teacher-employee-id"
                className="field"
                value={editEmployeeId}
                onChange={(e) => setEditEmployeeId(e.target.value)}
              />
            </div>
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
            onSendEmail={(input) => sendTeacherCredentialsEmail(resetResult.id, input)}
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
        title="Delete teacher?"
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
        title={`Delete ${selectedIds.length} teacher${selectedIds.length === 1 ? '' : 's'}?`}
        message="This permanently deletes every selected teacher's account. This can't be undone."
        confirmLabel="Delete permanently"
        danger
        busy={bulkBusy}
        onConfirm={() => void handleBulkDelete()}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      <ConfirmDialog
        open={bulkDeactivateOpen}
        title={`Deactivate ${selectedIds.length} teacher${selectedIds.length === 1 ? '' : 's'}?`}
        message="This immediately revokes access for every selected teacher. You can reactivate them any time."
        confirmLabel="Deactivate"
        danger
        busy={bulkBusy}
        onConfirm={() => void handleBulkStatus('DEACTIVATED')}
        onCancel={() => setBulkDeactivateOpen(false)}
      />

      <BulkUploadModal
        open={bulkOpen}
        title="Bulk-upload teachers"
        templateFilename="teachers-template.csv"
        templateHeaders={['displayName', 'email', 'phoneNumber', 'employeeId']}
        onUpload={bulkInviteTeachers}
        onClose={() => setBulkOpen(false)}
        onImported={() => {
          if (state.status === 'success') state.refetch();
        }}
      />
    </div>
  );
}
