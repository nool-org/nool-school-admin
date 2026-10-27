'use client';

import { passwordStrength, PASSWORD_REQUIREMENTS, unmetPasswordRequirements } from '@/lib/passwordPolicy';

const STRENGTH_COLOR: Record<string, string> = {
  empty: 'var(--color-line)',
  weak: 'var(--color-red)',
  fair: '#d97706',
  good: '#2563eb',
  strong: 'var(--color-green, #5e7d57)',
};

const STRENGTH_LABEL: Record<string, string> = {
  empty: '',
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

/** Shows live below a new-password field: a segmented strength bar plus
 * the still-unmet requirements, so the requirement list shrinks to
 * nothing exactly when the password becomes submittable. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  if (password.length === 0) return null;

  const { metCount, label } = passwordStrength(password);
  const unmet = unmetPasswordRequirements(password);
  const color = STRENGTH_COLOR[label];

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {PASSWORD_REQUIREMENTS.map((_req, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i < metCount ? color : 'var(--color-line)',
              transition: 'background 150ms ease',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
        <span style={{ color, fontWeight: 600 }}>{STRENGTH_LABEL[label]}</span>
      </div>
      {unmet.length > 0 ? (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
          {unmet.map((r) => (
            <li key={r.key}>{r.label}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
