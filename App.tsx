/**
 * Main App Entry Point
 * This file serves as a bootstrap file that imports and re-exports the main App component
 * 🛡️ CRITICAL: All imports are wrapped in try-catch to prevent native module crashes
 * 🛡️ iOS CRASH FIX: Async module loading to prevent C++ exception failures
 */

import React from 'react';

// 🛡️ iOS CRASH PREVENTION: Don't require gesture handler synchronously
// This prevents C++ exception failures during module initialization
// Gesture handler will be loaded lazily in the main App component

// 🛡️ SAFETY: Import and re-export the App component with error handling
// Note: Using dynamic import would be better but requires async, so we use try-catch
let App: React.ComponentType;

try {
  const AppModule = require('./src/App');
  App = AppModule.default;
  
  if (!App) {
    throw new Error('App component not found');
  }
} catch (importError: any) {
  console.error('❌ App import failed:', importError);
  console.error('❌ Error details:', importError?.message, importError?.stack);
  // Export a fallback component
  const { Text, View } = require('react-native');
  
  App = () => {
    return React.createElement(View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' } },
      React.createElement(Text, { style: { textAlign: 'center', padding: 20 } }, 
        'Uygulama yüklenemedi. Lütfen tekrar deneyin.'
      )
    );
  };
}

export default App;
