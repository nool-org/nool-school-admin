'use client';

import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/DataTable';
import { SearchBox } from '@/components/SearchBox';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { listClasses, listSchoolChallenges, listTeachers } from '@/lib/api';
import { statusLabel } from '@/lib/statusLabel';
import { useAsyncData } from '@/lib/useAsyncData';
import { useUrlPaginationModel, useUrlParam } from '@/lib/useUrlState';
import type { SchoolChallenge } from '@/lib/types';

const PAGE_SIZE = 20;

const columns: GridColDef<SchoolChallenge>[] = [
  { field: 'title', headerName: 'Challenge', flex: 1.4, minWidth: 200 },
  { field: 'classLabel', headerName: 'Class', flex: 1, minWidth: 130 },
  {
    field: 'teacherName',
    headerName: 'Teacher',
    flex: 1,
    minWidth: 150,
    valueGetter: (_value, row) => row.teacherName ?? '—',
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 140,
    renderCell: (params) => (
      <span className={`tag ${params.row.status === 'published' ? 'green' : params.row.status === 'failed' ? 'red' : 'yellow'}`}>
        {statusLabel(params.row.status)}
      </span>
    ),
  },
  {
    field: 'doneCount',
    headerName: 'Finished',
    width: 110,
    valueGetter: (_value, row) => (row.studentCount ? `${row.doneCount} / ${row.studentCount}` : '—'),
  },
  {
    field: 'averagePercent',
    headerName: 'Average',
    width: 100,
    valueGetter: (_value, row) => (row.averagePercent === null ? '—' : `${row.averagePercent}%`),
  },
  {
    field: 'createdAt',
    headerName: 'Set',
    width: 120,
    valueGetter: (_value, row) => new Date(row.createdAt).toLocaleDateString(),
  },
];

/** Teachers' Maths challenges (Fix Milo's homework) across the school - how
 * many finished and how they did. The Maths side of Speak with Milo. */
export default function SchoolChallengesPage() {
  const [classFilter, setClassFilter] = useUrlParam('classId', '');
  const [teacherFilter, setTeacherFilter] = useUrlParam('teacherId', '');
  const [search, setSearch] = useUrlParam('q', '');
  const [paginationModel, setPaginationModel] = useUrlPaginationModel(PAGE_SIZE);
  const classesState = useAsyncData('classes', () => listClasses());
  const teachersState = useAsyncData('teachers', () => listTeachers());
  const state = useAsyncData(
    `challenges:${classFilter}:${teacherFilter}:${search}:${paginationModel.page}:${paginationModel.pageSize}`,
    () =>
      listSchoolChallenges({
        classId: classFilter || undefined,
        teacherId: teacherFilter || undefined,
        q: search || undefined,
        limit: paginationModel.pageSize,
        offset: paginationModel.page * paginationModel.pageSize,
      }),
  );
  const classes = classesState.status === 'success' ? classesState.data : [];
  const teachers = teachersState.status === 'success' ? teachersState.data : [];
  const firstPage = () => setPaginationModel({ page: 0, pageSize: PAGE_SIZE });

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Maths challenges</h1>
        </div>
        <p className="lead">Fix Milo&apos;s homework set by your Maths teachers - who finished and how the class did.</p>
      </div>

      <div className="table-toolbar">
        <SearchBox
          value={search}
          onChange={(next) => {
            setSearch(next);
            firstPage();
          }}
          placeholder="Search by chapter"
        />
        <select
          className="field"
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            firstPage();
          }}
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              Class {c.grade} · {c.section}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={teacherFilter}
          onChange={(e) => {
            setTeacherFilter(e.target.value);
            firstPage();
          }}
        >
          <option value="">All teachers</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.displayName}
            </option>
          ))}
        </select>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading challenges" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}
      {state.status === 'success' && state.data.items.length === 0 ? (
        <EmptyState
          title={search ? 'Nothing matches' : 'No Maths challenges yet'}
          message={
            search
              ? 'Try another chapter.'
              : "When a Maths teacher sets Fix Milo's homework, it shows up here with the class's progress."
          }
        />
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
