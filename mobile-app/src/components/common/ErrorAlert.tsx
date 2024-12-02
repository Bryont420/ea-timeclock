/**
 * @fileoverview Error alert component that provides a consistent way to display
 * error messages across the application. Uses Material-UI's Alert component
 * with error severity and proper spacing.
 */

import React from 'react';
import { Alert, AlertTitle } from '@mui/material';

/**
 * Props interface for the ErrorAlert component.
 */
interface ErrorAlertProps {
    /** Error message to display in the alert */
    message: string;
}

/**
 * ErrorAlert component that displays error messages in a styled alert box.
 * Features:
 * - Consistent error styling with Material-UI Alert
 * - "Error" title for clear message type
 * - Bottom margin for proper spacing
 * - Simple API with just a message prop
 * 
 * @param props - Component props
 * @param props.message - The error message to display
 * @returns The error alert component
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message }) => {
    return (
        <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {message}
        </Alert>
    );
};
