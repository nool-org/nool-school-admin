'use client';

import Link from 'next/link';
import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { TrendChart } from '@/components/TrendChart';
import { getAnalytics } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import type { ClassBreakdown, SlippingStudent, WeakChapter } from '@/lib/types';

const BLOOM_LABEL: Record<string, string> = {
  REMEMBER: 'Remember',
  UNDERSTAND: 'Understand',
  APPLY: 'Apply',
  ANALYZE: 'Analyze',
  EVALUATE: 'Evaluate',
  CREATE: 'Create',
};

const columns: GridColDef<ClassBreakdown>[] = [
  { field: 'label', headerName: 'Class', flex: 1, minWidth: 160 },
  {
    field: 'masteryAvgPercent',
    headerName: 'Mastery average',
    flex: 1,
    minWidth: 160,
    valueGetter: (_value, row) => `${row.masteryAvgPercent}%`,
  },
  {
    field: 'improvementPercent',
    headerName: 'First → latest challenge',
    flex: 1,
    minWidth: 180,
    renderCell: (params) =>
      params.row.challengesTaken < 2 ? (
        '—'
      ) : (
        <span className={`tag ${params.row.improvementPercent >= 0 ? 'green' : 'red'}`}>
          {params.row.improvementPercent >= 0 ? '+' : ''}
          {params.row.improvementPercent} pts
        </span>
      ),
  },
  { field: 'challengesTaken', headerName: 'Challenges', width: 120 },
  { field: 'studentsAssessed', headerName: 'Students assessed', width: 160 },
];

const scoreTag = (percent: number) => (percent >= 70 ? 'green' : percent >= 40 ? 'yellow' : 'red');

const chapterColumns: GridColDef<WeakChapter>[] = [
  { field: 'chapter', headerName: 'Chapter', flex: 1.4, minWidth: 200 },
  { field: 'subject', headerName: 'Subject', flex: 0.8, minWidth: 120 },
  {
    field: 'averagePercent',
    headerName: 'Average',
    width: 110,
    renderCell: (params) => <span className={`tag ${scoreTag(params.row.averagePercent)}`}>{params.row.averagePercent}%</span>,
  },
  { field: 'students', headerName: 'Students', width: 100 },
  {
    field: 'classes',
    headerName: 'Classes',
    flex: 1,
    minWidth: 160,
    valueGetter: (_value, row) => row.classes.join(', '),
  },
];

const slippingColumns: GridColDef<SlippingStudent>[] = [
  { field: 'name', headerName: 'Student', flex: 1, minWidth: 160 },
  { field: 'classLabel', headerName: 'Class', width: 130 },
  { field: 'chapter', headerName: 'Latest challenge', flex: 1.2, minWidth: 180 },
  {
    field: 'latestPercent',
    headerName: 'Latest',
    width: 100,
    renderCell: (params) => <span className={`tag ${scoreTag(params.row.latestPercent)}`}>{params.row.latestPercent}%</span>,
  },
  {
    field: 'earlierAvgPercent',
    headerName: 'Their earlier average',
    width: 180,
    valueGetter: (_value, row) => (row.earlierAvgPercent === null ? 'First challenge' : `${row.earlierAvgPercent}%`),
  },
];

export default function AnalyticsPage() {
  const state = useAsyncData('analytics', () => getAnalytics());

  const trend = state.status === 'success' ? state.data.masteryTrend : [];
  const growth =
    trend.length >= 2 ? trend[trend.length - 1].masteryAvgPercent - trend[0].masteryAvgPercent : null;

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>School performance</h1>
        </div>
        <p className="lead">Mastery, growth, and improvement across every class at this school.</p>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading analytics" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' ? (
        <>
          <div className="stats-grid">
            <div className="stat">
              <small>School mastery average</small>
              <strong>{state.data.schoolMasteryAvgPercent}%</strong>
            </div>
            <div className="stat">
              <small>Classes tracked</small>
              <strong>{state.data.classBreakdown.length}</strong>
            </div>
            <div className="stat">
              <small>Growth, last {trend.length} week{trend.length === 1 ? '' : 's'}</small>
              <strong style={{ color: growth === null ? undefined : growth >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                {growth === null ? '—' : growth >= 0 ? `+${growth} pts` : `${growth} pts`}
              </strong>
            </div>
          </div>

          <div className="section-head" style={{ marginBottom: 12 }}>
            <h3>Mastery trend</h3>
          </div>
          <div className="card" style={{ marginBottom: 24 }}>
            <TrendChart points={trend.map((p) => ({ label: p.periodLabel, value: p.masteryAvgPercent }))} />
          </div>

          <div className="dashboard-columns" style={{ marginBottom: 24 }}>
            <div>
              <div className="section-head" style={{ marginBottom: 12 }}>
                <h3>Bloom&apos;s level averages</h3>
              </div>
              <div className="card">
                {state.data.bloomAverages.map((score) => (
                  <div key={score.level} className="metric">
                    <div className="metric-head">
                      <span>{BLOOM_LABEL[score.level] ?? score.level}</span>
                      <span>{score.percent === null ? 'Not assessed' : `${score.percent}%`}</span>
                    </div>
                    <div className="metric-line">
                      {score.percent !== null ? <b style={{ width: `${score.percent}%` }} /> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="section-head" style={{ marginBottom: 12 }}>
                <h3>Dig deeper</h3>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Link href="/activity/leaderboard" className="link-btn" style={{ padding: '10px 0' }}>
                  Class &amp; section leaderboards →
                </Link>
                <Link href="/question-bank" className="link-btn" style={{ padding: '10px 0' }}>
                  Browse the school question bank →
                </Link>
              </div>
            </div>
          </div>

          <div className="section-head" style={{ marginBottom: 12 }}>
            <h3>Chapters needing attention</h3>
          </div>
          <div style={{ marginBottom: 24 }}>
            {state.data.weakChapters.length === 0 ? (
              <EmptyState title="No challenges yet" message="Chapters show up here once classes take a challenge on them." />
            ) : (
              <DataTable rows={state.data.weakChapters} columns={chapterColumns} getRowId={(row) => row.chapterId} />
            )}
          </div>

          <div className="section-head" style={{ marginBottom: 12 }}>
            <h3>Students slipping</h3>
          </div>
          <p className="lead" style={{ marginBottom: 12 }}>
            Their latest challenge is 15+ points under their own earlier average, or under 40%. Worth a word from
            their teacher.
          </p>
          <div style={{ marginBottom: 24 }}>
            {state.data.slippingStudents.length === 0 ? (
              <EmptyState title="Nobody is slipping" message="No student has dropped sharply on their latest challenge." />
            ) : (
              <DataTable rows={state.data.slippingStudents} columns={slippingColumns} getRowId={(row) => row.studentId} />
            )}
          </div>

          <div className="section-head" style={{ marginBottom: 12 }}>
            <h3>By class</h3>
          </div>
          <DataTable rows={state.data.classBreakdown} columns={columns} getRowId={(row) => row.classId} />
        </>
      ) : null}
    </div>
  );
}
