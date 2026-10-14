/** What a status means, in words - never the raw enum on screen. */
const LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RESULTS_PROCESSING: 'Scoring',
  RESULTS_READY: 'Results ready',
  COMPLETED: 'Completed',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  REVIEW: 'In review',
  GENERATING: 'Generating',
  FAILED: 'Failed',
  FINALIZED: 'Final',
  VALIDATION_FAILED: 'Needs a fix',
  preparing: 'Preparing',
  ready: 'Ready to open',
  failed: 'Failed',
  published: 'Open',
};

export function statusLabel(status: string): string {
  return LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}
