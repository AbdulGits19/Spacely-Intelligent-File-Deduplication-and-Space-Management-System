import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('pristine_theme_mode');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('pristine_theme_mode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(() => {
    const isDark = mode === 'dark';

    return createTheme({
      palette: {
        mode,
        primary: {
          main: isDark ? '#E066A6' : '#C54B8C',
          light: '#F497C6',
          dark: '#9B316B',
          contrastText: '#F0FFF0',
        },
        secondary: {
          main: isDark ? '#74E39A' : '#2D6A4F',
          light: '#F0FFF0',
          dark: '#1B4332',
          contrastText: isDark ? '#0D1310' : '#F0FFF0',
        },
        background: {
          default: isDark ? '#0D1310' : '#F0FFF0',
          paper: isDark ? '#151E19' : '#FFFFFF',
        },
        text: {
          primary: isDark ? '#F0FFF0' : '#1B2A22',
          secondary: isDark ? '#9EB5A7' : '#52665A',
        },
        success: {
          main: isDark ? '#52B788' : '#2D6A4F',
        },
        warning: {
          main: '#F4A261',
        },
        error: {
          main: isDark ? '#FF6B8B' : '#D62851',
        },
        divider: isDark ? 'rgba(240, 255, 240, 0.08)' : 'rgba(197, 75, 140, 0.14)',
      },
      typography: {
        fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        h1: { fontFamily: '"Outfit", sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
        h2: { fontFamily: '"Outfit", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
        h3: { fontFamily: '"Outfit", sans-serif', fontWeight: 700, letterSpacing: '-0.01em' },
        h4: { fontFamily: '"Outfit", sans-serif', fontWeight: 700, letterSpacing: '-0.01em' },
        h5: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
        h6: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
        button: { fontFamily: '"Outfit", sans-serif', fontWeight: 600, textTransform: 'none', letterSpacing: '0.02em' },
      },
      shape: {
        borderRadius: 16,
      },
      components: {
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              border: isDark
                ? '1px solid rgba(240, 255, 240, 0.08)'
                : '1px solid rgba(197, 75, 140, 0.15)',
              boxShadow: isDark
                ? '0 10px 30px -10px rgba(0, 0, 0, 0.6)'
                : '0 10px 30px -10px rgba(197, 75, 140, 0.08)',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              padding: '8px 20px',
            },
            containedPrimary: {
              background: 'linear-gradient(135deg, #C54B8C 0%, #9B316B 100%)',
              color: '#F0FFF0',
              boxShadow: '0 4px 14px rgba(197, 75, 140, 0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #D45B9C 0%, #B0397A 100%)',
                boxShadow: '0 6px 20px rgba(197, 75, 140, 0.5)',
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              fontWeight: 600,
              borderRadius: 8,
            },
          },
        },
      },
    });
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