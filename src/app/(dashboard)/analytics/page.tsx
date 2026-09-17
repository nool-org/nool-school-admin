'use client';

import Link from 'next/link';
import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/DataTable';
import { ErrorState, LoadingState } from '@/components/states';
import { TrendChart } from '@/components/TrendChart';
import { getAnalytics } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import type { ClassBreakdown } from '@/lib/types';

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
    headerName: 'Improvement',
    flex: 1,
    minWidth: 140,
    valueGetter: (_value, row) => (row.improvementPercent >= 0 ? `+${row.improvementPercent}` : row.improvementPercent),
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
      {state.status === 'error' ? <ErrorState onRetry={state.retry} /> : null}

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
            <h3>By class</h3>
          </div>
          <DataTable rows={state.data.classBreakdown} columns={columns} getRowId={(row) => row.classId} />
        </>
      ) : null}
    </div>
  );
}
