import React from 'react';
import { Select, MenuItem, FormControl, SelectChangeEvent, Box, Typography } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import PaletteIcon from '@mui/icons-material/Palette';

const ThemeSelector: React.FC = () => {
  const { currentTheme, setTheme, availableThemes } = useTheme();

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
                    backgroundColor: theme.palette.secondary.main,
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
