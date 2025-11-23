import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSearch?: (text: string) => void;
  onClear?: () => void;
  autoFocus?: boolean;
  showCancelButton?: boolean;
  onCancel?: () => void;
  style?: any;
  disabled?: boolean;
  loading?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Ara...',
  value,
  onChangeText,
  onSearch,
  onClear,
  autoFocus = false,
  showCancelButton = false,
  onCancel,
  style,
  disabled = false,
  loading = false,
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const animatedWidth = useRef(new Animated.Value(width - 40)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (showCancelButton) {
      Animated.timing(animatedWidth, {
        toValue: isFocused ? width - 120 : width - 40,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [isFocused, showCancelButton]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleClear = () => {
    onChangeText('');
    if (onClear) {
      onClear();
    }
    inputRef.current?.focus();
  };

  const handleCancel = () => {
    onChangeText('');
    setIsFocused(false);
    inputRef.current?.blur();
    if (onCancel) {
      onCancel();
    }
  };

  const handleSubmit = () => {
    if (onSearch && value.trim()) {
      onSearch(value.trim());
    }
    inputRef.current?.blur();
  };

  return (
    <View style={[styles.container, style]}>
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isFocused ? theme.colors.primary : '#E0E0E0',
            width: animatedWidth,
          }
        ]}
      >
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={isFocused ? theme.colors.primary : theme.colors.onSurface}
          style={styles.searchIcon}
        />
        
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            { 
              color: theme.colors.onSurface,
              flex: 1,
            }
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurface + '80'}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoFocus={autoFocus}
          editable={!disabled}
          selectTextOnFocus={true}
          clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
        />

        {loading && (
          <MaterialCommunityIcons
            name="loading"
            size={18}
            color={theme.colors.primary}
            style={styles.loadingIcon}
          />
        )}

        {value.length > 0 && !loading && Platform.OS === 'android' && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={18}
              color={theme.colors.onSurface + '80'}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {showCancelButton && isFocused && (
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.cancelButton}
        >
          <Text style={[styles.cancelText, { color: theme.colors.primary }]}>
            İptal
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  textInput: {
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 2 : 0,
  },
  loadingIcon: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 2,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SearchBar;
