/**
 * Device Testing Utilities
 * Comprehensive testing utilities for all device layouts
 */

import { Dimensions, Platform } from 'react-native';
import { getDeviceLayoutConfig } from './deviceLayoutUtils';

export interface DeviceTestConfig {
  name: string;
  width: number;
  height: number;
  platform: 'ios' | 'android';
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  description: string;
}

/**
 * Predefined device configurations for testing
 */
export const DEVICE_TEST_CONFIGS: DeviceTestConfig[] = [
  // iPhone configurations
  {
    name: 'iPhone SE (1st gen)',
    width: 320,
    height: 568,
    platform: 'ios',
    safeAreaInsets: { top: 20, bottom: 0, left: 0, right: 0 },
    description: 'Small iPhone with no notch',
  },
  {
    name: 'iPhone 8',
    width: 375,
    height: 667,
    platform: 'ios',
    safeAreaInsets: { top: 20, bottom: 0, left: 0, right: 0 },
    description: 'Standard iPhone with no notch',
  },
  {
    name: 'iPhone 8 Plus',
    width: 414,
    height: 736,
    platform: 'ios',
    safeAreaInsets: { top: 20, bottom: 0, left: 0, right: 0 },
    description: 'Large iPhone with no notch',
  },
  {
    name: 'iPhone X',
    width: 375,
    height: 812,
    platform: 'ios',
    safeAreaInsets: { top: 44, bottom: 34, left: 0, right: 0 },
    description: 'iPhone with notch and home indicator',
  },
  {
    name: 'iPhone XR',
    width: 414,
    height: 896,
    platform: 'ios',
    safeAreaInsets: { top: 44, bottom: 34, left: 0, right: 0 },
    description: 'Large iPhone with notch and home indicator',
  },
  {
    name: 'iPhone 12 mini',
    width: 360,
    height: 780,
    platform: 'ios',
    safeAreaInsets: { top: 50, bottom: 34, left: 0, right: 0 },
    description: 'Small iPhone with Dynamic Island',
  },
  {
    name: 'iPhone 12',
    width: 390,
    height: 844,
    platform: 'ios',
    safeAreaInsets: { top: 50, bottom: 34, left: 0, right: 0 },
    description: 'Standard iPhone with Dynamic Island',
  },
  {
    name: 'iPhone 12 Pro Max',
    width: 428,
    height: 926,
    platform: 'ios',
    safeAreaInsets: { top: 50, bottom: 34, left: 0, right: 0 },
    description: 'Large iPhone with Dynamic Island',
  },
  
  // Android configurations
  {
    name: 'Android Small',
    width: 360,
    height: 640,
    platform: 'android',
    safeAreaInsets: { top: 24, bottom: 0, left: 0, right: 0 },
    description: 'Small Android device',
  },
  {
    name: 'Android Medium',
    width: 411,
    height: 731,
    platform: 'android',
    safeAreaInsets: { top: 24, bottom: 0, left: 0, right: 0 },
    description: 'Medium Android device',
  },
  {
    name: 'Android Large',
    width: 480,
    height: 854,
    platform: 'android',
    safeAreaInsets: { top: 24, bottom: 0, left: 0, right: 0 },
    description: 'Large Android device',
  },
  {
    name: 'Android Tablet',
    width: 768,
    height: 1024,
    platform: 'android',
    safeAreaInsets: { top: 24, bottom: 0, left: 0, right: 0 },
    description: 'Android tablet',
  },
  
  // iPad configurations
  {
    name: 'iPad',
    width: 768,
    height: 1024,
    platform: 'ios',
    safeAreaInsets: { top: 20, bottom: 0, left: 0, right: 0 },
    description: 'Standard iPad',
  },
  {
    name: 'iPad Pro 11"',
    width: 834,
    height: 1194,
    platform: 'ios',
    safeAreaInsets: { top: 20, bottom: 0, left: 0, right: 0 },
    description: 'iPad Pro 11 inch',
  },
  {
    name: 'iPad Pro 12.9"',
    width: 1024,
    height: 1366,
    platform: 'ios',
    safeAreaInsets: { top: 20, bottom: 0, left: 0, right: 0 },
    description: 'iPad Pro 12.9 inch',
  },
];

/**
 * Test navigation bar layout for a specific device configuration
 */
