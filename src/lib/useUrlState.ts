'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { GridPaginationModel } from '@mui/x-data-grid';

/** A filter's onChange handler often fires two setters back to back (e.g.
 * question-bank's source select also resets pagination to page 0) - each
 * setter calling router.replace() independently races the other, since
 * Next.js doesn't update window.location.search synchronously, so the
 * second call's replace still builds its URL from the pre-change params
 * and clobbers the first change. Fix: every setter enqueues its key
 * change into one shared batch and a microtask flushes it as a single
 * router.replace, so calls made synchronously in the same handler always
 * merge instead of racing. */
let pendingBatch: { pathname: string; router: AppRouterInstance; ops: Map<string, string | null> } | null = null;

function enqueueUrlUpdate(pathname: string, router: AppRouterInstance, key: string, value: string | null) {
  if (!pendingBatch || pendingBatch.pathname !== pathname) {
    pendingBatch = { pathname, router, ops: new Map() };
    queueMicrotask(() => {
      const batch = pendingBatch;
      pendingBatch = null;
      if (!batch) return;
      const params = new URLSearchParams(window.location.search);
      for (const [k, v] of batch.ops) {
        if (v === null) params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      batch.router.replace(qs ? `${batch.pathname}?${qs}` : batch.pathname, { scroll: false });
    });
  }
  pendingBatch.ops.set(key, value);
}

/** Keeps one piece of filter/search state synced to a URL query param, so
 * a filtered/paginated view survives a refresh or gets shared as a link -
 * not a real navigation, so it never adds back-button noise. Falling back
 * to `defaultValue` also removes the param from the URL, keeping it clean
 * for the common case. */
export function useUrlParam(key: string, defaultValue: string): [string, (next: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      enqueueUrlUpdate(pathname, router, key, next === defaultValue || next === '' ? null : next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaultValue is a per-call constant, not reactive state.
    [router, pathname, key],
  );

  return [value, setValue];
}

/** Same idea as useUrlParam, specialized for a DataGrid `paginationModel` -
 * reads/writes `${prefix}page`/`${prefix}pageSize` so a page with more than
 * one grid (e.g. the Question bank page) can give each its own pair of
 * params instead of colliding. */
export function useUrlPaginationModel(
  defaultPageSize: number,
  prefix = '',
): [GridPaginationModel, (next: GridPaginationModel) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageKey = `${prefix}page`;
  const pageSizeKey = `${prefix}pageSize`;
  const rawPage = Number(searchParams.get(pageKey));
  const rawPageSize = Number(searchParams.get(pageSizeKey));
  const paginationModel: GridPaginationModel = {
    page: Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : 0,
    pageSize: Number.isInteger(rawPageSize) && rawPageSize > 0 ? rawPageSize : defaultPageSize,
  };

  const setPaginationModel = useCallback(
    (next: GridPaginationModel) => {
      enqueueUrlUpdate(pathname, router, pageKey, next.page === 0 ? null : String(next.page));
      enqueueUrlUpdate(pathname, router, pageSizeKey, next.pageSize === defaultPageSize ? null : String(next.pageSize));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaultPageSize/prefix are per-call constants, not reactive state.
    [router, pathname, pageKey, pageSizeKey],
  );

  return [paginationModel, setPaginationModel];
}
