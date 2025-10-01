import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
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
  const indicatorColor = color || theme.colors.primary;

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={indicatorColor} />
      {message && (
        <Text style={[styles.message, { color: theme.colors.text }]}>
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

  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons 
        name={icon as any} 
        size={64} 
        color={theme.colors.placeholder}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.emptyDescription, { color: theme.colors.placeholder }]}>
          {description}
        </Text>
      )}
      {actionText && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.emptyAction, { color: theme.colors.primary }]}>
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

  return (
    <View style={styles.errorContainer}>
      <MaterialCommunityIcons 
        name="alert-circle-outline" 
        size={64} 
        color="#FF5722"
        style={styles.errorIcon}
      />
      <Text style={[styles.errorTitle, { color: "#FF5722" }]}>
        {title}
      </Text>
      <Text style={[styles.errorDescription, { color: theme.colors.placeholder }]}>
        {description}
      </Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry}>
          <Text style={[styles.retryButton, { color: theme.colors.primary, borderColor: theme.colors.primary }]}>
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
