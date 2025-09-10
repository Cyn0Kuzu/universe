import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { LogBox } from 'react-native';
import GlobalErrorBoundary from './components/common/GlobalErrorBoundary';

// SAFE IMPORTS - only if they exist
let AuthNavigator: any;
let theme: any;
let AuthProvider: any;

try {
  AuthNavigator = require('./navigation/AuthNavigator').default;
} catch (e) {
  console.warn('AuthNavigator not found, using fallback');
  AuthNavigator = () => <Text style={{flex: 1, textAlign: 'center', marginTop: 100}}>Loading Navigation...</Text>;
}

try {
  theme = require('./theme').default;
} catch (e) {
  console.warn('Theme not found, using default');
  theme = {};
}

try {
  AuthProvider = require('./contexts/AuthContext').AuthProvider;
} catch (e) {
  console.warn('AuthProvider not found, using fallback');
  AuthProvider = ({ children }: any) => children;
}

// Ignore warnings that don't affect functionality
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Warning: React.createElement',
  'Warning: validateDOMNesting',
  'Setting a timer for a long period',
  'AsyncStorage has been extracted from react-native core',
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

const App: React.FC = () => {
  console.log('🚀 Main Universe app component rendering...');

  // Main app - no additional loading needed
  return (
    <GlobalErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={theme as any}>
          <AuthProvider>
            <NavigationContainer
              onUnhandledAction={(action) => {
                console.warn('Unhandled navigation action:', action);
              }}
              onStateChange={(state) => {
                if (state && __DEV__) {
                  console.log('Navigation state changed');
                }
              }}
            >
              <StatusBar 
                style="auto" 
                backgroundColor="transparent" 
                translucent={false} 
              />
              <AuthNavigator />
            </NavigationContainer>
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
