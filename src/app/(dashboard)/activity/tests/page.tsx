'use client';

import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { listClasses, listSchoolVoiceTests, listTeachers } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import { useUrlPaginationModel, useUrlParam } from '@/lib/useUrlState';
import type { SchoolVoiceTest, TestStatus } from '@/lib/types';

const PAGE_SIZE = 20;

function statusTagVariant(status: TestStatus): string {
  if (status === 'RESULTS_READY' || status === 'COMPLETED') return 'green';
  if (status === 'DRAFT') return 'red';
  return 'yellow';
}

const columns: GridColDef<SchoolVoiceTest>[] = [
  { field: 'classLabel', headerName: 'Class', flex: 1, minWidth: 140 },
  { field: 'subjectName', headerName: 'Subject', flex: 1, minWidth: 140 },
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
    renderCell: (params) => <span className={`tag ${statusTagVariant(params.row.status)}`}>{params.row.status}</span>,
  },
  { field: 'assignedCount', headerName: 'Assigned', width: 100 },
  { field: 'completedCount', headerName: 'Completed', width: 110 },
  {
    field: 'createdAt',
    headerName: 'Created',
    width: 130,
    valueGetter: (_value, row) => new Date(row.createdAt).toLocaleDateString(),
  },
];

export default function SchoolTestsPage() {
  const [classFilter, setClassFilter] = useUrlParam('classId', '');
  const [teacherFilter, setTeacherFilter] = useUrlParam('teacherId', '');
  const [paginationModel, setPaginationModel] = useUrlPaginationModel(PAGE_SIZE);
  const classesState = useAsyncData('classes', () => listClasses());
  const teachersState = useAsyncData('teachers', () => listTeachers());
  const state = useAsyncData(
    `voice-tests:${classFilter}:${teacherFilter}:${paginationModel.page}:${paginationModel.pageSize}`,
    () =>
      listSchoolVoiceTests({
        classId: classFilter || undefined,
        teacherId: teacherFilter || undefined,
        limit: paginationModel.pageSize,
        offset: paginationModel.page * paginationModel.pageSize,
      }),
  );
  const classes = classesState.status === 'success' ? classesState.data : [];
  const teachers = teachersState.status === 'success' ? teachersState.data : [];

  function resetToFirstPage() {
    setPaginationModel({ page: 0, pageSize: PAGE_SIZE });
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Voice Tests</h1>
        </div>
        <p className="lead">Every Test created across the school, by any teacher.</p>
      </div>

      <div className="table-toolbar">
        <select
          className="field"
          style={{ maxWidth: 240 }}
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            resetToFirstPage();
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
          style={{ maxWidth: 240 }}
          value={teacherFilter}
          onChange={(e) => {
            setTeacherFilter(e.target.value);
            resetToFirstPage();
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

      {state.status === 'loading' ? <LoadingState label="Loading tests" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' && state.data.items.length === 0 ? (
        <EmptyState title="No Tests yet" message="Tests created by teachers across the school will show up here." />
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
