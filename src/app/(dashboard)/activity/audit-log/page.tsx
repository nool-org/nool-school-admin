'use client';

import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { listSchoolAuditLog } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import { useUrlPaginationModel } from '@/lib/useUrlState';
import type { SchoolAuditLogEntry } from '@/lib/types';

const PAGE_SIZE = 20;

function actionLabel(action: string): string {
  return action.replace(/\./g, ' · ').replace(/_/g, ' ');
}

const columns: GridColDef<SchoolAuditLogEntry>[] = [
  { field: 'actorName', headerName: 'Actor', flex: 1, minWidth: 160 },
  {
    field: 'action',
    headerName: 'Action',
    flex: 1,
    minWidth: 200,
    valueGetter: (_value, row) => actionLabel(row.action),
  },
  {
    field: 'targetType',
    headerName: 'Target',
    flex: 1,
    minWidth: 180,
    valueGetter: (_value, row) => `${row.targetType} · ${row.targetId.slice(0, 8)}`,
  },
  {
    field: 'detail',
    headerName: 'Detail',
    flex: 1.3,
    minWidth: 220,
    valueGetter: (_value, row) => row.detail ?? '—',
  },
  {
    field: 'createdAt',
    headerName: 'When',
    width: 190,
    valueGetter: (_value, row) => new Date(row.createdAt).toLocaleString(),
  },
];

export default function SchoolAuditLogPage() {
  const [paginationModel, setPaginationModel] = useUrlPaginationModel(PAGE_SIZE);
  const state = useAsyncData(
    `audit-log:${paginationModel.page}:${paginationModel.pageSize}`,
    () => listSchoolAuditLog({ limit: paginationModel.pageSize, offset: paginationModel.page * paginationModel.pageSize }),
  );

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Activity log</h1>
        </div>
        <p className="lead">Every change made by your school&apos;s own admin accounts.</p>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading activity" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' && state.data.items.length === 0 ? (
        <EmptyState title="No activity yet" message="Actions taken in this console will show up here." />
      ) : null}

      {state.status === 'success' && state.data.items.length > 0 ? (
        <DataTable
          rows={state.data.items}
          columns={columns}
          server
          rowCount={state.data.total}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
        />
      ) : null}
    </div>
  );
}
