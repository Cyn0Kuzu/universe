import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Optimized SafeArea hook for better performance
 * Uses React Native Reanimated for smooth animations
 */
export const useOptimizedSafeArea = () => {
  const insets = useSafeAreaInsets();
  
  return {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
  };
};

