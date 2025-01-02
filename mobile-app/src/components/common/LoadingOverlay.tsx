/**
 * @fileoverview Loading overlay component that provides a full-screen loading
 * indicator with a semi-transparent background. Designed to block user interaction
 * during application-wide loading states.
 */

import React from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * Props interface for the LoadingOverlay component.
 */
interface LoadingOverlayProps {
    /** Whether the loading overlay is visible */
    open: boolean;
}

/**
 * LoadingOverlay component that provides a full-screen loading indicator.
 * Features:
 * - Fixed positioning to cover entire viewport
 * - Semi-transparent dark background
 * - Centered loading spinner
 * - High z-index to appear above all other content
 * - Conditional rendering based on open state
 * 
 * @param props - Component props
 * @param props.open - Whether to show the loading overlay
 * @returns The loading overlay component
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ open }) => {
    if (!open) return null;
    
    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                // Use a very high z-index that's guaranteed to be above MUI's modal (1300)
                zIndex: 99999,
            }}
        >
            <CircularProgress 
                size={60}
                sx={{
                    color: '#fff',
                }}
            />
        </Box>
    );
};
