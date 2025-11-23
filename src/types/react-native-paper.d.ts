// React Native Paper Type Augmentation
// Fixes tvParallaxProperties errors in React Native Paper components
declare module 'react-native-paper' {
  import * as React from 'react';
  import { ComponentType, ReactNode } from 'react';
  
  export interface Theme {
    [key: string]: any;
  }
  
  export const DefaultTheme: Theme;
  
  export const Provider: ComponentType<any>;
  export const Text: ComponentType<any>;
  export const Chip: ComponentType<any>;
  export const Button: ComponentType<any>;
  export const useTheme: () => any;
  export const Portal: ComponentType<any>;
  export const Modal: ComponentType<any>;
  export const Surface: ComponentType<any>;
  export const IconButton: ComponentType<any>;
  export const Divider: ComponentType<any>;
  export const Badge: ComponentType<any>;
  export const TextInput: ComponentType<any> & {
    Icon: ComponentType<any>;
    Affix: ComponentType<any>;
  };
  export const ProgressBar: ComponentType<any>;
  export const ActivityIndicator: ComponentType<any>;
  export const Searchbar: ComponentType<any>;
  export const HelperText: ComponentType<any>;
  export const Dialog: ComponentType<any> & {
    Title: ComponentType<any>;
    Content: ComponentType<any>;
    Actions: ComponentType<any>;
  };
  export const Checkbox: ComponentType<any>;
  export const Menu: ComponentType<any> & {
    Item: ComponentType<any>;
  };
  export const Switch: ComponentType<any>;
  export const Snackbar: ComponentType<any>;
  export const List: ComponentType<any> & {
    Item: ComponentType<any>;
    Section: ComponentType<any>;
    Accordion: ComponentType<any>;
    Subheader: ComponentType<any>;
  };
  export const Icon: ComponentType<any>;
  
  // Card with sub-components - must be both ComponentType and have properties
  export interface CardProps {
    [key: string]: any;
  }
  
  export interface CardCoverProps {
    [key: string]: any;
  }
  
  export interface CardContentProps {
    [key: string]: any;
  }
  
  export const CardCover: ComponentType<CardCoverProps>;
  export const CardContent: ComponentType<CardContentProps>;
  
  export const Card: ComponentType<CardProps> & {
    Cover: ComponentType<CardCoverProps>;
    Content: ComponentType<CardContentProps>;
  };
  
  export const Appbar: ComponentType<any> & {
    Content: ComponentType<any>;
    Header: ComponentType<any>;
    BackAction: ComponentType<any>;
    Action: ComponentType<any>;
  };
  
  export const FAB: ComponentType<any>;
  
  export const Avatar: ComponentType<any> & {
    Image: ComponentType<any>;
    Icon: ComponentType<any>;
    Text: ComponentType<any>;
  };
  
  interface TextInputProps {
    tvParallaxProperties?: any;
    onTextInput?: any;
  }
  
  interface AppbarContentProps {
    tvParallaxProperties?: any;
  }
  
  interface DividerProps {
    tvParallaxProperties?: any;
  }
  
  interface FABProps {
    tvParallaxProperties?: any;
  }
}

// Expo Linear Gradient Type Fix
declare module 'expo-linear-gradient' {
  import { ComponentType } from 'react';
  
  export const LinearGradient: ComponentType<{
    colors: readonly [string, string, ...string[]] | string[];
    [key: string]: any;
  }>;
  
  export interface LinearGradientProps {
    colors: readonly [string, string, ...string[]] | string[];
    [key: string]: any;
  }
}
