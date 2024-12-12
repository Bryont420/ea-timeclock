import { PaletteOptions } from '@mui/material';

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
    text: {
      primary: string;
      secondary: string;
    };
    success: {
      light: string;
      main: string;
      dark: string;
      contrastText: string;
    };
    action: {
      hover: string;
    };
  };
}

// Predefined themes
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
        default: '#f5f5f5',
        paper: '#fff',
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
        default: '#303030',
        paper: '#424242',
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
        default: '#f1f8e9',
        paper: '#ffffff',
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
        default: '#263238',
        paper: '#37474f',
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
        default: '#fff3e0',
        paper: '#ffffff',
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
        default: '#303030',
        paper: '#424242',
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
        default: '#1b5e20',
        paper: '#004A00',
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
        default: '#fff8e1',
        paper: '#ffffff',
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
        default: '#f3e5f5',
        paper: '#ffffff',
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
        default: '#0d47a1',
        paper: '#1e88e5',
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
        default: '#fce4ec',
        paper: '#ffffff',
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
        default: '#4a0072',
        paper: '#6a1b9a',
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
