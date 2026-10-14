'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { updatePassword } from 'firebase/auth';

import { Footer } from '@/components/Footer';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';
import { acknowledgePasswordChange } from '@/lib/api';
import { getFirebaseAuth } from '@/lib/firebase';
import { normalizeError } from '@/lib/errors';
import { isPasswordValid } from '@/lib/passwordPolicy';
import { useAuth } from '@/lib/useAuth';
import { BrandMark } from '@/components/BrandMark';

/**
 * Deliberately a top-level route, not nested under (dashboard)/ - that
 * layout redirects away from itself once profile.mustChangePassword is
 * true, which would loop against a change-password page living inside
 * it. This account is genuinely 'authenticated' already (mustChangePassword
 * is an account-level flag, not a distinct AuthStatus); see
 * src/app/(dashboard)/layout.tsx for the redirect into here.
 */
export default function ChangePasswordPage() {
  const { status, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && profile && !profile.mustChangePassword) {
      router.replace('/dashboard');
    }
    if (status === 'signedOut') {
      router.replace('/login');
    }
  }, [status, profile, router]);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit = isPasswordValid(newPassword) && newPassword === confirmPassword && !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        throw new Error('You are no longer signed in - please sign in again.');
      }
      await updatePassword(user, newPassword);
      await acknowledgePasswordChange();
      await refreshProfile();
      router.replace('/dashboard');
    } catch (cause) {
      setFormError(normalizeError(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <BrandMark suffix="school" />
        </div>
        <h2 style={{ marginBottom: 4 }}>Set a new password</h2>
        <p style={{ marginBottom: 24 }}>
          You signed in with a temporary password. Choose your own to continue.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              className="field"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <PasswordStrengthMeter password={newPassword} />
          <div className="form-row">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              className="field"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {mismatch ? (
            <p style={{ color: 'var(--color-red)', marginBottom: 12 }}>Passwords don&apos;t match.</p>
          ) : null}
          {formError ? <p style={{ color: 'var(--color-red)', marginBottom: 12 }}>{formError}</p> : null}

          <button
            type="submit"
            className="btn dark"
            style={{ width: '100%', marginTop: 8 }}
            disabled={!canSubmit}
          >
            {submitting ? 'Setting password…' : 'Set password and continue'}
          </button>
        </form>

        <button
          type="button"
          className="btn white"
          style={{ width: '100%', marginTop: 12 }}
          disabled={submitting}
          onClick={() => void signOut()}
        >
          Sign out instead
        </button>
      </div>
      <Footer />
    </div>
  );
}
