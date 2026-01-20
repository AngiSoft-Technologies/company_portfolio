import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

export default function MuiThemeWrapper({ children }) {
  const myTheme =  localStorage.getItem("theme");

  const isDark = myTheme === 'dark';
  
  const theme = createTheme({ palette: { mode: isDark ? 'dark' : 'light' } });
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
} 