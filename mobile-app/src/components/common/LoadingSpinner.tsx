/**
 * @fileoverview Loading spinner component that provides a centered, consistent
 * loading indicator for use across the application. Uses Material-UI's
 * CircularProgress component with proper spacing and positioning.
 */

import React from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * LoadingSpinner component that displays a centered loading indicator.
 * Features:
 * - Centered both vertically and horizontally
 * - Minimum height to prevent layout shifts
 * - Material-UI CircularProgress for consistent styling
 * - No props required for simple usage
 * 
 * @example
 * ```tsx
 * // Use when loading data
 * {isLoading ? <LoadingSpinner /> : <Content />}
 * ```
 * 
 * @returns The loading spinner component
 */
export const LoadingSpinner: React.FC = () => {
    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="200px"
        >
            <CircularProgress />
        </Box>
    );
};
