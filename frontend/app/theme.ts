import { createTheme } from '@mui/material';
import { ChevronDown } from 'lucide-react';

export const colors = {
  accent: '#1F4FD6',
  accentSoft: '#EEF2FD',
  ground: '#F6F7F9',
  surface: '#FFFFFF',
  ink: '#101828',
  inkSoft: '#344054',
  muted: '#475467',
  subtle: '#667085',
  border: '#EAECF0',
  borderStrong: '#D0D5DD',
  rowDivider: '#F2F4F7',
  headerCell: '#FAFBFC',
  accentHover: '#163BA3',
  successSoft: '#ECFDF3',
  dotInactive: '#98A2B3',
  toast: '#1D2939',
  toastMuted: '#D0D5DD',
  toastError: '#FDA29B',
  toastSuccess: '#6CE9A6',
};

export const fonts = {
  sans: 'var(--font-plex-sans), system-ui, sans-serif',
  mono: 'var(--font-plex-mono), ui-monospace, monospace',
};

export const theme = createTheme({
  palette: {
    primary: { main: colors.accent },
    success: { main: '#12B76A', dark: '#05603A' },
    error: { main: '#D92D20', dark: '#B42318' },
    background: { default: colors.ground, paper: colors.surface },
    text: { primary: colors.ink, secondary: colors.muted },
    divider: colors.border,
  },
  typography: {
    fontFamily: fonts.sans,
    h1: { fontSize: 28, fontWeight: 600, letterSpacing: '-0.01em' },
    h2: { fontSize: 16, fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 40, paddingInline: 16 } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { outlined: { borderColor: colors.border, borderRadius: 12 } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: colors.surface },
        notchedOutline: { borderColor: colors.borderStrong },
      },
    },
    // One chevron for every select, vertically centred with room on the right.
    MuiSelect: {
      defaultProps: { IconComponent: ChevronDown },
      styleOverrides: {
        icon: { width: 16, height: 16, right: 12, top: 'calc(50% - 8px)', color: colors.subtle },
        select: { paddingRight: '40px !important' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: colors.rowDivider, fontSize: 14, paddingBlock: 14 },
        head: {
          fontSize: 12,
          fontWeight: 500,
          color: colors.muted,
          backgroundColor: colors.headerCell,
          borderColor: colors.border,
          paddingBlock: 10,
        },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 14 } },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontSize: 14, minHeight: 44 } },
    },
  },
});
