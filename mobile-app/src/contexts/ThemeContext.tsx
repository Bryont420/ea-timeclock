import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, PaletteOptions } from '@mui/material';
import { axiosInstance } from '../utils/axios';
import { useAuth } from './AuthContext';

export interface ThemeOption {
  id: string;
  name: string;
  palette: PaletteOptions & {
    primary: {
      main: string;
    };
    secondary: {
      main: string;
    };
    mode: 'light' | 'dark';
    background: {
      default: string;
      paper: string;
    };
  };
}

// Predefined themes
export const themes: ThemeOption[] = [
    // Existing themes...
    {
      id: 'light',
      name: 'Light',
      palette: {
        mode: 'light',
        primary: {
          main: '#1976d2',
        },
        secondary: {
          main: '#dc004e',
        },
        background: {
          default: '#f5f5f5',
          paper: '#fff',
        },
      },
    },
    {
      id: 'dark',
      name: 'Dark',
      palette: {
        mode: 'dark',
        primary: {
          main: '#90caf9',
        },
        secondary: {
          main: '#f48fb1',
        },
        background: {
          default: '#303030',
          paper: '#424242',
        },
      },
    },
    {
      id: 'nature',
      name: 'Nature',
      palette: {
        mode: 'light',
        primary: {
          main: '#2e7d32',
        },
        secondary: {
          main: '#ff8f00',
        },
        background: {
          default: '#f1f8e9',
          paper: '#ffffff',
        },
      },
    },
    {
      id: 'ocean',
      name: 'Ocean',
      palette: {
        mode: 'dark',
        primary: {
          main: '#0288d1',
        },
        secondary: {
          main: '#00acc1',
        },
        background: {
          default: '#263238',
          paper: '#37474f',
        },
      },
    },
    {
      id: 'sunrise',
      name: 'Sunrise',
      palette: {
        mode: 'light',
        primary: {
          main: '#ff7043',
        },
        secondary: {
          main: '#f57c00',
        },
        background: {
          default: '#fff3e0',
          paper: '#ffffff',
        },
      },
    },
    {
      id: 'sunset',
      name: 'Sunset',
      palette: {
        mode: 'dark',
        primary: {
          main: '#f57c00',
        },
        secondary: {
          main: '#ff7043',
        },
        background: {
          default: '#303030',
          paper: '#424242',
        },
      },
    },
    // New themes
    {
      id: 'forest',
      name: 'Forest',
      palette: {
        mode: 'dark',
        primary: {
          main: '#388e3c',
        },
        secondary: {
          main: '#8bc34a',
        },
        background: {
          default: '#1b5e20',
          paper: '#004A00',
        },
      },
    },
    {
      id: 'desert',
      name: 'Desert',
      palette: {
        mode: 'light',
        primary: {
          main: '#ffab00',
        },
        secondary: {
          main: '#f4511e',
        },
        background: {
          default: '#fff8e1',
          paper: '#ffffff',
        },
      },
    },
    {
      id: 'lavender',
      name: 'Lavender',
      palette: {
        mode: 'light',
        primary: {
          main: '#7b1fa2',
        },
        secondary: {
          main: '#ba68c8',
        },
        background: {
          default: '#f3e5f5',
          paper: '#ffffff',
        },
      },
    },
    {
      id: 'space',
      name: 'Space',
      palette: {
        mode: 'dark',
        primary: {
          main: '#1a237e',
        },
        secondary: {
          main: '#3949ab',
        },
        background: {
          default: '#0d47a1',
          paper: '#1e88e5',
        },
      },
    },
    {
      id: 'rose',
      name: 'Rose',
      palette: {
        mode: 'light',
        primary: {
          main: '#e91e63',
        },
        secondary: {
          main: '#f06292',
        },
        background: {
          default: '#fce4ec',
          paper: '#ffffff',
        },
      },
    },
    {
      id: 'berry',
      name: 'Berry',
      palette: {
        mode: 'dark',
        primary: {
          main: '#ad1457',
        },
        secondary: {
          main: '#d81b60',
        },
        background: {
          default: '#4a0072',
          paper: '#6a1b9a',
        },
      },
    },
  ];  

