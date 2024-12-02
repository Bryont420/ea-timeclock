/**
 * @fileoverview Background manager component that handles the application's background
 * image display, including transitions and overlay effects. This component wraps
 * the entire application to provide consistent background styling.
 */

import React, { memo } from 'react';
import { Box } from '@mui/material';
import { useBackground } from '../contexts/BackgroundContext';

/**
 * Props interface for the BackgroundManager component.
 */
interface BackgroundManagerProps {
    /** Child components to be rendered on top of the background */
    children: React.ReactNode;
}

/**
 * BackgroundManager component that provides a dynamic background with overlay effects.
 * Features:
 * - Smooth background image transitions
 * - Semi-transparent white overlay for better content visibility
 * - Responsive background sizing and positioning
 * - Proper z-indexing for content layering
 * 
 * @param props - Component props
 * @param props.children - Child components to render over the background
 * @returns The background manager component with children
 */
export const BackgroundManager: React.FC<BackgroundManagerProps> = memo(({ children }) => {
    const { backgroundImage } = useBackground();

    return (
        <Box sx={{ position: 'relative', minHeight: '100vh' }}>
            {/* Background image container */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 0,
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        zIndex: 1,
                    }
                }}
            >
                <picture style={{ 
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    zIndex: 0 
                }}>
                    {/* Small screens */}
                    <source
                        srcSet={backgroundImage.small.webp}
                        type="image/webp"
                        media="(max-width: 600px)"
                    />
                    <source
                        srcSet={backgroundImage.small.jpg}
                        type="image/jpeg"
                        media="(max-width: 600px)"
                    />
                    
                    {/* Medium screens */}
                    <source
                        srcSet={backgroundImage.medium.webp}
                        type="image/webp"
                        media="(max-width: 1200px)"
                    />
                    <source
                        srcSet={backgroundImage.medium.jpg}
                        type="image/jpeg"
                        media="(max-width: 1200px)"
                    />
                    
                    {/* Large screens */}
                    <source
                        srcSet={backgroundImage.large.webp}
                        type="image/webp"
                    />
                    <source
                        srcSet={backgroundImage.large.jpg}
                        type="image/jpeg"
                    />
                    
                    {/* Fallback image */}
                    <img
                        src={backgroundImage.small.jpg}
                        alt="Background"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'opacity 0.3s ease-in-out'
                        }}
                        loading="lazy"
                        decoding="async"
                    />
                </picture>
            </Box>
            {/* Content container */}
            <Box sx={{ position: 'relative', zIndex: 1 }}>
                {children}
            </Box>
        </Box>
    );
});
