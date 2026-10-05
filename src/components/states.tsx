/** The one loading indicator used everywhere - a table mid-fetch, a
 * card of stats, a detail page. A centered branded spinner reads as "this
 * region is loading" regardless of context, unlike the old left-aligned
 * skeleton bars, which looked like stray content rather than a state. */
export function LoadingState({ label }: { label: string }) {
  return (
    <div className="loading-state" role="status" aria-label={label}>
      <span className="spinner" aria-hidden="true" />
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  error,
  onRetry,
}: {
  title?: string;
  message?: string;
  /** The failure itself - its (server-provided) message is shown when no explicit `message` is given. */
  error?: { message?: string } | null;
  onRetry?: () => void;
}) {
  return (
    <div className="state-card error">
      <b>{title}</b>
      <p>{message ?? (error?.message || 'Please try again.')}</p>
      {onRetry ? (
        <button type="button" className="btn dark sm" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="state-card">
      <b>{title}</b>
      <p>{message}</p>
      {actionLabel && onAction ? (
        <button type="button" className="btn yellow sm" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
