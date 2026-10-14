'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { listClasses, listSchoolHomework, listStudents } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import type { SchoolHomework } from '@/lib/types';
import { statusLabel } from '@/lib/statusLabel';

const PAGE_SIZE = 10;

const homeworkColumns: GridColDef<SchoolHomework>[] = [
  { field: 'gapTopic', headerName: 'Gap topic', flex: 1, minWidth: 160 },
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
    width: 140,
    renderCell: (params) => <span className="tag yellow">{statusLabel(params.row.status)}</span>,
  },
  { field: 'assignedCount', headerName: 'Assigned', width: 100 },
  { field: 'completedCount', headerName: 'Completed', width: 110 },
];

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();

  // Same cache key ("students:" - no class filter) as the Students list
  // page's "All classes" view, so arriving here from that list reuses
  // its cache instead of re-fetching the whole roster.
  const studentsState = useAsyncData('students:', () => listStudents());
  const classesState = useAsyncData('classes', () => listClasses());

  const student = studentsState.status === 'success' ? studentsState.data.find((s) => s.id === id) : undefined;
  const classes = classesState.status === 'success' ? classesState.data : [];

  const homeworkState = useAsyncData(
    student ? `student-homework:${student.classId}` : null,
    () => listSchoolHomework({ classId: student?.classId, limit: PAGE_SIZE, offset: 0 }),
  );

  function classLabel(classId: string): string {
    const match = classes.find((c) => c.id === classId);
    return match ? `Class ${match.grade} · ${match.section}` : classId;
  }

  if (studentsState.status === 'loading') {
    return (
      <div className="page">
        <LoadingState label="Loading student" />
      </div>
    );
  }

  if (studentsState.status === 'error') {
    return (
      <div className="page">
        <ErrorState error={studentsState.error} onRetry={studentsState.retry} />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="page">
        <EmptyState title="Student not found" message="This student may have been removed." />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <Link href="/students" className="back-link">
          ← Back to Students
        </Link>
        <div className="page-head-row">
          <h1>{student.displayName}</h1>
        </div>
        <p className="lead">{student.email}</p>
      </div>

      <div className="settings-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Profile</h3>
          <dl className="detail-list">
            <div>
              <dt>Class</dt>
              <dd>{classLabel(student.classId)}</dd>
            </div>
            <div>
              <dt>Roll number</dt>
              <dd>{student.rollNumber}</dd>
            </div>
            <div>
              <dt>Guardian</dt>
              <dd>{student.guardianName ?? '—'}</dd>
            </div>
            <div>
              <dt>Guardian phone</dt>
              <dd>{student.guardianPhone ?? '—'}</dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>{student.dateOfBirth ?? '—'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`tag ${student.status === 'ACTIVE' ? 'green' : 'red'}`}>{student.status}</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <h2 style={{ marginBottom: 4 }}>Class homework</h2>
      <p className="lead" style={{ marginBottom: 12 }}>
        Homework assigned to {classLabel(student.classId)} as a whole — the API doesn&apos;t yet track
        per-student activity separately from class-level assignment.
      </p>
      {homeworkState.status === 'loading' ? <LoadingState label="Loading homework" /> : null}
      {homeworkState.status === 'error' ? <ErrorState error={homeworkState.error} onRetry={homeworkState.retry} /> : null}
      {homeworkState.status === 'success' && homeworkState.data.items.length === 0 ? (
        <EmptyState title="No homework yet" message="Homework assigned to this class will show up here." />
      ) : null}
      {homeworkState.status === 'success' && homeworkState.data.items.length > 0 ? (
        <DataTable rows={homeworkState.data.items} columns={homeworkColumns} pageSize={PAGE_SIZE} />
      ) : null}
    </div>
  );
}
