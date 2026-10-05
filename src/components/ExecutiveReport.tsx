'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ClassIcon, SparkleIcon, TrendingUpIcon, UsersIcon } from '@/components/Icon';
import { ErrorState, LoadingState } from '@/components/states';
import {
  getAnalytics,
  getSchoolLeaderboard,
  getSubscription,
  listClasses,
  listStudents,
  listTeachers,
} from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';

const BLOOM_LABEL: Record<string, string> = {
  REMEMBER: 'Remember',
  UNDERSTAND: 'Understand',
  APPLY: 'Apply',
  ANALYZE: 'Analyze',
  EVALUATE: 'Evaluate',
  CREATE: 'Create',
};

// One brand-derived hue per series/category so multi-series charts below
// read as distinct at a glance - pulled from globals.css's existing
// palette (yellow/purple/green/red/amber) plus one added blue, rather than
// inventing an unrelated chart-only palette.
const CHART_COLORS = ['#ffc800', '#6840ae', '#276b35', '#b24c4c', '#886a00', '#2f6690'];

function CardShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card report-chart-card">
      <div className="report-chart-head">
        <h3>{title}</h3>
        {subtitle ? <span className="report-chart-subtitle">{subtitle}</span> : null}
      </div>
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="report-chart-tooltip">
      <b>{label}</b>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {p.value}
          {typeof p.value === 'number' && p.value <= 100 ? '%' : ''}
        </div>
      ))}
    </div>
  );
}

/**
 * The default view of the School Admin Reports page - a fixed, colorful,
 * multi-chart snapshot of real school performance, built to be screenshot-
 * or presented-as-is to school leadership. Distinct from the pivot-style
 * report builder below it on the same page (arbitrary dimension/metric
 * combos don't map to a fixed chart layout the way this dashboard's known,
 * specific metrics do). Every number here comes from an existing endpoint
 * already used elsewhere (Dashboard, Analytics) - nothing invented.
 */
