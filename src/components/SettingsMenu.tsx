import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Switch } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useTheme } from '@/contexts/ThemeContext';

interface SettingsMenuProps {
  anchorEl: null | HTMLElement;
  open: boolean;
  onClose: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ anchorEl, open, onClose }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <MenuItem onClick={toggleTheme}>
        <ListItemIcon>
          <DarkModeIcon />
        </ListItemIcon>
        <ListItemText>Dark Mode</ListItemText>
        <Switch
          edge="end"
          checked={theme === 'dark'}
          onChange={toggleTheme}
        />
      </MenuItem>
      {/* Other menu items */}
    </Menu>
  );
};

export default SettingsMenu; 