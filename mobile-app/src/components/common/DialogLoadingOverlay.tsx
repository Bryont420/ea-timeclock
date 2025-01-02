/**
 * @fileoverview Dialog loading overlay component that displays a loading spinner
 * with a semi-transparent background, specifically designed for use within
 * Material-UI Dialog components.
 */

import React from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * Props interface for the DialogLoadingOverlay component.
 */
interface DialogLoadingOverlayProps {
    /** Whether the loading overlay is visible */
    open: boolean;
}

/**
 * DialogLoadingOverlay component that provides a loading indicator for dialogs.
 * Features:
 * - Semi-transparent dark background
 * - Centered loading spinner
 * - Proper z-index handling for dialog context
 * - Conditional rendering based on open state
 * 
 * @param props - Component props
 * @param props.open - Whether to show the loading overlay
 * @returns The dialog loading overlay component
 */
export const DialogLoadingOverlay: React.FC<DialogLoadingOverlayProps> = ({ open }) => {
    if (!open) return null;
    
    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                // This will be relative to the Dialog's z-index
                zIndex: 1,
            }}
        >
            <CircularProgress 
                size={40}
                sx={{
                    color: '#fff',
                }}
            />
        </Box>
    );
};
