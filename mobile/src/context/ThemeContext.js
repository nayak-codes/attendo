import React, { createContext, useContext, useState } from 'react';
import { DARK_COLORS, LIGHT_COLORS } from '../theme/colors';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('light'); // Default to 'light'

  const toggleTheme = () => {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const colors = themeMode === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      themeMode: 'light',
      toggleTheme: () => {},
      colors: LIGHT_COLORS,
    };
  }
  return context;
};
