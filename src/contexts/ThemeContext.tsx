import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { toggleTheme } from '../store/themeSlice';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
  theme: createTheme(),
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const isDarkTheme = useSelector((state: RootState) => state.theme.isDarkTheme);
  
  // Derive mode from Redux state
  const mode: ThemeMode = isDarkTheme ? 'dark' : 'light';

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#8B5CF6',
            light: '#A78BFA',
            dark: '#7C3AED',
          },
          secondary: {
            main: '#6B7280',
            light: '#9CA3AF',
            dark: '#4B5563',
          },
        },
      }),
    [mode]
  );

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  // Apply theme class to document body
  useEffect(() => {
    document.body.className = mode;
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme: handleToggleTheme, theme }}>
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
