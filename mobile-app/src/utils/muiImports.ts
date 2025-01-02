/**
 * @fileoverview Centralized Material-UI component imports with code splitting.
 * Organizes imports into logical groups and implements lazy loading for
 * optimal bundle size and performance. Core components are imported directly
 * while feature-specific components are lazy loaded.
 */

/**
 * Core components that are used frequently and should be bundled immediately.
 * These components are essential for the basic layout and loading states.
 */
export { default as CssBaseline } from '@mui/material/CssBaseline';
export { default as CircularProgress } from '@mui/material/CircularProgress';
export { default as Box } from '@mui/material/Box';
export { default as Typography } from '@mui/material/Typography';
export { default as Container } from '@mui/material/Container';

/**
 * Date picker provider components.
 * Required for any date/time related functionality.
 */
export { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
export { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

/**
 * Form-related components that are lazy loaded.
 * Used for input fields, selections, and form controls.
 */
export const FormComponents = {
  TextField: () => import('@mui/material/TextField').then(m => m.default),
  Select: () => import('@mui/material/Select').then(m => m.default),
  MenuItem: () => import('@mui/material/MenuItem').then(m => m.default),
  FormControl: () => import('@mui/material/FormControl').then(m => m.default),
  InputLabel: () => import('@mui/material/InputLabel').then(m => m.default),
  FormControlLabel: () => import('@mui/material/FormControlLabel').then(m => m.default),
  Checkbox: () => import('@mui/material/Checkbox').then(m => m.default),
};

/**
 * Date and time picker components that are lazy loaded.
 * Used for date selection, calendars, and time inputs.
 */
export const DateComponents = {
  DateCalendar: () => import('@mui/x-date-pickers/DateCalendar').then(m => m.DateCalendar),
  DateField: () => import('@mui/x-date-pickers/DateField').then(m => m.DateField),
  DatePicker: () => import('@mui/x-date-pickers/DatePicker').then(m => m.DatePicker),
  TimePicker: () => import('@mui/x-date-pickers/TimePicker').then(m => m.TimePicker),
};

/**
 * Table components that are lazy loaded.
 * Used for data display in tabular format.
 */
export const TableComponents = {
  Table: () => import('@mui/material/Table').then(m => m.default),
  TableBody: () => import('@mui/material/TableBody').then(m => m.default),
  TableCell: () => import('@mui/material/TableCell').then(m => m.default),
  TableContainer: () => import('@mui/material/TableContainer').then(m => m.default),
  TableHead: () => import('@mui/material/TableHead').then(m => m.default),
  TableRow: () => import('@mui/material/TableRow').then(m => m.default),
  TableFooter: () => import('@mui/material/TableFooter').then(m => m.default),
};

/**
 * Feedback components that are lazy loaded.
 * Used for user notifications and dialogs.
 */
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

/**
 * Layout components that are lazy loaded.
 * Used for structuring and organizing content.
 */
export const LayoutComponents = {
  Card: () => import('@mui/material/Card').then(m => m.default),
  CardContent: () => import('@mui/material/CardContent').then(m => m.default),
  Divider: () => import('@mui/material/Divider').then(m => m.default),
  Grid: () => import('@mui/material/Grid').then(m => m.default),
  Paper: () => import('@mui/material/Paper').then(m => m.default),
  AppBar: () => import('@mui/material/AppBar').then(m => m.default),
  Toolbar: () => import('@mui/material/Toolbar').then(m => m.default),
};

/**
 * Navigation components that are lazy loaded.
 * Used for navigating between pages and views.
 */
export const NavigationComponents = {
  BottomNavigation: () => import('@mui/material/BottomNavigation').then(m => m.default),
  BottomNavigationAction: () => import('@mui/material/BottomNavigationAction').then(m => m.default),
};

/**
 * Button components that are lazy loaded.
 * Used for user interactions and actions.
 */
export const ButtonComponents = {
  Button: () => import('@mui/material/Button').then(m => m.default),
  IconButton: () => import('@mui/material/IconButton').then(m => m.default),
};

/**
 * Data display components that are lazy loaded.
 * Used for displaying data in various formats.
 */
export const DataDisplayComponents = {
  Chip: () => import('@mui/material/Chip').then(m => m.default),
};
