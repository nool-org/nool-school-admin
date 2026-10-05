'use client';

import { useEffect, useState } from 'react';

import { ErrorState, LoadingState } from '@/components/states';
import { useToast } from '@/components/Toast';
import { getDefaultBloomDistribution, updateDefaultBloomDistribution } from '@/lib/api';
import { normalizeError } from '@/lib/errors';
import { useAsyncData } from '@/lib/useAsyncData';
import { BLOOM_LEVELS, type BloomDistribution, type BloomLevel } from '@/lib/types';

const LEVEL_LABEL: Record<BloomLevel, string> = {
  REMEMBER: 'Remember',
  UNDERSTAND: 'Understand',
  APPLY: 'Apply',
  ANALYZE: 'Analyze',
  EVALUATE: 'Evaluate',
  CREATE: 'Create',
};

// One hue (brand gold), darkening step by step - Bloom's levels are an
// ordered progression from simple recall to complex creation, so a
// sequential ramp encodes that order directly rather than six arbitrary
// categorical colors that would imply the levels are unrelated choices.
const LEVEL_COLOR: Record<BloomLevel, string> = {
  REMEMBER: '#FFC800',
  UNDERSTAND: '#D3A602',
  APPLY: '#A78404',
  ANALYZE: '#7B6206',
  EVALUATE: '#4F4008',
  CREATE: '#231E0A',
};

const FALLBACK_DISTRIBUTION: BloomDistribution = {
  REMEMBER: 20,
  UNDERSTAND: 20,
  APPLY: 20,
  ANALYZE: 20,
  EVALUATE: 10,
  CREATE: 10,
};

export default function QuestionDefaultsPage() {
  const state = useAsyncData('question-defaults', () => getDefaultBloomDistribution());
  const { show } = useToast();

  const [values, setValues] = useState<Record<BloomLevel, string>>({} as Record<BloomLevel, string>);
  const [hasOverride, setHasOverride] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const distribution = state.status === 'success' ? state.data.distribution : undefined;

  useEffect(() => {
    if (distribution === undefined) return;
    const source = distribution ?? FALLBACK_DISTRIBUTION;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initializing the editable draft from freshly-fetched data is the sync point this effect exists for.
    setHasOverride(distribution !== null);
    setValues(
      BLOOM_LEVELS.reduce(
        (acc, level) => ({ ...acc, [level]: String(source[level] ?? 0) }),
        {} as Record<BloomLevel, string>,
      ),
    );
  }, [distribution]);

  const sum = BLOOM_LEVELS.reduce((total, level) => total + (Number(values[level]) || 0), 0);
  const validSum = sum === 100;

  function handleChange(level: BloomLevel, value: string) {
    setValues((current) => ({ ...current, [level]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validSum) {
      setFormError(`Percentages must sum to 100 - currently ${sum}.`);
      return;
    }
    setSubmitting(true);
    try {
      const distribution: BloomDistribution = BLOOM_LEVELS.reduce(
        (acc, level) => ({ ...acc, [level]: Number(values[level]) || 0 }),
        {} as BloomDistribution,
      );
      await updateDefaultBloomDistribution(distribution);
      setHasOverride(true);
      show('Default question mix saved.', 'success');
    } catch (cause) {
      setFormError(normalizeError(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Question defaults</h1>
        </div>
        <p className="lead">
          The default Bloom&apos;s-taxonomy mix new Question Papers and Homework start from at this
          school, unless a teacher picks their own for a specific one.
        </p>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading question defaults" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' ? (
        <div className="card" style={{ maxWidth: 640 }}>
          <h3 style={{ marginBottom: 4 }}>Bloom&apos;s mix</h3>
          {!hasOverride ? (
            <p style={{ color: 'var(--color-muted)', marginBottom: 20 }}>
              No override set yet - teachers currently see the system default. Save one below to set a
              school-wide default.
            </p>
          ) : (
            <p style={{ marginBottom: 20 }}>Applies to every new Question Paper and Homework generated at this school.</p>
          )}
          <form onSubmit={handleSubmit}>
            {BLOOM_LEVELS.map((level) => (
              <div key={level} className="bloom-row">
                <div className="bloom-row-top">
                  <label htmlFor={`bloom-${level}`}>{LEVEL_LABEL[level]}</label>
                  <div className="bloom-row-input">
                    <input
                      id={`bloom-${level}`}
                      type="number"
                      min={0}
                      max={100}
                      className="field"
                      value={values[level] ?? ''}
                      onChange={(e) => handleChange(level, e.target.value)}
                    />
                    <span>%</span>
                  </div>
                </div>
                <div className="bloom-row-track">
                  <div
                    className="bloom-row-fill"
                    style={{
                      width: `${Math.min(100, Number(values[level]) || 0)}%`,
                      background: LEVEL_COLOR[level],
                    }}
                  />
                </div>
              </div>
            ))}

            <div className="checkrow" style={{ marginTop: 4 }}>
              <span style={{ color: 'var(--color-muted)' }}>Total</span>
              <span
                style={{ marginLeft: 'auto', fontWeight: 600, color: validSum ? undefined : 'var(--color-red)' }}
              >
                {sum}%
              </span>
            </div>

            {formError ? <p style={{ color: 'var(--color-red)', marginTop: 12 }}>{formError}</p> : null}

            <div className="modal-actions" style={{ paddingTop: 16 }}>
              <button type="submit" className="btn yellow" disabled={submitting || !validSum}>
                {submitting ? 'Saving…' : 'Save default mix'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
