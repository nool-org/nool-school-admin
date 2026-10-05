'use client';

import { useEffect, useState } from 'react';
import { updatePassword } from 'firebase/auth';

import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';
import { ErrorState, LoadingState } from '@/components/states';
import { useToast } from '@/components/Toast';
import { getSchoolAdminMe, getSchoolLogo, updateSchoolAdminMe, updateSchoolLogo } from '@/lib/api';
import { getFirebaseAuth } from '@/lib/firebase';
import { normalizeError } from '@/lib/errors';
import { isPasswordValid } from '@/lib/passwordPolicy';
import { useAsyncData } from '@/lib/useAsyncData';

const MAX_LOGO_BYTES = 1_500_000;

function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const state = useAsyncData('me', () => getSchoolAdminMe());
  const logoState = useAsyncData('school-logo', () => getSchoolLogo());
  const { show } = useToast();

  const [logoBusy, setLogoBusy] = useState(false);

  async function handleLogoFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      show(`That image is too large (max ${Math.round(MAX_LOGO_BYTES / 1_000_000)}MB).`, 'error');
      return;
    }
    setLogoBusy(true);
    try {
      const dataUri = await readFileAsDataUri(file);
      await updateSchoolLogo(dataUri);
      if (logoState.status === 'success') logoState.refetch();
      show('Logo updated.', 'success');
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleLogoRemove() {
    setLogoBusy(true);
    try {
      await updateSchoolLogo(null);
      if (logoState.status === 'success') logoState.refetch();
      show('Logo removed.', 'success');
    } catch (cause) {
      show(normalizeError(cause).message, 'error');
    } finally {
      setLogoBusy(false);
    }
  }

  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === 'success') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initializing the editable draft from freshly-fetched data is the sync point this effect exists for.
      setDisplayName(state.data.displayName);
      setPhoneNumber(state.data.phoneNumber ?? '');
    }
  }, [state]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmitPassword = isPasswordValid(newPassword) && newPassword === confirmPassword && !passwordSubmitting;

  async function handleProfileSubmit(event: React.FormEvent) {
    event.preventDefault();
    setProfileSubmitting(true);
    setProfileError(null);
    try {
      await updateSchoolAdminMe({ displayName, phoneNumber: phoneNumber || undefined });
      show('Profile updated.', 'success');
      if (state.status === 'success') state.refetch();
    } catch (cause) {
      setProfileError(normalizeError(cause).message);
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmitPassword) return;
    setPasswordSubmitting(true);
    setPasswordError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        throw new Error('You are no longer signed in - please sign in again.');
      }
      // No backend "acknowledge" call needed here (unlike the forced
      // first-login flow at /change-password) - that call only clears
      // must_change_password, which is already false by the time someone
      // reaches this page proactively.
      await updatePassword(user, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      show('Password updated.', 'success');
    } catch (cause) {
      setPasswordError(normalizeError(cause).message);
    } finally {
      setPasswordSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-row">
          <h1>Settings</h1>
        </div>
        <p className="lead">Your own profile and sign-in details for this console.</p>
      </div>

      {state.status === 'loading' ? <LoadingState label="Loading your profile" /> : null}
      {state.status === 'error' ? <ErrorState error={state.error} onRetry={state.retry} /> : null}

      {state.status === 'success' ? (
        <div className="settings-grid">
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>Profile</h3>
            <p className="lead" style={{ marginBottom: 16 }}>{state.data.schoolName}</p>
            <form onSubmit={handleProfileSubmit}>
              <div className="form-row">
                <label htmlFor="settings-name">Name</label>
                <input
                  id="settings-name"
                  className="field"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="settings-email">Email</label>
                <input id="settings-email" className="field" value={state.data.email} disabled />
              </div>
              <div className="form-row">
                <label htmlFor="settings-phone">Phone (optional)</label>
                <input
                  id="settings-phone"
                  className="field"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              {profileError ? <p style={{ color: 'var(--color-red)' }}>{profileError}</p> : null}
              <button type="submit" className="btn dark" disabled={profileSubmitting} style={{ marginTop: 8 }}>
                {profileSubmitting ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 4 }}>Change password</h3>
            <p className="lead" style={{ marginBottom: 16 }}>
              Update the password you use to sign in to this console.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-row">
                <label htmlFor="settings-new-password">New password</label>
                <input
                  id="settings-new-password"
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
                <label htmlFor="settings-confirm-password">Confirm new password</label>
                <input
                  id="settings-confirm-password"
                  type="password"
                  className="field"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {mismatch ? <p style={{ color: 'var(--color-red)' }}>Passwords don&apos;t match.</p> : null}
              {passwordError ? <p style={{ color: 'var(--color-red)' }}>{passwordError}</p> : null}
              <button
                type="submit"
                className="btn dark"
                disabled={!canSubmitPassword}
                style={{ marginTop: 8 }}
              >
                {passwordSubmitting ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 4 }}>School logo</h3>
            <p className="lead" style={{ marginBottom: 16 }}>
              Shown wherever {state.data.schoolName}&apos;s identity appears across the platform.
            </p>
            {logoState.status === 'loading' ? <LoadingState label="Loading logo" /> : null}
            {logoState.status === 'error' ? <ErrorState error={logoState.error} onRetry={logoState.retry} /> : null}
            {logoState.status === 'success' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    border: '1px solid var(--color-line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {logoState.data.logoDataUri ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoState.data.logoDataUri}
                      alt={`${state.data.schoolName} logo`}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ color: 'var(--color-muted-2)', fontSize: 11 }}>No logo</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label className="btn white sm" style={{ cursor: 'pointer' }}>
                    {logoBusy ? 'Uploading…' : logoState.data.logoDataUri ? 'Replace' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileSelected}
                      disabled={logoBusy}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {logoState.data.logoDataUri ? (
                    <button
                      type="button"
                      className="btn white sm"
                      disabled={logoBusy}
                      onClick={() => void handleLogoRemove()}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
