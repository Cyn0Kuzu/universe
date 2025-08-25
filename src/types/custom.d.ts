import 'react-native-paper';

// Global polyfills for Firebase Storage
declare global {
  var btoa: typeof import('base-64').encode;
  var atob: typeof import('base-64').decode;
  
  namespace ReactNativePaper {
    interface ThemeColors {
      secondaryBlue: string;
      darkBlue: string;
      lightGray: string;
      cardBorder: string;
      accent: string;
    }

    interface Theme {
      colors: ThemeColors;
    }
  }
}
