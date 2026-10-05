'use client';

import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { getCurriculum } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import type { SubjectToggle } from '@/lib/types';

const columns: GridColDef<SubjectToggle>[] = [
  { field: 'name', headerName: 'Subject', flex: 1, minWidth: 220 },
  {
    field: 'grade',
    headerName: 'Grade',
    width: 120,
    valueGetter: (_value, row) => (row.grade == null ? '—' : `Grade ${row.grade}`),
  },
];

/**
 * Read-only - assigning subjects to a school is exclusively Super Admin's
 * job now (their global catalog page, or the per-Class Subjects toggle on
 * a school's own Classes page). This page used to let School Admin toggle
 * subjects on/off directly; that write path was removed on the backend
 * too (see nool-core's school_admin.py - PUT /curriculum no longer
 * exists), not just hidden here.
 */
export default function CurriculumPage() {
  const state = useAsyncData('curriculum', () => getCurriculum());
  const subjects = state.status === 'success' ? state.data.subjects.filter((s) => s.enabled) : [];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Subjects</h1>
        </div>
        <p className="lead">
          The subjects Nool has assigned to this school, per grade - this scopes what teachers see in
          their own curriculum pickers. View only: your platform admin manages them - if one you need
          isn&apos;t listed, ask them.
        </p>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading curriculum" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' && subjects.length === 0 ? (
        <EmptyState title="No subjects assigned yet" message="Ask your platform admin to assign this school its subjects." />
      ) : null}
      {state.status === 'success' && subjects.length > 0 ? <DataTable rows={subjects} columns={columns} /> : null}
    </div>
  );
}
