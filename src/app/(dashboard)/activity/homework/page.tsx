'use client';

import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { listClasses, listSchoolHomework } from '@/lib/api';
import { SearchBox } from '@/components/SearchBox';
import { statusLabel } from '@/lib/statusLabel';
import { useAsyncData } from '@/lib/useAsyncData';
import { useUrlPaginationModel, useUrlParam } from '@/lib/useUrlState';
import type { HomeworkStatus, SchoolHomework } from '@/lib/types';

const PAGE_SIZE = 20;

function statusTagVariant(status: HomeworkStatus): string {
  if (status === 'COMPLETED') return 'green';
  if (status === 'FAILED') return 'red';
  return 'yellow';
}

const columns: GridColDef<SchoolHomework>[] = [
  { field: 'classLabel', headerName: 'Class', flex: 1, minWidth: 140 },
  {
    field: 'gapTopic',
    headerName: 'Topic',
    flex: 1,
    minWidth: 160,
    valueGetter: (_value, row) => row.gapTopic || '—',
  },
  {
    field: 'teacherName',
    headerName: 'Teacher',
    flex: 1,
    minWidth: 160,
    valueGetter: (_value, row) => row.teacherName ?? '—',
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 160,
    renderCell: (params) => <span className={`tag ${statusTagVariant(params.row.status)}`}>{statusLabel(params.row.status)}</span>,
  },
  {
    field: 'source',
    headerName: 'After',
    width: 160,
    valueGetter: (_value, row) => row.source ?? 'Speak with Milo',
  },
  { field: 'assignedCount', headerName: 'Assigned', width: 100 },
  { field: 'completedCount', headerName: 'Completed', width: 110 },
  {
    field: 'createdAt',
    headerName: 'Set',
    width: 120,
    valueGetter: (_value, row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'),
  },
];

export default function SchoolHomeworkPage() {
  const [classFilter, setClassFilter] = useUrlParam('classId', '');
  const [search, setSearch] = useUrlParam('q', '');
  const [paginationModel, setPaginationModel] = useUrlPaginationModel(PAGE_SIZE);
  const classesState = useAsyncData('classes', () => listClasses());
  const state = useAsyncData(
    `homework:${classFilter}:${search}:${paginationModel.page}:${paginationModel.pageSize}`,
    () =>
      listSchoolHomework({
        classId: classFilter || undefined,
        q: search || undefined,
        limit: paginationModel.pageSize,
        offset: paginationModel.page * paginationModel.pageSize,
      }),
  );
  const classes = classesState.status === 'success' ? classesState.data : [];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Homework</h1>
        </div>
        <p className="lead">Homework across the school - after a Speak with Milo session or a topic checkpoint.</p>
      </div>

      <div className="table-toolbar">
        <SearchBox
          value={search}
          onChange={(next) => {
            setSearch(next);
            setPaginationModel({ page: 0, pageSize: PAGE_SIZE });
          }}
          placeholder="Search by topic"
        />
        <select
          className="field"
          style={{ maxWidth: 240 }}
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            setPaginationModel({ page: 0, pageSize: PAGE_SIZE });
          }}
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              Class {c.grade} · {c.section}
            </option>
          ))}
        </select>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading homework" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' && state.data.items.length === 0 ? (
        <EmptyState title="No Homework yet" message="Homework assigned by teachers across the school will show up here." />
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
