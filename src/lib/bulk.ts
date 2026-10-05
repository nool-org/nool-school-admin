import type { GridRowId } from '@mui/x-data-grid';

import { normalizeError } from './errors';

/**
 * Runs one request per selected row with Promise.allSettled - a single
 * failure no longer hides the rows that did succeed. Returns the ids that
 * failed (to keep them selected) and a one-line summary for a toast, e.g.
 * "3 students deleted. 1 failed - Asha: Student has test results."
 */
export async function runBulk(
  ids: GridRowId[],
  run: (id: string) => Promise<unknown>,
  opts: { noun: string; verb: string; label: (id: string) => string },
): Promise<{ failedIds: GridRowId[]; summary: string }> {
  const results = await Promise.allSettled(ids.map((id) => run(String(id))));
  const failures = ids.flatMap((id, i) => {
    const result = results[i];
    return result.status === 'rejected'
      ? [{ id, text: `${opts.label(String(id))}: ${normalizeError(result.reason).message}` }]
      : [];
  });
  const okCount = ids.length - failures.length;
  const plural = (n: number) => `${n} ${opts.noun}${n === 1 ? '' : 's'}`;
  const parts = [];
  if (okCount > 0) parts.push(`${plural(okCount)} ${opts.verb}.`);
  if (failures.length > 0) parts.push(`${failures.length} failed - ${failures.map((f) => f.text).join('; ')}`);
  return { failedIds: failures.map((f) => f.id), summary: parts.join(' ') };
}
