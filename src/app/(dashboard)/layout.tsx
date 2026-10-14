'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Footer } from '@/components/Footer';
import { PullToRefresh } from '@/components/PullToRefresh';
import { Sidebar, Topbar } from '@/components/Sidebar';
import { useAuth } from '@/lib/useAuth';
import { BrandMark } from '@/components/BrandMark';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status, profile, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'signedOut') {
      router.replace('/login');
    }
    if (status === 'authenticated' && profile?.mustChangePassword) {
      router.replace('/change-password');
    }
  }, [status, profile, router]);

  if (
    status === 'loading' ||
    status === 'resolvingProfile' ||
    status === 'signedOut' ||
    (status === 'authenticated' && profile?.mustChangePassword)
  ) {
    return (
      <div className="login-shell">
        <span className="spinner" aria-hidden="true" />
      </div>
    );
  }

  if (status === 'noProfile') {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-brand">
          <BrandMark suffix="school" />
        </div>
          <h2>We couldn’t find your profile</h2>
          <p style={{ marginTop: 8, marginBottom: 20 }}>
            Your account signed in successfully, but no School Admin profile is set up for it yet.
            Contact your platform administrator.
          </p>
          <button type="button" className="btn white" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  if (status === 'wrongRole') {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-brand">
          <BrandMark suffix="school" />
        </div>
          <h2>This account isn’t a School Admin</h2>
          <p style={{ marginTop: 8, marginBottom: 20 }}>
            {profile?.displayName ?? 'This account'} is signed in with the <b>{profile?.role}</b> role,
            which doesn’t have access to this console.
          </p>
          <button type="button" className="btn white" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <PullToRefresh>
      <div className="app-shell">
        <Sidebar />
        <div className="main">
          <Topbar />
          {children}
          <Footer />
        </div>
      </div>
    </PullToRefresh>
  );
}
