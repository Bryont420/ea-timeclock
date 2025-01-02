/**
 * @fileoverview Responsive background component that provides optimized background
 * images for different screen sizes and formats (webp/jpg). Handles proper image
 * loading and sizing for optimal performance and visual quality.
 */

import React, { memo } from 'react';
import { useBackground } from '../contexts/BackgroundContext';
import { Box } from '@mui/material';

/**
 * Props interface for the ResponsiveBackground component.
 */
interface ResponsiveBackgroundProps {
    /** Child components to be rendered on top of the background */
    children: React.ReactNode;
}

/**
 * ResponsiveBackground component that provides optimized background images.
 * Features:
 * - Responsive image loading based on screen size
 * - WebP format with JPEG fallback
 * - Proper image sizing and positioning
 * - Optimized performance with picture element
 * - Support for small, medium, and large screens
 * 
 * @param props - Component props
 * @param props.children - Child components to render over the background
 * @returns The responsive background component
 */
export const ResponsiveBackground: React.FC<ResponsiveBackgroundProps> = memo(({ children }) => {
    const { backgroundImage } = useBackground();

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: -1,
                '& > picture': {
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0
                },
                '& > picture > img': {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center'
                }
            }}
        >
            <picture>
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
                    alt=""
                    loading="lazy"
                    decoding="async"
                />
            </picture>
            {children}
        </Box>
    );
});

export default ResponsiveBackground;
