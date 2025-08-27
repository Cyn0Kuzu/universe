/**
 * 🌐 Network Utilities
 * Network connectivity and request utilities
 */

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

/**
 * Simple connectivity check using fetch
 */
export const checkInternetConnectivity = async (timeout: number = 5000): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch('https://httpbin.org/status/200', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache',
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Wait for network connectivity
 */
export const waitForConnection = (timeout: number = 30000): Promise<boolean> => {
  return new Promise((resolve) => {
    const checkConnection = async () => {
      const isConnected = await checkInternetConnectivity();
      if (isConnected) {
        resolve(true);
        return;
      }
      
      setTimeout(checkConnection, 1000);
    };
    
    checkConnection();
    
    // Timeout after specified time
    setTimeout(() => resolve(false), timeout);
  });
};

/**
 * Retry a network request with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      // Check if it's a network error
      const isConnected = await checkInternetConnectivity();
      if (!isConnected) {
        // Wait for connection before retrying
        await waitForConnection(10000);
      }
      
      // Exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

/**
 * Check if error is network related
 */
export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  
  const networkErrorMessages = [
    'Network request failed',
    'Network Error',
    'NETWORK_ERROR',
    'fetch is not a function',
    'Unable to resolve host',
    'Connection refused',
    'Timeout',
    'No internet connection'
  ];
  
  const errorMessage = error.message || error.toString();
  return networkErrorMessages.some(msg => 
    errorMessage.toLowerCase().includes(msg.toLowerCase())
  );
};

/**
 * Create timeout promise
 */
export const createTimeoutPromise = <T>(promise: Promise<T>, timeout: number): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeout);
  });
  
  return Promise.race([promise, timeoutPromise]);
};

/**
 * Safe fetch with timeout and retry
 */
export const safeFetch = async (
  url: string,
  options: RequestInit = {},
  timeout: number = 10000,
  retries: number = 2
): Promise<Response> => {
  const fetchWithTimeout = () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    return fetch(url, {
      ...options,
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
  };
  
  return retryWithBackoff(fetchWithTimeout, retries);
};

/**
 * Download progress tracker
 */
export interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const downloadWithProgress = async (
  url: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  
  if (!response.body) {
    throw new Error('Response body is null');
  }
  
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;
    
    chunks.push(value);
    loaded += value.length;
    
    if (onProgress && total > 0) {
      onProgress({
        loaded,
        total,
        percentage: Math.round((loaded / total) * 100)
      });
    }
  }
  
  // Combine chunks into single ArrayBuffer
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result.buffer;
};

/**
 * Network quality estimation
 */
export interface NetworkQuality {
  type: 'slow' | 'good' | 'excellent';
  estimatedBandwidth: number; // in Mbps
}

export const estimateNetworkQuality = async (): Promise<NetworkQuality> => {
  try {
    const startTime = Date.now();
    
    // Download a small image to test speed
    const testUrl = 'https://httpbin.org/bytes/1024'; // 1KB test
    await fetch(testUrl);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const bytesPerSecond = 1024 / (duration / 1000);
    const mbps = (bytesPerSecond * 8) / (1024 * 1024);
    
    let type: 'slow' | 'good' | 'excellent';
    if (mbps < 1) {
      type = 'slow';
    } else if (mbps < 5) {
      type = 'good';
    } else {
      type = 'excellent';
    }
    
    return {
      type,
      estimatedBandwidth: mbps
    };
  } catch (error) {
    return {
      type: 'slow',
      estimatedBandwidth: 0
    };
  }
};

/**
 * Batch network requests
 */
export const batchRequests = async <T>(
  requests: (() => Promise<T>)[],
  batchSize: number = 3,
  delay: number = 100
): Promise<T[]> => {
  const results: T[] = [];
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(req => req()));
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results[i + index] = result.value;
      } else {
        console.warn(`Batch request ${i + index} failed:`, result.reason);
        throw result.reason;
      }
    });
    
    // Add delay between batches to avoid overwhelming the server
    if (i + batchSize < requests.length && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
};
