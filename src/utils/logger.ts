// Production environment utility
// Disables console logs and debug output in production

const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// Production-safe console methods
export const logger = {
  log: isDevelopment ? console.log : () => {},
  error: console.error, // Always keep error logs
  warn: isDevelopment ? console.warn : () => {},
  debug: isDevelopment ? console.debug : () => {},
  info: isDevelopment ? console.info : () => {},
};

// Replace global console in production
if (!isDevelopment) {
  // Override console methods except error
  console.log = () => {};
  console.warn = () => {};
  console.debug = () => {};
  console.info = () => {};
  // Keep console.error for crash reporting
}

export const isProduction = !isDevelopment;
export { isDevelopment };
