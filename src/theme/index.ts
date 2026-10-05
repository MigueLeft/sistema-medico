import { createTheme } from '@mui/material/styles';

const MONTSERRAT = '"Montserrat", "Helvetica", "Arial", sans-serif';
const SARABUN = '"Sarabun", "Helvetica", "Arial", sans-serif';

// Paleta del sistema médico
// #253237 — carbón azulado (sidebar / appbar / texto fuerte)
// #5c6b73 — gris pizarra (secundario / texto medio)
// #9db4c0 — azul grisáceo claro (bordes, hover, acentos)
// #c2dfe3 — celeste pálido (superficies suaves, chips)
// #e0fbfc — casi blanco con tinte celeste (fondo general)

export const theme = createTheme({
  palette: {
    primary: {
      main: '#253237',
      light: '#5c6b73',
      dark: '#182226',
      contrastText: '#e0fbfc',
    },
    secondary: {
      main: '#5c6b73',
      light: '#9db4c0',
      dark: '#3f4a4f',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f4fbfc',
      paper: '#ffffff',
    },
    text: {
      primary: '#253237',
      secondary: '#5c6b73',
    },
    divider: '#c2dfe3',
    action: {
      hover: 'rgba(157, 180, 192, 0.12)',
      selected: 'rgba(157, 180, 192, 0.24)',
    },
  },
  typography: {
    fontFamily: SARABUN,
    h1: { fontFamily: MONTSERRAT, fontSize: '2rem', fontWeight: 700, lineHeight: 1.25 },
    h2: { fontFamily: MONTSERRAT, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontFamily: MONTSERRAT, fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
    subtitle2: { fontFamily: MONTSERRAT, fontSize: '0.8125rem', fontWeight: 600 },
    body1: { fontFamily: SARABUN, fontSize: '1rem', fontWeight: 400 },
    body2: { fontFamily: SARABUN, fontSize: '0.875rem', fontWeight: 400 },
    caption: { fontFamily: SARABUN, fontSize: '0.75rem', fontWeight: 400 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontFamily: MONTSERRAT,
          borderRadius: 10,
          padding: '10px 22px',
        },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            backgroundColor: '#253237',
            '&:hover': { backgroundColor: '#182226' },
          },
        },
      ],
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', fullWidth: true },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontFamily: SARABUN,
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#5c6b73' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#253237' },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontFamily: SARABUN },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          border: '1px solid #c2dfe3',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: SARABUN, fontWeight: 600, fontSize: '0.75rem' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontFamily: MONTSERRAT,
            fontWeight: 700,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#e0fbfc',
            backgroundColor: '#253237',
            borderRight: '1px solid rgba(224, 251, 252, 0.15)',
            borderBottom: 'none',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#c2dfe3',
        },
      },
    },
  },
});