export function ExecutiveReport() {
  const analyticsState = useAsyncData('exec-report-analytics', () => getAnalytics());
  const subscriptionState = useAsyncData('exec-report-subscription', () => getSubscription());
  const leaderboardState = useAsyncData('exec-report-leaderboard', () => getSchoolLeaderboard({ limit: 5, offset: 0 }));
  const teachersState = useAsyncData('exec-report-teachers', () => listTeachers());
  const studentsState = useAsyncData('exec-report-students', () => listStudents());
  const classesState = useAsyncData('exec-report-classes', () => listClasses());

  const anyLoading =
    analyticsState.status === 'loading' ||
    subscriptionState.status === 'loading' ||
    leaderboardState.status === 'loading' ||
    teachersState.status === 'loading' ||
    studentsState.status === 'loading' ||
    classesState.status === 'loading';

  const anyError =
    analyticsState.status === 'error' ||
    subscriptionState.status === 'error' ||
    leaderboardState.status === 'error' ||
    teachersState.status === 'error' ||
    studentsState.status === 'error' ||
    classesState.status === 'error';

  if (anyLoading) return <LoadingState label="Loading school report" />;
  if (anyError) {
    return (
      <ErrorState
        error={
          [analyticsState, subscriptionState, leaderboardState, teachersState, studentsState, classesState].map((st) => (st.status === 'error' ? st.error : null)).find(Boolean)
        }
        onRetry={() => {
          if (analyticsState.status === 'error') analyticsState.retry();
          if (subscriptionState.status === 'error') subscriptionState.retry();
          if (leaderboardState.status === 'error') leaderboardState.retry();
          if (teachersState.status === 'error') teachersState.retry();
          if (studentsState.status === 'error') studentsState.retry();
          if (classesState.status === 'error') classesState.retry();
        }}
      />
    );
  }
  if (
    analyticsState.status !== 'success' ||
    subscriptionState.status !== 'success' ||
    leaderboardState.status !== 'success' ||
    teachersState.status !== 'success' ||
    studentsState.status !== 'success' ||
    classesState.status !== 'success'
  ) {
    return null;
  }

  const analytics = analyticsState.data;
  const subscription = subscriptionState.data;
  const leaderboard = leaderboardState.data.items;
  const activeTeachers = teachersState.data.filter((t) => t.status === 'ACTIVE').length;
  const activeStudents = studentsState.data.filter((s) => s.status === 'ACTIVE').length;
  const classCount = classesState.data.length;

  const trendData = analytics.masteryTrend.map((p) => ({ period: p.periodLabel, mastery: p.masteryAvgPercent }));
  const bloomData = analytics.bloomAverages
    .filter((b) => b.percent !== null)
    .map((b) => ({ level: BLOOM_LABEL[b.level] ?? b.level, percent: b.percent as number }));
  const classData = analytics.classBreakdown.map((c) => ({
    label: c.label,
    mastery: c.masteryAvgPercent,
    improvement: c.improvementPercent,
  }));
  const leaderboardData = [...leaderboard].reverse().map((e) => ({ name: e.displayName, points: e.points }));

  return (
    <div className="executive-report">
      <div className="dashboard-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="insight-card dark">
          <div className="insight-icon"><TrendingUpIcon /></div>
          <small>School mastery average</small>
          <strong>{analytics.schoolMasteryAvgPercent}%</strong>
          <small>Across all assessed classes</small>
        </div>
        <div className="insight-card">
          <div className="insight-icon" style={{ background: '#eaf3e9' }}><UsersIcon /></div>
          <small>Active teachers</small>
          <strong>{activeTeachers}</strong>
          <small>of {teachersState.data.length} total</small>
        </div>
        <div className="insight-card">
          <div className="insight-icon" style={{ background: '#eee7ff' }}><UsersIcon /></div>
          <small>Active students</small>
          <strong>{activeStudents}</strong>
          <small>of {studentsState.data.length} total</small>
        </div>
        <div className="insight-card">
          <div className="insight-icon" style={{ background: '#fff4c7' }}><ClassIcon /></div>
          <small>Classes tracked</small>
          <strong>{classCount}</strong>
          <small>Grades 1–12</small>
        </div>
        <div className="insight-card">
          <div className="insight-icon" style={{ background: '#fbeae8' }}><SparkleIcon /></div>
          <small>Plan</small>
          <strong style={{ fontSize: '1.1rem' }}>{subscription.planName}</strong>
          <small>{subscription.status}</small>
        </div>
      </div>

      <div className="report-charts-grid">
        <CardShell title="Mastery trend" subtitle="Weekly average, all classes">
          {trendData.length === 0 ? (
            <p style={{ color: 'var(--color-muted)' }}>Not enough test activity yet to show a trend.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="masteryFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="mastery"
                  name="Mastery"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2.5}
                  fill="url(#masteryFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardShell>

        <CardShell title="Bloom's level breakdown" subtitle="Cognitive depth, assessed levels only">
          {bloomData.length === 0 ? (
            <p style={{ color: 'var(--color-muted)' }}>No Bloom-level assessments yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bloomData} layout="vertical" margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="level" width={90} tick={{ fontSize: 12, fill: 'var(--color-ink)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="percent" name="Mastery" radius={[0, 6, 6, 0]}>
                  {bloomData.map((_entry, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardShell>

        <CardShell title="By class" subtitle="Mastery average vs. improvement">
          {classData.length === 0 ? (
            <p style={{ color: 'var(--color-muted)' }}>No class data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={classData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="mastery" name="Mastery %" fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} />
                <Bar dataKey="improvement" name="Improvement" fill={CHART_COLORS[2]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardShell>

        <CardShell title="Leaderboard" subtitle="Top students by points">
          {leaderboardData.length === 0 ? (
            <p style={{ color: 'var(--color-muted)' }}>No leaderboard activity yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={leaderboardData} layout="vertical" margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: 'var(--color-ink)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="points" name="Points" radius={[0, 6, 6, 0]}>
                  {leaderboardData.map((_entry, i) => (
                    <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardShell>
      </div>
    </div>
  );
}
