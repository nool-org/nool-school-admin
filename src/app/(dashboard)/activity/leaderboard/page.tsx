'use client';

import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { getSchoolLeaderboard, listClasses } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import { useUrlPaginationModel, useUrlParam } from '@/lib/useUrlState';
import type { SchoolLeaderboardEntry } from '@/lib/types';

const PAGE_SIZE = 20;

const columns: GridColDef<SchoolLeaderboardEntry>[] = [
  { field: 'rank', headerName: 'Rank', width: 90, valueGetter: (_value, row) => `#${row.rank}` },
  { field: 'displayName', headerName: 'Student', flex: 1, minWidth: 180 },
  { field: 'classLabel', headerName: 'Class', width: 140 },
  { field: 'points', headerName: 'Points', width: 110 },
];

export default function SchoolLeaderboardPage() {
  const [classFilter, setClassFilter] = useUrlParam('classId', '');
  const [paginationModel, setPaginationModel] = useUrlPaginationModel(PAGE_SIZE);
  const classesState = useAsyncData('classes', () => listClasses());
  const state = useAsyncData(
    `leaderboard:${classFilter}:${paginationModel.page}:${paginationModel.pageSize}`,
    () =>
      getSchoolLeaderboard({
        classId: classFilter || undefined,
        limit: paginationModel.pageSize,
        offset: paginationModel.page * paginationModel.pageSize,
      }),
  );
  const classes = classesState.status === 'success' ? classesState.data : [];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Leaderboard</h1>
        </div>
        <p className="lead">Every student in the school, ranked by points - school-wide, or narrowed to one class.</p>
      </div>

      <div className="table-toolbar">
        <select
          className="field"
          style={{ maxWidth: 240 }}
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            setPaginationModel({ page: 0, pageSize: PAGE_SIZE });
          }}
        >
          <option value="">All classes (school-wide)</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              Class {c.grade} · {c.section}
            </option>
          ))}
        </select>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading leaderboard" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' && state.data.items.length === 0 ? (
        <EmptyState title="No students yet" message="Once students earn points, the ranking will show up here." />
      ) : null}

      {state.status === 'success' && state.data.items.length > 0 ? (
        <DataTable
          rows={state.data.items}
          columns={columns}
          getRowId={(row) => row.studentId}
          server
          rowCount={state.data.total}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
        />
      ) : null}
    </div>
  );
}
