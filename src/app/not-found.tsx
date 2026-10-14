import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';

export default function NotFound() {
  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <BrandMark suffix="school" />
        </div>
        <h2>Page not found</h2>
        <p style={{ marginTop: 8, marginBottom: 20 }}>
          That page doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
        <Link href="/dashboard" className="btn dark" style={{ width: '100%' }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
