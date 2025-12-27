import { createTheme, responsiveFontSizes, alpha } from '@mui/material/styles';

// ============================================
// 1. SHARED CONFIGURATION
// ============================================

const shape = { borderRadius: 12 };

// Clean, standard breakpoints (removed redundant 'xs: 0')
const breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  },
};

const typography = {
  fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  h1: { fontWeight: 700, fontSize: '3rem', lineHeight: 1.1, letterSpacing: '-0.025em' },
  h2: { fontWeight: 600, fontSize: '2.25rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
  h3: { fontWeight: 600, fontSize: '1.75rem', lineHeight: 1.3, letterSpacing: '-0.015em' },
  h4: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.4 },
  h5: { fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.4 },
  h6: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.5 },
  subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
  subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 },
  body1: { fontSize: '1rem', lineHeight: 1.6 },
  body2: { fontSize: '0.875rem', lineHeight: 1.5 },
  caption: { fontSize: '0.75rem', lineHeight: 1.4, letterSpacing: '0.02em' },
  overline: { fontSize: '0.625rem', fontWeight: 600, lineHeight: 1.5, letterSpacing: '0.1em', textTransform: 'uppercase' },
  button: { textTransform: 'none', fontWeight: 500, fontSize: '0.875rem' },
};

// ============================================
// 2. PALETTE DEFINITIONS
// ============================================

const darkPalette = {
  mode: 'dark',
  primary: { main: '#F1F5F9', light: '#F8FAFC', dark: '#E2E8F0', contrastText: '#0F0F11' },
  secondary: { main: '#27272A', light: '#3F3F46', dark: '#18181B', contrastText: '#F1F5F9' },
  background: { default: '#0F0F11', paper: '#18181B' },
  text: { primary: '#F1F5F9', secondary: '#A1A1AA', disabled: '#52525B' },
  divider: '#27272A',
  action: {
    active: '#F1F5F9',
    hover: 'rgba(255, 255, 255, 0.06)',
    selected: 'rgba(255, 255, 255, 0.10)',
    disabled: 'rgba(255, 255, 255, 0.3)',
    disabledBackground: 'rgba(255, 255, 255, 0.12)',
  },
  // SEMANTIC COLORS: Improved UX with clear visual feedback
  success: { main: '#10B981', light: '#34D399', dark: '#059669', contrastText: '#FFFFFF' },
  error: { main: '#EF4444', light: '#F87171', dark: '#DC2626', contrastText: '#FFFFFF' },
  warning: { main: '#F59E0B', light: '#FBBF24', dark: '#D97706', contrastText: '#000000' },
  info: { main: '#3B82F6', light: '#60A5FA', dark: '#2563EB', contrastText: '#FFFFFF' },
};

const lightPalette = {
  mode: 'light',
  primary: { main: '#1E293B', light: '#334155', dark: '#0F172A', contrastText: '#FFFFFF' },
  secondary: { main: '#CBD5E1', light: '#E2E8F0', dark: '#94A3B8', contrastText: '#1E293B' },
  background: { default: '#F1F5F9', paper: '#F8FAFC' },
  text: { primary: '#1E293B', secondary: '#475569', disabled: '#94A3B8' },
  divider: '#CBD5E1',
  action: {
    active: '#0F172A',
    hover: 'rgba(0, 0, 0, 0.04)',
    selected: 'rgba(0, 0, 0, 0.08)', // FIXED: Was Blue
    disabled: 'rgba(15, 23, 42, 0.26)',
    disabledBackground: 'rgba(15, 23, 42, 0.12)',
  },
  // SEMANTIC COLORS: Improved UX with clear visual feedback
  success: { main: '#10B981', light: '#34D399', dark: '#059669', contrastText: '#FFFFFF' },  // Green - positive actions
  error: { main: '#EF4444', light: '#F87171', dark: '#DC2626', contrastText: '#FFFFFF' },    // Red - errors/warnings
  warning: { main: '#F59E0B', light: '#FBBF24', dark: '#D97706', contrastText: '#000000' },   // Amber - caution
  info: { main: '#3B82F6', light: '#60A5FA', dark: '#2563EB', contrastText: '#FFFFFF' },      // Blue - information/processing
};

