import React, { memo } from 'react';
import { useBackground } from '../contexts/BackgroundContext';
import { Box } from '@mui/material';

interface ResponsiveBackgroundProps {
    children: React.ReactNode;
}

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
