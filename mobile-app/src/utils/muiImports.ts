// Core components that are used frequently and should be bundled immediately
export { default as CssBaseline } from '@mui/material/CssBaseline';
export { default as CircularProgress } from '@mui/material/CircularProgress';
export { default as Box } from '@mui/material/Box';
export { default as Typography } from '@mui/material/Typography';
export { default as Container } from '@mui/material/Container';

// Date picker components
export { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
export { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Lazy loaded components grouped by feature
export const FormComponents = {
  TextField: () => import('@mui/material/TextField').then(m => m.default),
  Select: () => import('@mui/material/Select').then(m => m.default),
  MenuItem: () => import('@mui/material/MenuItem').then(m => m.default),
  FormControl: () => import('@mui/material/FormControl').then(m => m.default),
  InputLabel: () => import('@mui/material/InputLabel').then(m => m.default),
  FormControlLabel: () => import('@mui/material/FormControlLabel').then(m => m.default),
  Checkbox: () => import('@mui/material/Checkbox').then(m => m.default),
};

export const DateComponents = {
  DateCalendar: () => import('@mui/x-date-pickers/DateCalendar').then(m => m.DateCalendar),
  DateField: () => import('@mui/x-date-pickers/DateField').then(m => m.DateField),
  DatePicker: () => import('@mui/x-date-pickers/DatePicker').then(m => m.DatePicker),
  TimePicker: () => import('@mui/x-date-pickers/TimePicker').then(m => m.TimePicker),
};

export const TableComponents = {
  Table: () => import('@mui/material/Table').then(m => m.default),
  TableBody: () => import('@mui/material/TableBody').then(m => m.default),
  TableCell: () => import('@mui/material/TableCell').then(m => m.default),
  TableContainer: () => import('@mui/material/TableContainer').then(m => m.default),
  TableHead: () => import('@mui/material/TableHead').then(m => m.default),
  TableRow: () => import('@mui/material/TableRow').then(m => m.default),
  TableFooter: () => import('@mui/material/TableFooter').then(m => m.default),
};

export const FeedbackComponents = {
  Alert: () => import('@mui/material/Alert').then(m => m.default),
  AlertTitle: () => import('@mui/material/AlertTitle').then(m => m.default),
  Snackbar: () => import('@mui/material/Snackbar').then(m => m.default),
  Dialog: () => import('@mui/material/Dialog').then(m => m.default),
  DialogTitle: () => import('@mui/material/DialogTitle').then(m => m.default),
  DialogContent: () => import('@mui/material/DialogContent').then(m => m.default),
  DialogActions: () => import('@mui/material/DialogActions').then(m => m.default),
  DialogContentText: () => import('@mui/material/DialogContentText').then(m => m.default),
};

export const LayoutComponents = {
  Card: () => import('@mui/material/Card').then(m => m.default),
  CardContent: () => import('@mui/material/CardContent').then(m => m.default),
  Divider: () => import('@mui/material/Divider').then(m => m.default),
  Grid: () => import('@mui/material/Grid').then(m => m.default),
  Paper: () => import('@mui/material/Paper').then(m => m.default),
  AppBar: () => import('@mui/material/AppBar').then(m => m.default),
  Toolbar: () => import('@mui/material/Toolbar').then(m => m.default),
};

export const NavigationComponents = {
  BottomNavigation: () => import('@mui/material/BottomNavigation').then(m => m.default),
  BottomNavigationAction: () => import('@mui/material/BottomNavigationAction').then(m => m.default),
};

export const ButtonComponents = {
  Button: () => import('@mui/material/Button').then(m => m.default),
  IconButton: () => import('@mui/material/IconButton').then(m => m.default),
};

export const DataDisplayComponents = {
  Chip: () => import('@mui/material/Chip').then(m => m.default),
};