// ============================================
// 3. COMPONENT OVERRIDES
// ============================================

const getComponentOverrides = (mode) => {
  const isDark = mode === 'dark';
  const borderColor = isDark ? '#1F1F1F' : '#E2E8F0';
  const paperBg = isDark ? '#0A0A0A' : '#FFFFFF';

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: isDark ? '#333 transparent' : '#CBD5E1 transparent',
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? '#333' : '#CBD5E1',
            borderRadius: 4,
          },
        },
      },
    },
    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          fontWeight: 600,
          textTransform: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: isDark ? '0 0 0 1px #333' : '0 1px 2px 0 rgba(0,0,0,0.05)',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: borderColor,
          '&:hover': {
            backgroundColor: isDark ? alpha('#FFFFFF', 0.05) : alpha('#000000', 0.05),
            borderColor: isDark ? '#FFFFFF' : '#000000',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', borderRadius: 16 },
        elevation1: {
            boxShadow: isDark ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            border: `1px solid ${borderColor}`,
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
            border: `1px solid ${borderColor}`,
            boxShadow: 'none',
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: paperBg,
          border: `1px solid ${borderColor}`,
          boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${borderColor}`,
          boxShadow: 'none',
        },
      },
    },
    // FORM ELEMENTS - FIXED FOR MONOCHROME
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
            '& fieldset': { borderColor: borderColor },
            '&:hover fieldset': { borderColor: isDark ? '#52525B' : '#94A3B8' },
            '&.Mui-focused fieldset': { borderColor: isDark ? '#FFFFFF' : '#000000', borderWidth: 2 },
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: isDark ? '#52525B' : '#94A3B8',
          '&.Mui-checked': { color: isDark ? '#FFFFFF' : '#000000' },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: isDark ? '#52525B' : '#94A3B8',
          '&.Mui-checked': { color: isDark ? '#FFFFFF' : '#000000' },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        thumb: { backgroundColor: isDark ? '#FFFFFF' : '#FFFFFF' },
        track: {
          backgroundColor: isDark ? '#3F3F46' : '#E2E8F0',
          opacity: 1,
        },
        switchBase: {
          '&.Mui-checked': {
            color: '#FFFFFF',
            '& + .MuiSwitch-track': {
              backgroundColor: isDark ? '#27272A' : '#000000',
              opacity: 1,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
        filled: {
          backgroundColor: isDark ? '#27272A' : '#F1F5F9',
          color: isDark ? '#EDEDED' : '#0F172A',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: isDark ? '#111111' : '#0F172A',
          borderRadius: 6,
          border: `1px solid ${borderColor}`,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          border: `1px solid ${borderColor}`,
          boxShadow: isDark ? '0 20px 25px -5px rgba(0, 0, 0, 0.4)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: '2px 6px',
          '&:hover': {
            backgroundColor: isDark ? '#27272A' : '#F1F5F9',
          },
          '&.Mui-selected': {
            backgroundColor: isDark ? '#27272A' : '#F1F5F9',
            '&:hover': { backgroundColor: isDark ? '#3F3F46' : '#E2E8F0' },
          },
        },
      },
    },
  };
};

// ============================================
// 4. THEME FACTORIES
// ============================================

export const createDarkTheme = () => {
  const theme = createTheme({
    breakpoints,
    shape,
    typography,
    palette: darkPalette,
    components: getComponentOverrides('dark'),
  });
  return responsiveFontSizes(theme);
};

export const createLightTheme = () => {
  const theme = createTheme({
    breakpoints,
    shape,
    typography,
    palette: lightPalette,
    components: getComponentOverrides('light'),
  });
  return responsiveFontSizes(theme);
};

export default createDarkTheme();