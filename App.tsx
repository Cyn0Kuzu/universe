/**
 * Main App Entry Point
 * 🛡️ CRITICAL: Using ES6 imports instead of require() to fix bundle issues
 * This ensures proper bundle generation with Hermes engine
 */

// Direct import - ensures require() is properly polyfilled in bundle
import App from './src/App';

export default App;
