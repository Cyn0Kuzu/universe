import { DefaultTheme } from 'react-native-paper';

const universityBlue = '#0066B3';  // Ana mavi renk
const lighterBlue = '#3498db';     // Daha açık mavi
const darkBlue = '#003366';        // Koyu mavi
const accentOrange = '#FFA500';    // Vurgu için turuncu

// Universe uygulaması için özel tema
// Create the theme using DefaultTheme as a base
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: universityBlue,
    accent: accentOrange,
    background: '#f5f8fb',
    surface: '#ffffff',
    text: '#333333',
    error: '#E74C3C',
    disabled: '#BDBDBD',
    placeholder: '#95a5a6',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: accentOrange,
    onSurface: '#333333',
    // Özel renkler
    secondaryBlue: lighterBlue,
    darkBlue: darkBlue,
    lightGray: '#f0f3f5',
    cardBorder: '#e0e6ed',
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
  },
  roundness: 12,
};

export default theme;
