'use client';

import { useState } from 'react';

import { Modal } from '@/components/Modal';
import { ErrorState, LoadingState } from '@/components/states';
import { useToast } from '@/components/Toast';
import { getSubscription, requestSubscriptionUpgrade } from '@/lib/api';
import { normalizeError } from '@/lib/errors';
import { useAsyncData } from '@/lib/useAsyncData';
import type { SubscriptionStatus } from '@/lib/types';

function statusTagVariant(status: SubscriptionStatus): string {
  if (status === 'ACTIVE') return 'green';
  if (status === 'TRIAL') return 'yellow';
  return 'red';
}

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const isUnlimited = limit === null;
  const pct = isUnlimited ? 0 : Math.min(100, limit === 0 ? 100 : (used / limit) * 100);
  const isOver = !isUnlimited && used >= limit;

  return (
    <div className="usage-meter">
      <div className="usage-meter-head">
        <span className="usage-label">{label}</span>
        <span className="usage-value">{isUnlimited ? `${used} · Unlimited` : `${used} of ${limit}`}</span>
      </div>
      <div className="usage-meter-track">
        {isUnlimited ? null : (
          <div className={`usage-meter-fill${isOver ? ' over' : ''}`} style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const state = useAsyncData('subscription', () => getSubscription());
  const { show } = useToast();

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestUpgrade(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await requestSubscriptionUpgrade({ message: message.trim() || undefined });
      show(
        result.emailed
          ? "Request sent - your account team will be in touch shortly."
          : "Request recorded - your account team will follow up.",
        'success',
      );
      setUpgradeOpen(false);
      setMessage('');
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Subscription</h1>
          <button type="button" className="btn yellow" onClick={() => setUpgradeOpen(true)}>
            Request an upgrade
          </button>
        </div>
        <p className="lead">
          Read-only - your plan is managed by noolAI. Need more seats or a higher tier? Request an
          upgrade and your account team will follow up.
        </p>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading subscription" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' ? (
        <>
          <div className="card" style={{ maxWidth: 420, marginBottom: 'var(--space-6)' }}>
            <div className="checkrow">
              <span style={{ color: 'var(--color-muted)' }}>Plan</span>
              <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{state.data.planName}</span>
            </div>
            <div className="checkrow">
              <span style={{ color: 'var(--color-muted)' }}>Status</span>
              <span className={`tag ${statusTagVariant(state.data.status)}`} style={{ marginLeft: 'auto' }}>
                {state.data.status}
              </span>
            </div>
            <div className="checkrow">
              <span style={{ color: 'var(--color-muted)' }}>Renews</span>
              <span style={{ marginLeft: 'auto', fontWeight: 600 }}>
                {new Date(state.data.renewsAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div className="card" style={{ maxWidth: 640 }}>
            <span className="eyebrow" style={{ marginBottom: 'var(--space-5)' }}>
              Plan usage
            </span>
            <div className="usage-grid">
              <UsageMeter label="Teachers" used={state.data.teacherCount} limit={state.data.teacherLimit} />
              <UsageMeter label="Students" used={state.data.studentCount} limit={state.data.studentLimit} />
              <UsageMeter label="Speak with Milo sessions" used={state.data.testCount} limit={state.data.testLimit} />
              <UsageMeter
                label="Question Papers"
                used={state.data.questionPaperCount}
                limit={state.data.questionPaperLimit}
              />
            </div>
          </div>
        </>
      ) : null}

      <Modal open={upgradeOpen} title="Request an upgrade" onClose={() => setUpgradeOpen(false)}>
        <form onSubmit={handleRequestUpgrade}>
          <p style={{ color: 'var(--color-muted)', marginBottom: 'var(--space-4)' }}>
            {state.status === 'success'
              ? `You're currently on the ${state.data.planName} plan. Tell us what you need and your account team will reach out.`
              : "Tell us what you need and your account team will reach out."}
          </p>
          <div className="form-row">
            <label htmlFor="upgrade-message">What do you need? (optional)</label>
            <textarea
              id="upgrade-message"
              className="field"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. need 50 more student seats, or a higher voice-test limit"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn white" onClick={() => setUpgradeOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn yellow" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