interface ThemeContextType {
  currentTheme: ThemeOption;
  setTheme: (themeId: string) => void;
  availableThemes: ThemeOption[];
  setHoverTheme: (theme: ThemeOption | null) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: themes[0],
  setTheme: () => {},
  availableThemes: themes,
  setHoverTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<ThemeOption>(() => {
    const savedThemeId = localStorage.getItem('themeId');
    return themes.find(theme => theme.id === savedThemeId) || themes[0];
  });
  const [hoverTheme, setHoverTheme] = useState<ThemeOption | null>(null);

  const applyTheme = hoverTheme || currentTheme;

  const setTheme = useCallback(async (themeId: string) => {
    const selectedTheme = themes.find(theme => theme.id === themeId);
    if (selectedTheme) {
      setCurrentTheme(selectedTheme);
      localStorage.setItem('themeId', themeId);

      try {
        // Save the selected theme to the user's profile
        await axiosInstance.post('/api/user/preferences/theme/update/', {
          themeId: themeId
        });
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  }, []);

  // Detect system theme
  useEffect(() => {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const systemThemeOption = themes.find(theme => theme.id === systemTheme);
    if (systemThemeOption && !isAuthenticated) {
      setCurrentTheme(systemThemeOption);
    }
  }, [isAuthenticated]);

  // Only fetch theme once when authenticated and user data is loaded
  useEffect(() => {
    let isMounted = true;
    
    if (isAuthenticated && user) {
      const fetchTheme = async () => {
        try {
          const response = await axiosInstance.get('/api/user/preferences/theme/');
          
          if (!isMounted) return;
          
          const userThemeId = response.data.themeId;
          const userTheme = themes.find(theme => theme.id === userThemeId);
          if (userTheme) {
            setCurrentTheme(userTheme);
            localStorage.setItem('themeId', userThemeId);
          }
        } catch (error) {
          // Silently handle error - will use default theme
        }
      };

      fetchTheme();
    }
    
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]); // Only run when auth state or user changes

  const theme = useMemo(() => createTheme({
    palette: applyTheme.palette,
    components: {
      MuiTypography: {
        defaultProps: {
          variantMapping: {
            h1: 'h1',
            h2: 'h2',
            h3: 'h3',
            h4: 'h4',
            h5: 'h5',
            h6: 'h6',
            subtitle1: 'h2',
            subtitle2: 'h2',
            body1: 'p',
            body2: 'p',
          },
        },
        styleOverrides: {
          root: {
            '&.app-header, &.login-header, &.employee-header': {
              backgroundColor: 'transparent'
            }
          },
          h1: {
            '&:not(.login-header):not(.app-header):not(.employee-header)': {
              backgroundColor: applyTheme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)',
              padding: '8px 16px',
              borderRadius: '4px',
            }
          },
          h2: {
            '&:not(.login-header):not(.app-header):not(.employee-header)': {
              backgroundColor: applyTheme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)',
              padding: '8px 16px',
              borderRadius: '4px',
            }
          },
          h3: {
            '&:not(.login-header):not(.app-header):not(.employee-header)': {
              backgroundColor: applyTheme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)',
              padding: '8px 16px',
              borderRadius: '4px',
            }
          },
          h4: {
            '&:not(.login-header):not(.app-header):not(.employee-header)': {
              backgroundColor: applyTheme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)',
              padding: '8px 16px',
              borderRadius: '4px',
            }
          },
          h5: {
            '&:not(.login-header):not(.app-header):not(.employee-header)': {
              backgroundColor: applyTheme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)',
              padding: '8px 16px',
              borderRadius: '4px',
            }
          },
        },
      },
    },
  }), [applyTheme]);

  const contextValue = useMemo(() => ({
    currentTheme,
    setTheme,
    availableThemes: themes,
    setHoverTheme,
  }), [currentTheme, setTheme, setHoverTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};