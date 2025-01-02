/**
 * @fileoverview Theme selector component that allows users to switch between
 * different color themes in the application. Provides a visual preview of each
 * theme's primary and background colors.
 */

import React from 'react';
import { Select, MenuItem, FormControl, SelectChangeEvent, Box, Typography } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import PaletteIcon from '@mui/icons-material/Palette';

/**
 * ThemeSelector component that provides a dropdown menu for theme selection.
 * Features:
 * - Compact palette icon button that expands to show theme options
 * - Visual preview of each theme's colors
 * - Live theme switching
 * - Hover effects showing theme colors
 * - Support for multiple theme options
 * 
 * @returns The theme selector component
 */
const ThemeSelector: React.FC = () => {
  const { currentTheme, setTheme, availableThemes } = useTheme();

  /**
   * Handles theme selection change event.
   * 
   * @param event - The select change event
   */
  const handleChange = (event: SelectChangeEvent<string>) => {
    setTheme(event.target.value);
  };

  return (
    <Box>
      <FormControl variant="outlined" size="small" sx={{ minWidth: 60 }}>
        <Select
          value={currentTheme.id}
          onChange={handleChange}
          displayEmpty
          renderValue={() => <PaletteIcon />}
        >
          {availableThemes.map((theme) => (
            <MenuItem 
              key={theme.id} 
              value={theme.id}
              sx={{
                '&:hover': {
                  backgroundColor: theme.palette.background?.default,
                  color: theme.palette.text?.primary,
                },
              }}
            >
              <Box display="flex" alignItems="center">
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    backgroundColor: theme.palette.primary.main,
                    borderRadius: '50%',
                    marginRight: 1,
                  }}
                />
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    backgroundColor: theme.palette.background.default,
                    borderRadius: '50%',
                    marginRight: 1,
                  }}
                />
                <Typography>{theme.name}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default ThemeSelector;
