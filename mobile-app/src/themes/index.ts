/**
 * @fileoverview Theme configuration for the application using Material-UI's theme system.
 * Provides a collection of predefined themes with consistent color palettes and styling.
 * Each theme includes color schemes for primary and secondary colors, background,
 * text, success states, and hover effects.
 */

import { PaletteOptions } from '@mui/material';

/**
 * Interface for theme configuration options.
 * Extends Material-UI's PaletteOptions to ensure type safety
 * and consistent theme structure across the application.
 */
export interface ThemeOption {
    /** Unique identifier for the theme */
    id: string;
    /** Display name of the theme */
    name: string;
    /** Color palette configuration */
    palette: PaletteOptions & {
        /** Primary color scheme */
        primary: {
            main: string;
        };
        /** Secondary color scheme */
        secondary: {
            main: string;
        };
        /** Theme mode (light/dark) */
        mode: 'light' | 'dark';
        /** Background colors */
        background: {
            default: string;
            paper: string;
        };
        /** Text colors */
        text: {
            primary: string;
            secondary: string;
        };
        /** Success state colors */
        success: {
            light: string;
            main: string;
            dark: string;
            contrastText: string;
        };
        /** Action colors */
        action: {
            hover: string;
        };
    };
}

/**
 * Collection of predefined themes available in the application.
 * Each theme provides a complete color palette and styling configuration:
 * 
 * Light Theme: Classic light mode with blue primary color
 * Dark Theme: Modern dark mode with light blue accents
 * Nature Theme: Earth-toned light theme with green primary color
 * Ocean Theme: Deep blue dark theme inspired by ocean depths
 * Sunrise Theme: Warm light theme with orange accents
 * Sunset Theme: Dark theme with warm orange/red colors
 * Lavender Theme: Soft purple light theme for a calm interface
 */
export const themes: ThemeOption[] = [
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
        default: '#f5f5f5DC',
        paper: '#ffffffDC',
      },
      text: {
        primary: '#000000',
        secondary: '#757575',
      },
      success: {
        light: '#81c784',
        main: '#4caf50',
        dark: '#388e3c',
        contrastText: '#ffffff',
      },
      action: {
        hover: 'rgba(0, 0, 0, 0.08)',
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
        default: '#303030DC',
        paper: '#424242DC',
      },
      text: {
        primary: '#ffffff',
        secondary: '#bdbdbd',
      },
      success: {
        light: '#66bb6a',
        main: '#43a047',
        dark: '#2e7d32',
        contrastText: '#ffffff',
      },
      action: {
        hover: 'rgba(255, 255, 255, 0.08)',
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
        default: '#f1f8e9DC',
        paper: '#ffffffDC',
      },
      text: {
        primary: '#000000',
        secondary: '#757575',
      },
      success: {
        light: '#81c784',
        main: '#4caf50',
        dark: '#388e3c',
        contrastText: '#ffffff',
      },
      action: {
        hover: 'rgba(0, 0, 0, 0.08)',
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
        default: '#263238DC',
        paper: '#37474fDC',
      },
      text: {
        primary: '#ffffff',
        secondary: '#bdbdbd',
      },
      success: {
        light: '#66bb6a',
        main: '#43a047',
        dark: '#2e7d32',
        contrastText: '#ffffff',
      },
      action: {
        hover: 'rgba(255, 255, 255, 0.08)',
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
        default: '#fff3e0DC',
        paper: '#ffffffDC',
      },
      text: {
        primary: '#000000',
        secondary: '#757575',
      },
      success: {
        light: '#81c784',
        main: '#4caf50',
        dark: '#388e3c',
        contrastText: '#ffffff',
      },
      action: {
        hover: 'rgba(0, 0, 0, 0.08)',
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
        default: '#303030DC',
        paper: '#424242DC',
      },
      text: {
        primary: '#ffffff',
        secondary: '#bdbdbd',
      },
      success: {
        light: '#66bb6a',
        main: '#43a047',
        dark: '#2e7d32',
        contrastText: '#ffffff',
      },
      action: {
        hover: 'rgba(255, 255, 255, 0.08)',
      },
    },
  },
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
        default: '#1b5e20DC',
        paper: '#004A00DC',
      },
      text: {
        primary: '#ffffff',
        secondary: '#bdbdbd',
      },
      success: {
        light: '#66bb6a',
        main: '#43a047',
        dark: '#2e7d32',
        contrastText: '#ffffff',
      },
      action: {
        hover: 'rgba(255, 255, 255, 0.08)',
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
        default: '#fff8e1DC',
        paper: '#ffffffDC',
      },
      text: {
        primary: '#000000',
        secondary: '#757575',
      },
      success: {
        light: '#81c784',
        main: '#4caf50',
        dark: '#388e3c',
        contrastText: '#ffffff',
      },
      action: {
        hover: 'rgba(0, 0, 0, 0.08)',
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
        default: '#f3e5f5DC',
        paper: '#ffffffDC',
      },
      text: {
        primary: '#000000',
        secondary: '#757575',
      },
      success: {
        light: '#81c784',
        main: '#4caf50',
        dark: '#388e3c',
        contrastText: '#ffffff',
      },
      action: {
        hover: 'rgba(0, 0, 0, 0.08)',
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
        default: '#0d47a1DC',
        paper: '#1e88e5DC',
      },
      text: {
        primary: '#ffffff',
        secondary: '#bdbdbd',
      },
      success: {
        light: '#66bb6a',
        main: '#43a047',
        dark: '#2e7d32',
        contrastText: '#ffffff',
      },
      action: {
        hover: 'rgba(255, 255, 255, 0.08)',
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
        default: '#fce4ecDC',
        paper: '#ffffffDC',
      },
      text: {
        primary: '#000000',
        secondary: '#757575',
      },
      success: {
        light: '#81c784',
        main: '#4caf50',
        dark: '#388e3c',
        contrastText: '#ffffff',
      },
      action: {
        hover: 'rgba(0, 0, 0, 0.08)',
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
        default: '#4a0072DC',
        paper: '#6a1b9aDC',
      },
      text: {
        primary: '#ffffff',
        secondary: '#bdbdbd',
      },
      success: {
        light: '#66bb6a',
        main: '#43a047',
        dark: '#2e7d32',
        contrastText: '#ffffff',
      },
      action: {
        hover: 'rgba(255, 255, 255, 0.08)',
      },
    },
  },
];
