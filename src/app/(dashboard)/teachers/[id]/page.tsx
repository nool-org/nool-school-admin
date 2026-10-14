'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { listClasses, listSchoolQuestionPapers, listSchoolVoiceTests, listTeachers } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import type { SchoolQuestionPaper, SchoolVoiceTest } from '@/lib/types';
import { statusLabel } from '@/lib/statusLabel';

const PAGE_SIZE = 10;

const testColumns: GridColDef<SchoolVoiceTest>[] = [
  { field: 'classLabel', headerName: 'Class', flex: 1, minWidth: 140 },
  { field: 'subjectName', headerName: 'Subject', flex: 1, minWidth: 140 },
  {
    field: 'status',
    headerName: 'Status',
    width: 140,
    renderCell: (params) => <span className="tag yellow">{statusLabel(params.row.status)}</span>,
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

const paperColumns: GridColDef<SchoolQuestionPaper>[] = [
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
  { field: 'examType', headerName: 'Exam type', width: 130 },
  { field: 'subjectName', headerName: 'Subject', width: 140 },
  {
    field: 'status',
    headerName: 'Status',
    width: 140,
    renderCell: (params) => <span className="tag yellow">{statusLabel(params.row.status)}</span>,
  },
  {
    field: 'createdAt',
    headerName: 'Created',
    width: 130,
    valueGetter: (_value, row) => new Date(row.createdAt).toLocaleDateString(),
  },
];

export default function TeacherDetailPage() {
  const { id } = useParams<{ id: string }>();

  const teachersState = useAsyncData('teachers', () => listTeachers());
  const classesState = useAsyncData('classes', () => listClasses());
  const testsState = useAsyncData(
    `teacher-voice-tests:${id}`,
    () => listSchoolVoiceTests({ teacherId: id, limit: PAGE_SIZE, offset: 0 }),
  );
  const papersState = useAsyncData(
    `teacher-question-papers:${id}`,
    () => listSchoolQuestionPapers({ createdBy: id, limit: PAGE_SIZE, offset: 0 }),
  );

  const teacher = teachersState.status === 'success' ? teachersState.data.find((t) => t.id === id) : undefined;
  const classes = classesState.status === 'success' ? classesState.data : [];

  function classLabel(classId: string): string {
    const match = classes.find((c) => c.id === classId);
    return match ? `Class ${match.grade} · ${match.section}` : classId;
  }

  if (teachersState.status === 'loading') {
    return (
      <div className="page">
        <LoadingState label="Loading teacher" />
      </div>
    );
  }

  if (teachersState.status === 'error') {
    return (
      <div className="page">
        <ErrorState error={teachersState.error} onRetry={teachersState.retry} />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="page">
        <EmptyState title="Teacher not found" message="This teacher may have been removed." />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <Link href="/teachers" className="back-link">
          ← Back to Teachers
        </Link>
        <div className="page-head-row">
          <h1>{teacher.displayName}</h1>
        </div>
        <p className="lead">{teacher.email}</p>
      </div>

      <div className="settings-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Profile</h3>
          <dl className="detail-list">
            <div>
              <dt>Phone</dt>
              <dd>{teacher.phoneNumber ?? '—'}</dd>
            </div>
            <div>
              <dt>Employee ID</dt>
              <dd>{teacher.employeeId ?? '—'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`tag ${teacher.status === 'ACTIVE' ? 'green' : 'red'}`}>{teacher.status}</span>
              </dd>
            </div>
            <div>
              <dt>Classes</dt>
              <dd>
                {teacher.classIds.length === 0
                  ? '—'
                  : teacher.classIds.map((cid) => classLabel(cid)).join(', ')}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <h2 style={{ marginBottom: 12 }}>Speak with Milo sessions set</h2>
      {testsState.status === 'loading' ? <LoadingState label="Loading tests" /> : null}
      {testsState.status === 'error' ? <ErrorState error={testsState.error} onRetry={testsState.retry} /> : null}
      {testsState.status === 'success' && testsState.data.items.length === 0 ? (
        <EmptyState title="No tests yet" message="Tests this teacher creates will show up here." />
      ) : null}
      {testsState.status === 'success' && testsState.data.items.length > 0 ? (
        <div style={{ marginBottom: 24 }}>
          <DataTable rows={testsState.data.items} columns={testColumns} pageSize={PAGE_SIZE} />
        </div>
      ) : null}

      <h2 style={{ marginBottom: 12 }}>Question Papers created</h2>
      {papersState.status === 'loading' ? <LoadingState label="Loading question papers" /> : null}
      {papersState.status === 'error' ? <ErrorState error={papersState.error} onRetry={papersState.retry} /> : null}
      {papersState.status === 'success' && papersState.data.items.length === 0 ? (
        <EmptyState title="No question papers yet" message="Papers this teacher creates will show up here." />
      ) : null}
      {papersState.status === 'success' && papersState.data.items.length > 0 ? (
        <DataTable rows={papersState.data.items} columns={paperColumns} pageSize={PAGE_SIZE} />
      ) : null}
    </div>
  );
}
