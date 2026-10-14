'use client';

import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRowId,
  type GridRowSelectionModel,
  type GridValidRowModel,
} from '@mui/x-data-grid';

/** DataGrid's selection model is include/exclude-relative, not a plain
 * id list - this resolves it against the current rows either way, so
 * callers (bulk delete/deactivate bars) can just work with an id array. */
export function selectedIdsFrom<T extends GridValidRowModel>(
  model: GridRowSelectionModel | undefined,
  rows: T[],
  getRowId: (row: T) => GridRowId,
): GridRowId[] {
  if (!model) return [];
  if (model.type === 'include') return Array.from(model.ids);
  return rows.map(getRowId).filter((id) => !model.ids.has(id));
}

export const EMPTY_SELECTION: GridRowSelectionModel = { type: 'include', ids: new Set() };

/**
 * Shared MUI DataGrid wrapper - every roster/activity table in the app
 * renders through this so sort/filter/search/column controls (all built
 * into DataGrid's own toolbar via `showToolbar`) and the brand styling
 * (card chrome, row height, empty/loading treatment) stay identical
 * everywhere instead of being re-implemented per page.
 *
 * Pagination is always rendered by DataGrid's own footer - never pair
 * this with a second, hand-rolled Prev/Next control next to it. Pages
 * backed by a paginated API (limit/offset) pass `server` + `rowCount` so
 * DataGrid's footer drives the real server-side page instead of only
 * paging over whatever one page of rows happens to be loaded.
 */
export function DataTable<T extends GridValidRowModel>({
  rows,
  columns,
  getRowId,
  loading = false,
  checkboxSelection = false,
  selectionModel,
  onSelectionModelChange,
  pageSize = 10,
  height,
  server,
  rowCount,
  paginationModel,
  onPaginationModelChange,
}: {
  rows: T[];
  columns: GridColDef<T>[];
  getRowId?: (row: T) => string;
  loading?: boolean;
  checkboxSelection?: boolean;
  selectionModel?: GridRowSelectionModel;
  onSelectionModelChange?: (model: GridRowSelectionModel) => void;
  pageSize?: number;
  height?: number;
  /** Server-side pagination mode - the rows prop is just the current page. */
  server?: boolean;
  rowCount?: number;
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
}) {
  return (
    <div className="table-wrap" style={{ padding: 0 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        loading={loading}
        showToolbar
        checkboxSelection={checkboxSelection}
        rowSelectionModel={selectionModel}
        onRowSelectionModelChange={onSelectionModelChange}
        disableRowSelectionOnClick
        {...(height ? { style: { height } } : { autoHeight: true })}
        rowHeight={56}
        columnHeaderHeight={44}
        {...(server
          ? {
              paginationMode: 'server' as const,
              rowCount: rowCount ?? 0,
              paginationModel,
              onPaginationModelChange,
            }
          : {
              initialState: { pagination: { paginationModel: { pageSize } } },
            })}
        // a server-paged table only holds one page - its own search box would miss the rest,
        // so those pages search on the server instead (SearchBox)
        slotProps={{ toolbar: { showQuickFilter: !server } }}
        pageSizeOptions={[10, 20, 25, 50, 100]}
        density="comfortable"
      />
    </div>
  );
}
