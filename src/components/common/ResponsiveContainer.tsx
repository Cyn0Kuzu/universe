/**
 * Responsive Container Component
 * Ensures content fits properly on all device sizes with proper scrolling
 */

import React, { ReactNode } from 'react';
import { ScrollView, View, ViewStyle, ScrollViewProps, StyleSheet, RefreshControl } from 'react-native';
import { useDeviceLayout } from '../../utils/deviceLayoutUtils';
import { useResponsiveDesign } from '../../utils/responsiveDesignUtils';

interface ResponsiveContainerProps extends Omit<ScrollViewProps, 'children'> {
  children: ReactNode;
  scrollable?: boolean;
  containerStyle?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  keyboardAware?: boolean;
  bottomPadding?: number;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  scrollable = true,
  containerStyle,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  keyboardAware = false,
  bottomPadding,
  ...scrollViewProps
}) => {
  const deviceLayout = useDeviceLayout();
  const { spacing } = useResponsiveDesign();

  const safeBottomPadding = bottomPadding ?? (deviceLayout.navigationBar.height + spacing.md);

  const defaultContentContainerStyle: ViewStyle = {
    flexGrow: 1,
    paddingBottom: safeBottomPadding,
    paddingHorizontal: spacing.md,
  };

  const mergedContentContainerStyle: ViewStyle = {
    ...defaultContentContainerStyle,
    ...contentContainerStyle,
  };

  if (!scrollable) {
    return (
      <View style={[styles.container, containerStyle]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, containerStyle]}
      contentContainerStyle={mergedContentContainerStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        ) : undefined
      }
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});

export default ResponsiveContainer;



































