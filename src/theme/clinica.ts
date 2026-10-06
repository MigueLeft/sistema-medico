import { createTheme } from '@mui/material/styles';

/** Tokens del diseño «Clínica» (los mismos valores que las variables CSS de `styles/clinica.css`). */
export const TOKENS = {
  surface: '#f5f7f9',
  surfaceRaised: '#ffffff',
  surfaceSunken: '#eceff3',
  line: '#e1e6ec',
  lineStrong: '#7a8696',
  ink: '#1d2430',
  inkMuted: '#526071',
  slate: '#3a4a5f',
  slateStrong: '#2b3747',
  slateSoft: '#e4e9f0',
  accent: '#1d6b67',
  accentSoft: '#dcecea',
  danger: '#b0281f',
  dangerStrong: '#8f1f18',
  dangerSoft: '#fbe3df',
  warning: '#875500',
  warningSoft: '#fbefd3',
  info: '#285c94',
  infoSoft: '#e2ecf7',
} as const;

const FUENTE = '"Figtree", "Segoe UI", system-ui, sans-serif';

/**
 * Tema de Material UI de las pantallas internas: reproduce el diseño «Clínica»
 * (controles de 34 px, radios de 8 px, etiquetas sobre el campo, paleta pizarra).
 * El tema de `theme/index.ts` sigue siendo el de `/setup` y `/login`.
 */