export const testNavigationBarLayout = (config: DeviceTestConfig) => {
  const deviceLayout = getDeviceLayoutConfig({
    top: config.safeAreaInsets.top,
    bottom: config.safeAreaInsets.bottom,
    left: config.safeAreaInsets.left,
    right: config.safeAreaInsets.right,
  });
  
  // Override dimensions for testing
  const originalDimensions = Dimensions.get('window');
  Object.defineProperty(Dimensions, 'get', {
    value: () => ({
      width: config.width,
      height: config.height,
    }),
    writable: true,
  });
  
  const results = {
    deviceName: config.name,
    screenWidth: config.width,
    screenHeight: config.height,
    platform: config.platform,
    safeAreaInsets: config.safeAreaInsets,
    
    // Navigation bar calculations
    navigationBar: {
      height: deviceLayout.navigationBar.height,
      paddingBottom: deviceLayout.navigationBar.paddingBottom,
      paddingTop: deviceLayout.navigationBar.paddingTop,
      paddingHorizontal: deviceLayout.navigationBar.paddingHorizontal,
      fontSize: deviceLayout.navigationBar.fontSize,
      iconSize: deviceLayout.navigationBar.iconSize,
    },
    
    // Layout calculations
    isSmallDevice: deviceLayout.isSmallDevice,
    isMediumDevice: deviceLayout.isMediumDevice,
    isLargeDevice: deviceLayout.isLargeDevice,
    isTablet: deviceLayout.isTablet,
    
    // Potential issues
    issues: [] as string[],
  };
  
  // Check for potential layout issues
  if (config.width < 360) {
    results.issues.push('Screen width too small - navigation items may overlap');
  }
  
  if (deviceLayout.navigationBar.fontSize < 9) {
    results.issues.push('Font size too small - text may be unreadable');
  }
  
  if (deviceLayout.navigationBar.iconSize < 16) {
    results.issues.push('Icon size too small - icons may be hard to tap');
  }
  
  if (deviceLayout.navigationBar.height < 50) {
    results.issues.push('Navigation bar height too small - may cause touch issues');
  }
  
  // Restore original dimensions
  Object.defineProperty(Dimensions, 'get', {
    value: () => originalDimensions,
    writable: true,
  });
  
  return results;
};

/**
 * Test all device configurations
 */
export const testAllDeviceConfigurations = () => {
  const results = DEVICE_TEST_CONFIGS.map(config => testNavigationBarLayout(config));
  
  // Summary statistics
  const summary = {
    totalDevices: results.length,
    devicesWithIssues: results.filter(r => r.issues.length > 0).length,
    criticalIssues: results.filter(r => r.issues.some(issue => 
      issue.includes('overlap') || issue.includes('unreadable')
    )).length,
    platforms: {
      ios: results.filter(r => r.platform === 'ios').length,
      android: results.filter(r => r.platform === 'android').length,
    },
    deviceTypes: {
      small: results.filter(r => r.isSmallDevice).length,
      medium: results.filter(r => r.isMediumDevice).length,
      large: results.filter(r => r.isLargeDevice).length,
      tablet: results.filter(r => r.isTablet).length,
    },
  };
  
  return {
    results,
    summary,
  };
};

/**
 * Generate device-specific test report
 */
export const generateDeviceTestReport = () => {
  const testResults = testAllDeviceConfigurations();
  
  console.log('📱 Device Layout Test Report');
  console.log('============================');
  console.log(`Total devices tested: ${testResults.summary.totalDevices}`);
  console.log(`Devices with issues: ${testResults.summary.devicesWithIssues}`);
  console.log(`Critical issues: ${testResults.summary.criticalIssues}`);
  console.log('');
  
  console.log('Platform breakdown:');
  console.log(`- iOS: ${testResults.summary.platforms.ios}`);
  console.log(`- Android: ${testResults.summary.platforms.android}`);
  console.log('');
  
  console.log('Device type breakdown:');
  console.log(`- Small devices: ${testResults.summary.deviceTypes.small}`);
  console.log(`- Medium devices: ${testResults.summary.deviceTypes.medium}`);
  console.log(`- Large devices: ${testResults.summary.deviceTypes.large}`);
  console.log(`- Tablets: ${testResults.summary.deviceTypes.tablet}`);
  console.log('');
  
  // Detailed results for devices with issues
  const devicesWithIssues = testResults.results.filter(r => r.issues.length > 0);
  if (devicesWithIssues.length > 0) {
    console.log('Devices with issues:');
    devicesWithIssues.forEach(device => {
      console.log(`- ${device.deviceName}: ${device.issues.join(', ')}`);
    });
  } else {
    console.log('✅ All devices passed layout tests!');
  }
  
  return testResults;
};

/**
 * Validate current device layout
 */
export const validateCurrentDeviceLayout = () => {
  const { width, height } = Dimensions.get('window');
  const platform = Platform.OS as 'ios' | 'android';
  
  // Find matching device configuration
  const matchingConfig = DEVICE_TEST_CONFIGS.find(config => 
    config.width === width && 
    config.height === height && 
    config.platform === platform
  );
  
  if (matchingConfig) {
    return testNavigationBarLayout(matchingConfig);
  } else {
    // Create custom configuration for unknown device
    const customConfig: DeviceTestConfig = {
      name: `Custom ${platform} device`,
      width,
      height,
      platform,
      safeAreaInsets: { top: platform === 'ios' ? 44 : 24, bottom: platform === 'ios' ? 34 : 0, left: 0, right: 0 },
      description: `Unknown ${platform} device with dimensions ${width}x${height}`,
    };
    
    return testNavigationBarLayout(customConfig);
  }
};

export default {
  DEVICE_TEST_CONFIGS,
  testNavigationBarLayout,
  testAllDeviceConfigurations,
  generateDeviceTestReport,
  validateCurrentDeviceLayout,
};
