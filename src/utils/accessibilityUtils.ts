/**
 * Accessibility Utilities
 * Comprehensive accessibility helpers for better user experience
 */

import { Platform } from 'react-native';

export class AccessibilityUtils {
  /**
   * Get accessibility props for interactive elements
   */
  static getInteractiveProps(label: string, hint?: string, role: string = 'button') {
    return {
      accessibilityRole: role,
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityState: {
        disabled: false,
      },
    };
  }

  /**
   * Get accessibility props for disabled elements
   */
  static getDisabledProps(label: string, hint?: string, role: string = 'button') {
    return {
      accessibilityRole: role,
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityState: {
        disabled: true,
      },
    };
  }

  /**
   * Get accessibility props for images
   */
  static getImageProps(altText: string, isDecorative: boolean = false) {
    return {
      accessibilityRole: 'image',
      accessibilityLabel: isDecorative ? undefined : altText,
      accessibilityElementsHidden: isDecorative,
    };
  }

  /**
   * Get accessibility props for text inputs
   */
  static getInputProps(label: string, hint?: string, required: boolean = false) {
    return {
      accessibilityRole: 'text',
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityRequired: required,
    };
  }

  /**
   * Get accessibility props for lists
   */
  static getListProps(itemCount: number, label?: string) {
    return {
      accessibilityRole: 'list',
      accessibilityLabel: label || `${itemCount} öğe`,
      accessibilityHint: 'Liste öğeleri',
    };
  }

  /**
   * Get accessibility props for list items
   */
  static getListItemProps(index: number, total: number, label: string) {
    return {
      accessibilityRole: 'text',
      accessibilityLabel: label,
      accessibilityHint: `${index + 1} / ${total}`,
    };
  }

  /**
   * Check if device supports accessibility features
   */
  static isAccessibilityEnabled(): boolean {
    // This would need to be implemented with native modules
    // For now, return true to ensure accessibility is always considered
    return true;
  }

  /**
   * Get appropriate touch target size
   */
  static getTouchTargetSize(): number {
    // Minimum touch target size should be 44x44 points
    return Platform.OS === 'ios' ? 44 : 48;
  }

  /**
   * Get high contrast color adjustments
   */
  static getHighContrastColors() {
    return {
      primary: '#000000',
      secondary: '#FFFFFF',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: '#000000',
      onSurface: '#000000',
    };
  }

  /**
   * Get accessibility-friendly font sizes
   */
  static getAccessibleFontSizes() {
    return {
      small: 16,    // Minimum readable size
      medium: 18,   // Comfortable reading size
      large: 20,    // Large text size
      extraLarge: 24, // Extra large text size
    };
  }
}

export default AccessibilityUtils;







