import React from 'react';
import { Box, CircularProgress } from '@mui/material';

interface LoadingOverlayProps {
    open: boolean;
}

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
