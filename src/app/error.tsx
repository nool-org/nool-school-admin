'use client';

import { useEffect } from 'react';
import { BrandMark } from '@/components/BrandMark';

/**
 * Catches any unhandled render/render-time error below the root layout -
 * without this, Next falls back to its own unbranded error screen (a
 * blank page in production). `reset` re-renders the segment that threw;
 * a hard reload is offered too since some errors (e.g. a stale JS chunk
 * after a deploy) won't clear just by re-rendering.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <BrandMark suffix="school" />
        </div>
        <h2>Something went wrong</h2>
        <p style={{ marginTop: 8, marginBottom: 20 }}>
          This page hit an unexpected error. Try again, or reload the page if it keeps happening.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn white" onClick={() => reset()}>
            Try again
          </button>
          <button type="button" className="btn dark" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
