import { createTheme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';

/**
 * Mirrors the brand tokens in globals.css / nool-apps's
 * spec/design/assets/tokens.css - black + gold, warm off-white surfaces.
 * `primary` drives MUI's own interactive accents (checkboxes, switches,
 * selected DataGrid rows) so every MUI component reads as the same
 * two-tone brand as the plain-CSS pages, not a bolted-on default blue.
 */
const black = '#2B2B30';
const ink2 = '#374151';
const muted = '#5B6475';
const line = '#E2DBD0';
const lineSoft = '#EEEAE3';
const bg = '#F6EFE4';
const yellow = '#FFC800';
const yellowSoft = '#F4EAD2';
const yellowWash = '#FBF7F0';

export const muiTheme = createTheme({
  palette: {
    primary: { main: black, contrastText: '#fff' },
    warning: { main: yellow, dark: '#E6B400', light: yellowSoft, contrastText: black },
    error: { main: '#9C4429' },
    success: { main: '#5E7D57' },
    background: { default: bg, paper: '#FFFFFF' },
    text: { primary: '#1F2937', secondary: muted },
  },
  typography: {
    fontFamily: 'var(--font-brand), var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          fontSize: 13.5,
          '--DataGrid-rowBorderColor': lineSoft,
          // Column headers: warm off-white bg, small bold uppercase
          // labels, a crisp black rule underneath for structure - the
          // "premium admin table" signature this had been missing.
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: bg,
            borderBottom: `1px solid ${line}`,
          },
          '& .MuiDataGrid-columnHeader': {
            padding: '0 20px',
            outline: 'none !important',
          },
          '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
            outline: 'none',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: muted,
          },
          '& .MuiDataGrid-columnSeparator': {
            color: 'transparent',
          },
          '& .MuiDataGrid-iconButtonContainer button': {
            color: muted,
          },
          '& .MuiDataGrid-menuIconButton': {
            color: muted,
          },
          // Rows/cells - explicit flex + a reset line-height so custom
          // renderCell content (status tags, action icon rows) can't
          // inherit the cell's own text-centering line-height and blow up
          // in size (inline-flex elements pick up an inherited line-height
          // as a height contribution - bit us once already).
          '& .MuiDataGrid-cell': {
            display: 'flex',
            alignItems: 'center',
            lineHeight: 'normal',
            padding: '0 20px',
            outline: 'none !important',
          },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
            outline: 'none',
          },
          '& .MuiDataGrid-row': {
            transition: 'background-color 120ms ease',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: yellowWash,
          },
          '& .MuiDataGrid-row.Mui-selected': {
            backgroundColor: yellowSoft,
          },
          '& .MuiDataGrid-row.Mui-selected:hover': {
            backgroundColor: '#EFE3C4',
          },
          '& .MuiCheckbox-root': {
            color: '#D9D5C7',
          },
          '& .MuiCheckbox-root.Mui-checked, & .MuiCheckbox-root.MuiCheckbox-indeterminate': {
            color: black,
          },
          // Toolbar (search / columns / filter / density / export)
          '& .MuiDataGrid-toolbarContainer': {
            padding: '14px 20px',
            gap: 8,
            backgroundColor: '#fff',
            borderBottom: `1px solid ${line}`,
          },
          '& .MuiDataGrid-toolbarQuickFilter': {
            marginLeft: 'auto',
          },
          '& .MuiDataGrid-toolbarQuickFilter .MuiInputBase-root': {
            borderRadius: 10,
            backgroundColor: bg,
            border: `1px solid ${line}`,
            paddingLeft: 10,
            paddingRight: 10,
            fontSize: 13,
          },
          '& .MuiDataGrid-toolbarQuickFilter .MuiInputBase-root:before, & .MuiDataGrid-toolbarQuickFilter .MuiInputBase-root:after': {
            display: 'none',
          },
          '& .MuiDataGrid-toolbarQuickFilter .MuiInputBase-root.Mui-focused': {
            borderColor: black,
            boxShadow: `0 0 0 3px ${yellowSoft}`,
          },
          // Footer / pagination
          '& .MuiDataGrid-footerContainer': {
            borderTop: `1px solid ${line}`,
            minHeight: 52,
            padding: '0 12px',
          },
          '& .MuiTablePagination-root': {
            fontSize: 12.5,
            color: muted,
          },
          '& .MuiTablePagination-displayedRows': {
            fontWeight: 600,
            color: ink2,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: muted,
          borderRadius: 8,
          transition: 'background-color 120ms ease, color 120ms ease',
          '&:hover': {
            backgroundColor: 'rgba(11, 11, 11, 0.06)',
            color: black,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: black,
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.2px',
          padding: '6px 10px',
          borderRadius: 6,
        },
        arrow: {
          color: black,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': { color: black },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: black, opacity: 1 },
        },
      },
    },
  },
});
