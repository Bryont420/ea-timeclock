/**
 * @fileoverview Login container component that provides a centered, styled container
 * for the login form. Features a semi-transparent paper background and responsive
 * sizing for optimal display across different screen sizes.
 */

import React, { memo } from 'react';
import { Container, Paper, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * Props interface for the LoginContainer component.
 */
interface LoginContainerProps {
    /** Child components to be rendered within the container */
    children: React.ReactNode;
}

/**
 * LoginContainer component that provides a styled wrapper for login content.
 * Features:
 * - Centered vertically and horizontally in viewport
 * - Semi-transparent white background
 * - Responsive width with maximum constraints
 * - Consistent padding and elevation
 * - Material-UI Paper component for card-like appearance
 * 
 * @param props - Component props
 * @param props.children - Child components to render within the container
 * @returns The login container component
 */
export const LoginContainer: React.FC<LoginContainerProps> = memo(({ children }) => {
    const theme = useTheme();

    return (
        <Container maxWidth="sm">
            <Box sx={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
            }}>
                <Paper 
                    elevation={3} 
                    sx={{ 
                        p: 4, 
                        width: '100%',
                        maxWidth: 400,
                        backgroundColor: theme.palette.mode === 'dark' 
                            ? 'rgba(66, 66, 66, 0.9)' 
                            : 'rgba(255, 255, 255, 0.9)',
                        color: theme.palette.text.primary
                    }}
                >
                    {children}
                </Paper>
            </Box>
        </Container>
    );
});
