'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';

import { Footer } from '@/components/Footer';
import { getFirebaseAuth } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';
import { BrandMark } from '@/components/BrandMark';

export default function LoginPage() {
  const { status, profile, error, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [mode, setMode] = useState<'signIn' | 'reset'>('signIn');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(profile?.mustChangePassword ? '/change-password' : '/dashboard');
    }
  }, [status, profile, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    try {
      await signIn(email, password);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Could not sign in.');
    }
  }

  function openReset() {
    setResetError(null);
    setResetSent(false);
    setMode('reset');
  }

  async function handleResetSubmit(event: React.FormEvent) {
    event.preventDefault();
    setResetSubmitting(true);
    setResetError(null);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      setResetSent(true);
    } catch (cause) {
      const code = (cause as { code?: string } | undefined)?.code;
      // "No such account" reports as success too - confirming which
      // emails exist is exactly what this message would otherwise leak.
      // A genuine failure (network, rate limit) still surfaces normally.
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setResetSent(true);
      } else if (code === 'auth/too-many-requests') {
        setResetError('Too many attempts. Try again in a few minutes.');
      } else {
        setResetError('Could not send the reset email. Check your connection and try again.');
      }
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-split">
        <aside className="login-hero" aria-hidden="true">
          <BrandMark suffix="school" size={34} />
          <p className="login-hero-line">School Admin console - everything your school runs on noolAI, in one place.</p>
          <ul className="login-hero-points">
            <li>Classes, teachers and students</li>
            <li>Progress across every subject</li>
            <li>Homework, papers and Speak with Milo</li>
          </ul>
        </aside>
        <div className="login-card">
        <div className="login-brand">
          <BrandMark suffix="school" />
        </div>

        {mode === 'signIn' ? (
          <>
            <h2 style={{ marginBottom: 4 }}>Sign in</h2>
            <p style={{ marginBottom: 24 }}>School Admin console.</p>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="field"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="field"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {submitError ? (
                <p style={{ color: 'var(--color-red)', marginBottom: 12 }}>{submitError}</p>
              ) : error ? (
                <p style={{ color: 'var(--color-red)', marginBottom: 12 }}>{error.message}</p>
              ) : null}

              <button
                type="submit"
                className="btn dark"
                style={{ width: '100%', marginTop: 8 }}
                disabled={status === 'signingIn'}
              >
                {status === 'signingIn' ? 'Signing in…' : 'Sign in'}
              </button>
              <button
                type="button"
                className="link-btn"
                style={{ marginTop: 16, justifyContent: 'center', width: '100%' }}
                onClick={openReset}
              >
                Forgot password?
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: 4 }}>Reset your password</h2>
            <p style={{ marginBottom: 24 }}>
              We&apos;ll email a reset link to your School Admin sign-in address.
            </p>

            {resetSent ? (
              <>
                <p style={{ marginBottom: 20 }}>
                  If an account exists for <b>{email}</b>, a reset link is on its way - check your inbox.
                </p>
                <button
                  type="button"
                  className="btn dark"
                  style={{ width: '100%' }}
                  onClick={() => setMode('signIn')}
                >
                  Back to sign in
                </button>
              </>
            ) : (
              <form onSubmit={handleResetSubmit}>
                <div className="form-row">
                  <label htmlFor="reset-email">Email</label>
                  <input
                    id="reset-email"
                    type="email"
                    className="field"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {resetError ? <p style={{ color: 'var(--color-red)', marginBottom: 12 }}>{resetError}</p> : null}

                <button type="submit" className="btn dark" style={{ width: '100%', marginTop: 8 }} disabled={resetSubmitting}>
                  {resetSubmitting ? 'Sending…' : 'Send reset link'}
                </button>
                <button
                  type="button"
                  className="link-btn"
                  style={{ marginTop: 16, justifyContent: 'center', width: '100%' }}
                  onClick={() => setMode('signIn')}
                >
                  Back to sign in
                </button>
              </form>
            )}
          </>
        )}
      </div>
      </div>
      <Footer />
    </div>
  );
}
