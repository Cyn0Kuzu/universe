import { Theme } from 'react-native-paper';

export interface CustomTheme extends Theme {
  colors: Theme['colors'] & {
    secondaryBlue: string;
    darkBlue: string;
    lightGray: string;
    cardBorder: string;
  };
}
