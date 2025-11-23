import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator as RNActivityIndicator } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Yükleniyor...', 
  size = 'large',
  color 
}) => {
  const theme = useTheme();
  // CRITICAL: Ensure color fallback for visibility
  const indicatorColor = color || theme.colors?.primary || '#0066B3';
  const textColor = theme.colors?.text || '#1F2937';

  return (
    <View style={styles.container}>
      <RNActivityIndicator size={size} color={indicatorColor} />
      {message && (
        <Text style={[styles.message, { color: textColor }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox-outline',
  title,
  description,
  actionText,
  onAction
}) => {
  const theme = useTheme();
  // CRITICAL: Ensure color fallback for icon visibility
  const iconColor = theme.colors?.placeholder || '#9CA3AF';
  const textColor = theme.colors?.text || '#1F2937';
  const primaryColor = theme.colors?.primary || '#0066B3';

  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons 
        name={icon as any} 
        size={64} 
        color={iconColor}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: textColor }]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.emptyDescription, { color: iconColor }]}>
          {description}
        </Text>
      )}
      {actionText && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.emptyAction, { color: primaryColor }]}>
            {actionText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryText?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Bir hata oluştu',
  description = 'Lütfen tekrar deneyin',
  onRetry,
  retryText = 'Tekrar Dene'
}) => {
  const theme = useTheme();
  // CRITICAL: Ensure color fallback for visibility
  const errorColor = '#FF5722';
  const placeholderColor = theme.colors?.placeholder || '#9CA3AF';
  const primaryColor = theme.colors?.primary || '#0066B3';

  return (
    <View style={styles.errorContainer}>
      <MaterialCommunityIcons 
        name="alert-circle-outline" 
        size={64} 
        color={errorColor}
        style={styles.errorIcon}
      />
      <Text style={[styles.errorTitle, { color: errorColor }]}>
        {title}
      </Text>
      <Text style={[styles.errorDescription, { color: placeholderColor }]}>
        {description}
      </Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry}>
          <Text style={[styles.retryButton, { color: primaryColor, borderColor: primaryColor }]}>
            {retryText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyDescription: {
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
    lineHeight: 20,
    fontSize: 14,
  },
  emptyAction: {
    textDecorationLine: 'underline',
    padding: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorDescription: {
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
    lineHeight: 20,
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
