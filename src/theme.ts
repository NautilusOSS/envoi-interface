import { createTheme } from '@mui/material';

const getThemeOptions = (mode: 'light' | 'dark') => ({
  palette: {
    mode,
    primary: {
      main: '#8B5CF6',
      light: '#A78BFA',
      dark: '#7C3AED',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#6B7280',
      light: '#9CA3AF',
      dark: '#4B5563',
      contrastText: '#FFFFFF',
    },
    background: {
      default: mode === 'light' ? '#F9FAFB' : '#111827',
      paper: mode === 'light' ? '#FFFFFF' : '#1F2937',
    },
    text: {
      primary: mode === 'light' ? '#1F2937' : '#F9FAFB',
      secondary: mode === 'light' ? '#6B7280' : '#9CA3AF',
    },
    divider: mode === 'light' ? '#E5E7EB' : '#374151',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '100px',
          fontWeight: 500,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

const savedMode = localStorage.getItem('themeMode') as 'light' | 'dark' || 'light';
export const theme = createTheme(getThemeOptions(savedMode));

// Listen for theme changes
if (typeof window !== 'undefined') {
  window.addEventListener('storage', () => {
    const newMode = localStorage.getItem('themeMode') as 'light' | 'dark' || 'light';
    Object.assign(theme, createTheme(getThemeOptions(newMode)));
  });
}

// Export types for TypeScript support
export type ThemeColors = typeof theme.palette;
export type ThemeSpacing = typeof theme.spacing;
export type ThemeBorderRadius = typeof theme.shape.borderRadius;
