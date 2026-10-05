'use client';

import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { getCurriculum, listSchoolQuestionPapers, listTeachers } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import { useUrlPaginationModel, useUrlParam } from '@/lib/useUrlState';
import { subjectLabel, type QuestionPaperStatus, type SchoolQuestionPaper } from '@/lib/types';

const PAGE_SIZE = 20;

function statusTagVariant(status: QuestionPaperStatus): string {
  if (status === 'FINALIZED') return 'green';
  if (status === 'VALIDATION_FAILED') return 'red';
  return 'yellow';
}

const columns: GridColDef<SchoolQuestionPaper>[] = [
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
  { field: 'examType', headerName: 'Exam type', width: 130 },
  { field: 'subjectName', headerName: 'Subject', width: 140 },
  { field: 'createdByName', headerName: 'Created by', width: 160 },
  {
    field: 'status',
    headerName: 'Status',
    width: 160,
    renderCell: (params) => <span className={`tag ${statusTagVariant(params.row.status)}`}>{params.row.status}</span>,
  },
  {
    field: 'createdAt',
    headerName: 'Created',
    width: 130,
    valueGetter: (_value, row) => new Date(row.createdAt).toLocaleDateString(),
  },
];

export default function SchoolQuestionPapersPage() {
  const [subjectFilter, setSubjectFilter] = useUrlParam('subjectId', '');
  const [createdByFilter, setCreatedByFilter] = useUrlParam('createdBy', '');
  const [paginationModel, setPaginationModel] = useUrlPaginationModel(PAGE_SIZE);
  const curriculumState = useAsyncData('curriculum', () => getCurriculum());
  const teachersState = useAsyncData('teachers', () => listTeachers());
  const state = useAsyncData(
    `question-papers:${subjectFilter}:${createdByFilter}:${paginationModel.page}:${paginationModel.pageSize}`,
    () =>
      listSchoolQuestionPapers({
        subjectId: subjectFilter || undefined,
        createdBy: createdByFilter || undefined,
        limit: paginationModel.pageSize,
        offset: paginationModel.page * paginationModel.pageSize,
      }),
  );
  const subjects = curriculumState.status === 'success' ? curriculumState.data.subjects.filter((s) => s.enabled) : [];
  const teachers = teachersState.status === 'success' ? teachersState.data : [];

  function resetToFirstPage() {
    setPaginationModel({ page: 0, pageSize: PAGE_SIZE });
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Question Papers</h1>
        </div>
        <p className="lead">Question Papers created across the school, by any teacher.</p>
      </div>

      <div className="table-toolbar">
        <select
          className="field"
          style={{ maxWidth: 240 }}
          value={subjectFilter}
          onChange={(e) => {
            setSubjectFilter(e.target.value);
            resetToFirstPage();
          }}
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {subjectLabel(s)}
            </option>
          ))}
          {/* A filter from a shared link / a since-disabled subject stays selectable instead of rendering blank. */}
          {subjectFilter && curriculumState.status === 'success' && !subjects.some((s) => s.id === subjectFilter) ? (
            <option value={subjectFilter}>Subject no longer assigned</option>
          ) : null}
        </select>
        <select
          className="field"
          style={{ maxWidth: 240 }}
          value={createdByFilter}
          onChange={(e) => {
            setCreatedByFilter(e.target.value);
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

      {state.status === 'loading' ? <LoadingState label="Loading question papers" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' && state.data.items.length === 0 ? (
        <EmptyState
          title="No Question Papers yet"
          message="Question Papers created by teachers across the school will show up here."
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
