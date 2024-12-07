import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
});

const getThemeOptions = (mode: ThemeMode) => ({
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
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => 
    (localStorage.getItem('themeMode') as ThemeMode) || 'light'
  );

  const theme = React.useMemo(() => createTheme(getThemeOptions(mode)), [mode]);

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  // Apply theme class to document body
  useEffect(() => {
    document.body.className = mode;
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 