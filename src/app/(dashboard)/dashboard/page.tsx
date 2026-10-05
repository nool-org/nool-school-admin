'use client';

import Link from 'next/link';

import { ErrorState, LoadingState } from '@/components/states';
import {
  AlertIcon,
  BookIcon,
  ClassIcon,
  SparkleIcon,
  TrendingUpIcon,
  UsersIcon,
} from '@/components/Icon';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import {
  getAnalytics,
  getCurriculum,
  getSchoolLeaderboard,
  getSubscription,
  listClasses,
  listSchoolAuditLog,
  listSchoolQuestionBank,
  listSchoolVoiceTests,
  listStudents,
  listTeachers,
} from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';

/** A plan limit is "near" once usage crosses this fraction - the nudge
 * exists to prompt an upgrade conversation before the admin hits a hard
 * 409 mid-task (inviting a teacher, adding a student), not after. */
const NEAR_LIMIT_THRESHOLD = 0.9;

const BLOOM_LABEL: Record<string, string> = {
  REMEMBER: 'Remember',
  UNDERSTAND: 'Understand',
  APPLY: 'Apply',
  ANALYZE: 'Analyze',
  EVALUATE: 'Evaluate',
  CREATE: 'Create',
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const teachersState = useAsyncData('teachers', () => listTeachers());
  const studentsState = useAsyncData('students:', () => listStudents());
  const classesState = useAsyncData('classes', () => listClasses());
  const analyticsState = useAsyncData('analytics', () => getAnalytics());
  const subscriptionState = useAsyncData('subscription', () => getSubscription());
  const leaderboardState = useAsyncData('dashboard-leaderboard', () => getSchoolLeaderboard({ limit: 5, offset: 0 }));
  const auditState = useAsyncData('dashboard-audit-log', () => listSchoolAuditLog({ limit: 6, offset: 0 }));
  const testsState = useAsyncData('dashboard-voice-tests', () => listSchoolVoiceTests({ limit: 5, offset: 0 }));
  const questionBankState = useAsyncData('dashboard-question-bank-count', () => listSchoolQuestionBank({ limit: 1, offset: 0 }));
  const curriculumState = useAsyncData('curriculum', () => getCurriculum());

  const teachers = teachersState.status === 'success' ? teachersState.data : [];
  const students = studentsState.status === 'success' ? studentsState.data : [];
  const classes = classesState.status === 'success' ? classesState.data : [];

  const activeTeachers = teachers.filter((t) => t.status === 'ACTIVE').length;
  const pendingTeachers = teachers.filter((t) => t.status === 'PENDING').length;
  const activeStudents = students.filter((s) => s.status === 'ACTIVE').length;

  const anyCoreLoading =
    teachersState.status === 'loading' || studentsState.status === 'loading' || classesState.status === 'loading';
  const anyCoreError = teachersState.status === 'error' || studentsState.status === 'error' || classesState.status === 'error';

  const subscription = subscriptionState.status === 'success' ? subscriptionState.data : null;
  const nearLimitMeters = subscription
    ? [
        { label: 'teachers', used: subscription.teacherCount, limit: subscription.teacherLimit },
        { label: 'students', used: subscription.studentCount, limit: subscription.studentLimit },
      ].filter((m) => m.limit > 0 && m.used / m.limit >= NEAR_LIMIT_THRESHOLD)
    : [];

  const hasEnabledSubject =
    curriculumState.status === 'success' && curriculumState.data.subjects.some((s) => s.enabled);
  const onboardingSteps = [
    {
      label: 'Subjects assigned by Nool',
      description: 'Your platform admin assigns this school its subjects - view them here.',
      href: '/curriculum',
      done: hasEnabledSubject,
    },
    {
      label: 'Create your first class',
      description: 'Set up a grade and section for your roster.',
      href: '/classes',
      done: classes.length > 0,
    },
    {
      label: 'Invite a teacher',
      description: 'Give a teacher access to their classes.',
      href: '/teachers',
      done: teachers.length > 0,
    },
    {
      label: 'Add a student',
      description: 'Add your first student to a class.',
      href: '/students',
      done: students.length > 0,
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Dashboard</h1>
        </div>
        <p className="lead">A snapshot of teachers, students, classes, and performance across your school.</p>
      </div>

      {nearLimitMeters.length > 0 ? (
        <div className="upsell-banner">
          <AlertIcon />
          <span>
            You&apos;re close to your plan&apos;s limit on {nearLimitMeters.map((m) => m.label).join(' and ')} -
            reach out to your account team before it blocks adding more.
          </span>
          <Link href="/subscription" className="btn dark sm">
            View plan
          </Link>
        </div>
      ) : null}

      {!anyCoreLoading && !anyCoreError ? <OnboardingChecklist steps={onboardingSteps} /> : null}

      {anyCoreLoading ? <LoadingState label="Loading dashboard" /> : null}
      {anyCoreError ? (
        <ErrorState
          error={[teachersState, studentsState, classesState].map((st) => (st.status === 'error' ? st.error : null)).find(Boolean)}
          onRetry={() => {
            if (teachersState.status === 'error') teachersState.retry();
            if (studentsState.status === 'error') studentsState.retry();
            if (classesState.status === 'error') classesState.retry();
          }}
        />
      ) : null}

      {!anyCoreLoading && !anyCoreError ? (
        <>
          <div className="dashboard-grid">
            <Link href="/teachers" className="insight-card">
              <div className="insight-icon"><UsersIcon /></div>
              <small>Teachers</small>
              <strong>{teachers.length}</strong>
              <small>{activeTeachers} active{pendingTeachers ? ` · ${pendingTeachers} pending` : ''}</small>
            </Link>
            <Link href="/students" className="insight-card">
              <div className="insight-icon"><UsersIcon /></div>
              <small>Students</small>
              <strong>{students.length}</strong>
              <small>{activeStudents} active</small>
            </Link>
            <Link href="/classes" className="insight-card">
              <div className="insight-icon"><ClassIcon /></div>
              <small>Classes</small>
              <strong>{classes.length}</strong>
              <small>Grades 1–12</small>
            </Link>
            <div className="insight-card dark">
              <div className="insight-icon"><TrendingUpIcon /></div>
              <small>School mastery average</small>
              <strong>
                {analyticsState.status === 'success' ? `${analyticsState.data.schoolMasteryAvgPercent}%` : '—'}
              </strong>
              <small>Across all assessed classes</small>
            </div>
            <Link href="/question-bank" className="insight-card">
              <div className="insight-icon"><BookIcon /></div>
              <small>Question bank</small>
              <strong>{questionBankState.status === 'success' ? questionBankState.data.total : '—'}</strong>
              <small>Questions generated, ready to reuse</small>
            </Link>
          </div>

          <div className="dashboard-columns">
            <div>
              <div className="section-head">
                <h3>Mastery by class</h3>
                <Link href="/analytics" className="link-btn">
                  View analytics →
                </Link>
              </div>
              <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                {analyticsState.status === 'loading' ? <LoadingState label="Loading analytics" /> : null}
                {analyticsState.status === 'error' ? <ErrorState error={analyticsState.error} onRetry={analyticsState.retry} /> : null}
                {analyticsState.status === 'success' && analyticsState.data.classBreakdown.length === 0 ? (
                  <p>No mastery data yet - it will appear once classes start taking tests.</p>
                ) : null}
                {analyticsState.status === 'success'
                  ? analyticsState.data.classBreakdown.slice(0, 6).map((row) => (
                      <div key={row.classId} className="metric">
                        <div className="metric-head">
                          <span>{row.label}</span>
                          <span>{row.masteryAvgPercent}%</span>
                        </div>
                        <div className="metric-line">
                          <b style={{ width: `${row.masteryAvgPercent}%` }} />
                        </div>
                      </div>
                    ))
                  : null}
              </div>

              <div className="section-head">
                <h3>Bloom&apos;s level averages</h3>
              </div>
              <div className="card">
                {analyticsState.status === 'success'
                  ? analyticsState.data.bloomAverages.map((score) => (
                      <div key={score.level} className="metric">
                        <div className="metric-head">
                          <span>{BLOOM_LABEL[score.level] ?? score.level}</span>
                          <span>{score.percent === null ? 'Not assessed' : `${score.percent}%`}</span>
                        </div>
                        <div className="metric-line">
                          {score.percent !== null ? <b style={{ width: `${score.percent}%` }} /> : null}
                        </div>
                      </div>
                    ))
                  : null}
              </div>
            </div>

            <div>
              <div className="section-head">
                <h3>Subscription</h3>
                <Link href="/subscription" className="link-btn">
                  Details →
                </Link>
              </div>
              <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                {subscriptionState.status === 'loading' ? <LoadingState label="Loading subscription" /> : null}
                {subscriptionState.status === 'error' ? <ErrorState error={subscriptionState.error} onRetry={subscriptionState.retry} /> : null}
                {subscriptionState.status === 'success' ? (
                  <>
                    <div className="checkrow" style={{ paddingTop: 0 }}>
                      <span style={{ color: 'var(--color-muted)' }}>Plan</span>
                      <span
                        className={`tag ${subscriptionState.data.status === 'ACTIVE' ? 'green' : subscriptionState.data.status === 'TRIAL' ? 'yellow' : 'red'}`}
                        style={{ marginLeft: 'auto' }}
                      >
                        {subscriptionState.data.planName}
                      </span>
                    </div>
                    <div className="usage-grid" style={{ marginTop: 'var(--space-4)' }}>
                      <div className="usage-meter">
                        <div className="usage-meter-head">
                          <span className="usage-label">Teachers</span>
                          <span className="usage-value">
                            {subscriptionState.data.teacherCount} of {subscriptionState.data.teacherLimit}
                          </span>
                        </div>
                        <div className="usage-meter-track">
                          <div
                            className={`usage-meter-fill${subscriptionState.data.teacherCount >= subscriptionState.data.teacherLimit ? ' over' : ''}`}
                            style={{
                              width: `${Math.min(100, (subscriptionState.data.teacherCount / Math.max(1, subscriptionState.data.teacherLimit)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="usage-meter">
                        <div className="usage-meter-head">
                          <span className="usage-label">Students</span>
                          <span className="usage-value">
                            {subscriptionState.data.studentCount} of {subscriptionState.data.studentLimit}
                          </span>
                        </div>
                        <div className="usage-meter-track">
                          <div
                            className={`usage-meter-fill${subscriptionState.data.studentCount >= subscriptionState.data.studentLimit ? ' over' : ''}`}
                            style={{
                              width: `${Math.min(100, (subscriptionState.data.studentCount / Math.max(1, subscriptionState.data.studentLimit)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="section-head">
                <h3><SparkleIcon style={{ marginRight: 6, verticalAlign: '-2px' }} />Leaderboard</h3>
                <Link href="/activity/leaderboard" className="link-btn">
                  View all →
                </Link>
              </div>
              <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                {leaderboardState.status === 'loading' ? <LoadingState label="Loading leaderboard" /> : null}
                {leaderboardState.status === 'error' ? <ErrorState error={leaderboardState.error} onRetry={leaderboardState.retry} /> : null}
                {leaderboardState.status === 'success' && leaderboardState.data.items.length === 0 ? (
                  <p>No leaderboard activity yet.</p>
                ) : null}
                {leaderboardState.status === 'success' ? (
                  <div className="panel-list">
                    {leaderboardState.data.items.map((entry) => (
                      <div key={entry.studentId} className="panel-list-row">
                        <div>
                          <div className="name">
                            #{entry.rank} {entry.displayName}
                          </div>
                          <div className="sub">{entry.classLabel}</div>
                        </div>
                        <span className="tag dark">{entry.points} pts</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="section-head">
                <h3><AlertIcon style={{ marginRight: 6, verticalAlign: '-2px' }} />Recent activity</h3>
                <Link href="/activity/audit-log" className="link-btn">
                  View all →
                </Link>
              </div>
              <div className="card">
                {auditState.status === 'loading' ? <LoadingState label="Loading activity" /> : null}
                {auditState.status === 'error' ? <ErrorState error={auditState.error} onRetry={auditState.retry} /> : null}
                {auditState.status === 'success' && auditState.data.items.length === 0 ? (
                  <p>No activity recorded yet.</p>
                ) : null}
                {auditState.status === 'success' ? (
                  <div className="panel-list">
                    {auditState.data.items.map((entry) => (
                      <div key={entry.id} className="panel-list-row">
                        <div>
                          <div className="name">{entry.actorName}</div>
                          <div className="sub">
                            {entry.action} · {entry.targetType}
                          </div>
                        </div>
                        <span className="sub">{relativeTime(entry.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="section-head" style={{ marginTop: 'var(--space-8)' }}>
            <h3><BookIcon style={{ marginRight: 6, verticalAlign: '-2px' }} />Recent voice tests</h3>
            <Link href="/activity/tests" className="link-btn">
              View all →
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {testsState.status === 'success' && testsState.data.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                      No tests yet.
                    </td>
                  </tr>
                ) : null}
                {testsState.status === 'success'
                  ? testsState.data.items.map((test) => (
                      <tr key={test.id}>
                        <td>{test.classLabel}</td>
                        <td>{test.subjectName}</td>
                        <td>{test.teacherName ?? '—'}</td>
                        <td>
                          <span className="tag yellow">{test.status}</span>
                        </td>
                        <td>
                          {test.completedCount}/{test.assignedCount}
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
