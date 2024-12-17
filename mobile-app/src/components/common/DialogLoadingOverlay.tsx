import React from 'react';
import { Box, CircularProgress } from '@mui/material';

interface DialogLoadingOverlayProps {
    open: boolean;
}

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