export const temaClinica = createTheme({
  palette: {
    primary: { main: TOKENS.slate, dark: TOKENS.slateStrong, light: TOKENS.slateSoft, contrastText: '#ffffff' },
    secondary: { main: TOKENS.accent, light: TOKENS.accentSoft, contrastText: '#ffffff' },
    error: { main: TOKENS.danger, dark: TOKENS.dangerStrong, light: TOKENS.dangerSoft, contrastText: '#ffffff' },
    warning: { main: TOKENS.warning, light: TOKENS.warningSoft },
    info: { main: TOKENS.info, light: TOKENS.infoSoft },
    text: { primary: TOKENS.ink, secondary: TOKENS.inkMuted },
    background: { default: TOKENS.surface, paper: TOKENS.surfaceRaised },
    divider: TOKENS.line,
    action: { hover: TOKENS.surfaceSunken, selected: TOKENS.slateSoft },
  },
  typography: {
    fontFamily: FUENTE,
    fontSize: 14,
    body1: { fontSize: 14, lineHeight: '20px' },
    body2: { fontSize: 13, lineHeight: '18px' },
    button: { textTransform: 'none', fontWeight: 600, fontSize: 14 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        sizeSmall: { height: 28, padding: '0 12px', fontSize: 13 },
        outlined: {
          borderColor: TOKENS.lineStrong,
          color: TOKENS.ink,
          backgroundColor: TOKENS.surfaceRaised,
          '&:hover': { borderColor: TOKENS.lineStrong, backgroundColor: TOKENS.surfaceSunken },
        },
        text: { color: TOKENS.slate, '&:hover': { backgroundColor: TOKENS.slateSoft } },
        // Iconos del diseño (svg sin tamaño propio), solos o junto al texto.
        root: { height: 34, padding: '0 16px', whiteSpace: 'nowrap', minWidth: 0, lineHeight: 1, '& svg': { width: 16, height: 16, flex: 'none' } },
        startIcon: { marginRight: 8 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 4, color: TOKENS.inkMuted, padding: 6, '&:hover': { backgroundColor: TOKENS.surfaceSunken, color: TOKENS.ink }, '& svg': { width: 16, height: 16 } },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: { fontSize: 12, lineHeight: '16px', fontWeight: 600, color: TOKENS.inkMuted, marginBottom: 6, '&.Mui-focused': { color: TOKENS.inkMuted }, '&.Mui-error': { color: TOKENS.inkMuted } },
        asterisk: { color: TOKENS.danger },
      },
    },
    MuiFormHelperText: { styleOverrides: { root: { margin: '6px 0 0', fontSize: 12, lineHeight: '16px', '&.Mui-error': { fontWeight: 600 } } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: TOKENS.surfaceRaised,
          fontSize: 14,
          lineHeight: '20px',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: TOKENS.lineStrong },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: TOKENS.slate },
          '&.Mui-disabled, &.Mui-readOnly': { backgroundColor: TOKENS.surfaceSunken },
          '&.Mui-disabled .MuiOutlinedInput-notchedOutline, &.Mui-readOnly .MuiOutlinedInput-notchedOutline': { borderStyle: 'dashed' },
        },
        input: { padding: '7px 12px', height: 20 },
        multiline: { padding: '8px 12px', '& textarea': { padding: 0, height: 'auto' } },
      },
    },
    MuiSelect: { styleOverrides: { select: { minHeight: 20 }, icon: { width: 14, height: 14, top: 'calc(50% - 7px)', right: 12, color: TOKENS.inkMuted } } },
    MuiMenuItem: { styleOverrides: { root: { fontSize: 14, minHeight: 32 } } },
    MuiCheckbox: { defaultProps: { size: 'small' }, styleOverrides: { root: { padding: 4, color: TOKENS.lineStrong } } },
    MuiFormControlLabel: { styleOverrides: { root: { marginLeft: -4, marginRight: 0, gap: 8 }, label: { fontSize: 14 } } },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: 13,
          height: 32,
          padding: '0 12px',
          color: TOKENS.ink,
          borderColor: TOKENS.lineStrong,
          backgroundColor: TOKENS.surfaceRaised,
          whiteSpace: 'nowrap',
          '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: TOKENS.slate, color: '#ffffff' },
        },
        sizeSmall: { height: 28, fontSize: 12, padding: '0 10px' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { height: 20, borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: TOKENS.surfaceSunken, color: TOKENS.inkMuted },
        label: { padding: '0 8px' },
        icon: { marginLeft: 8, marginRight: -4 },
      },
    },
    MuiPaper: { styleOverrides: { outlined: { borderColor: TOKENS.line, borderRadius: 10, boxShadow: '0 1px 2px rgba(29,36,48,0.06), 0 1px 1px rgba(29,36,48,0.04)' } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 12, maxWidth: 'calc(100% - 48px)' } } },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: 20, lineHeight: '28px', fontWeight: 700, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } } },
    MuiDialogContent: { styleOverrides: { root: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px', backgroundColor: TOKENS.surface, borderTop: `1px solid ${TOKENS.line}` } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: TOKENS.line, padding: '6px 12px', fontSize: 14, height: 40 },
        head: { backgroundColor: TOKENS.surfaceSunken, fontSize: 12, fontWeight: 600, color: TOKENS.inkMuted, height: 34, whiteSpace: 'nowrap' },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': { borderBottom: 0 },
          '&.MuiTableRow-hover:hover': { backgroundColor: TOKENS.surface },
          '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: TOKENS.slateSoft },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: 8, '&:hover': { backgroundColor: TOKENS.surfaceRaised }, '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: TOKENS.slateSoft, color: TOKENS.slate } },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          color: TOKENS.ink,
          fontSize: 14,
          padding: '6px 16px',
          '&.MuiAlert-colorInfo': { backgroundColor: TOKENS.infoSoft, '& .MuiAlert-icon, & .MuiAlertTitle-root': { color: TOKENS.info } },
          '&.MuiAlert-colorError': { backgroundColor: TOKENS.dangerSoft, '& .MuiAlert-icon, & .MuiAlertTitle-root': { color: TOKENS.danger } },
          '&.MuiAlert-colorWarning': { backgroundColor: TOKENS.warningSoft, '& .MuiAlert-icon, & .MuiAlertTitle-root': { color: TOKENS.warning } },
        },
        icon: { '& svg': { width: 18, height: 18 } },
      },
    },
    MuiAlertTitle: { styleOverrides: { root: { fontWeight: 700, fontSize: 14, marginBottom: 0 } } },
    MuiAutocomplete: { styleOverrides: { inputRoot: { padding: '0 12px !important', '& .MuiAutocomplete-input': { padding: '7px 0 !important' } }, paper: { boxShadow: '0 8px 24px rgba(29,36,48,0.12), 0 2px 6px rgba(29,36,48,0.08)', border: `1px solid ${TOKENS.line}` }, option: { '&.Mui-focused': { backgroundColor: `${TOKENS.slateSoft} !important` } } } },
    MuiLinearProgress: { styleOverrides: { root: { height: 4, borderRadius: 999, backgroundColor: TOKENS.surfaceSunken } } },
    MuiLink: { defaultProps: { underline: 'always' }, styleOverrides: { root: { color: TOKENS.slate, fontWeight: 600, fontSize: 13, textUnderlineOffset: 2, '&:hover': { color: TOKENS.slateStrong } } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44, minWidth: 0 } } },
  },
});
