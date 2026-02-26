/**
 * Request Queue Manager
 * 
 * Manages concurrent requests to prevent overwhelming the connection.
 * Implements request throttling, retry logic with exponential backoff,
 * timeout handling, and graceful error handling.
 */

// Maximum concurrent requests allowed
const MAX_CONCURRENT_REQUESTS = 3;

// Default timeout for requests (15 seconds)
const DEFAULT_REQUEST_TIMEOUT = 15000;

// Request queue
let activeRequests = 0;
const pendingRequests: Array<() => void> = [];

// Track last activity for deadlock detection
let lastActivityTime = Date.now();

// Process next request in queue
const processQueue = () => {
  lastActivityTime = Date.now();
  while (pendingRequests.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const nextRequest = pendingRequests.shift();
    if (nextRequest) {
      activeRequests++;
      nextRequest();
    }
  }
};

// Enqueue a request with deadlock protection
const enqueueRequest = (): Promise<void> => {
  return new Promise((resolve) => {
    lastActivityTime = Date.now();
    
    // Check for potential deadlock - if queue has been stuck for more than 30 seconds, reset it
    if (activeRequests >= MAX_CONCURRENT_REQUESTS && pendingRequests.length > 0) {
      const timeSinceLastActivity = Date.now() - lastActivityTime;
      if (timeSinceLastActivity > 30000) {
        console.warn('🔄 Request queue appears stuck, resetting...');
        activeRequests = 0;
        pendingRequests.length = 0;
      }
    }
    
    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
      activeRequests++;
      resolve();
    } else {
      pendingRequests.push(() => {
        resolve();
      });
    }
  });
};

// Release a request slot
const releaseRequest = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  lastActivityTime = Date.now();
  processQueue();
};

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


// Timeout wrapper for promises
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Request timeout'
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

// Check if error is retryable
const isRetryableError = (error: any): boolean => {
  if (!error) return false;
  
  const message = (error.message || '').toLowerCase();
  const code = (error.code || '').toLowerCase();
  
  // Network errors
  if (message.includes('failed to fetch')) return true;
  if (message.includes('network')) return true;
  if (message.includes('timeout')) return true;
  if (message.includes('aborted')) return true;
  if (message.includes('connection')) return true;
  
  // Server errors (5xx)
  if (error.status >= 500) return true;
  
  // Rate limiting
  if (error.status === 429) return true;
  if (code === '429') return true;
  
  return false;
};

interface QueuedRequestOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
  critical?: boolean; // If true, errors will be thrown. If false, returns null on failure.
}

/**
 * Execute a request with queuing, timeout, and retry logic
 */
export async function queuedRequest<T>(
  requestFn: () => Promise<T>,
  options: QueuedRequestOptions = {}
): Promise<T | null> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    timeout = DEFAULT_REQUEST_TIMEOUT,
    critical = false,
  } = options;

  let lastError: any = null;
  let currentDelay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wait for a slot in the queue
      await enqueueRequest();
      
      try {
        // Execute request with timeout
        const result = await withTimeout(
          requestFn(),
          timeout,
          'Request timeout'
        );
        return result;
      } finally {
        releaseRequest();
      }
    } catch (error: any) {
      lastError = error;
      
      // Log the error on first attempt
      if (attempt === 0) {
        console.warn(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error?.message || error);
      }
      
      // Check if we should retry
      if (attempt < maxRetries && isRetryableError(error)) {
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 500;
        const waitTime = Math.min(currentDelay + jitter, maxDelay);
        
        console.log(`Retrying in ${Math.round(waitTime)}ms...`);
        await delay(waitTime);
        
        // Exponential backoff
        currentDelay = Math.min(currentDelay * 2, maxDelay);
      } else {
        // Not retryable or max retries reached
        break;
      }
    }
  }

  // All retries exhausted
  if (critical) {
    throw lastError;
  }
  
  // For non-critical requests, return null instead of throwing
  console.warn('Request failed after all retries, returning null');
  return null;
}

/**
 * Execute a Supabase query with queuing, timeout, and retry logic
 */
export async function queuedSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: QueuedRequestOptions = {}
): Promise<{ data: T | null; error: any }> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    timeout = DEFAULT_REQUEST_TIMEOUT,
    critical = false,
  } = options;

  let lastError: any = null;
  let currentDelay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wait for a slot in the queue
      await enqueueRequest();
      
      try {
        // Execute query with timeout
        const result = await withTimeout(
          queryFn(),
          timeout,
          'Request timeout'
        );
        
        // Check for Supabase errors
        if (result.error) {
          // Some errors are not retryable (like auth errors, not found, etc.)
          if (!isRetryableError(result.error)) {
            return result;
          }
          throw result.error;
        }
        
        return result;
      } finally {
        releaseRequest();
      }
    } catch (error: any) {
      lastError = error;
      
      // Log the error on first attempt
      if (attempt === 0) {
        console.warn(`Supabase query failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error?.message || error);
      }
      
      // Check if we should retry
      if (attempt < maxRetries && isRetryableError(error)) {
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 500;
        const waitTime = Math.min(currentDelay + jitter, maxDelay);
        
        console.log(`Retrying Supabase query in ${Math.round(waitTime)}ms...`);
        await delay(waitTime);
        
        // Exponential backoff
        currentDelay = Math.min(currentDelay * 2, maxDelay);
      } else {
        // Not retryable or max retries reached
        break;
      }
    }
  }

  // All retries exhausted
  const errorMessage = lastError?.message || 'Request failed after multiple retries';
  
  // Always return a result object, never throw for Supabase queries
  console.warn('Supabase query failed after all retries:', errorMessage);
  return { data: null, error: { message: errorMessage, details: lastError } };
}

/**
 * Batch multiple requests with staggered timing
 */
export async function staggeredRequests<T>(
  requests: Array<() => Promise<T>>,
  staggerMs: number = 100
): Promise<Array<T | null>> {
  const results: Array<T | null> = [];
  
  for (let i = 0; i < requests.length; i++) {
    if (i > 0) {
      await delay(staggerMs);
    }
    
    try {
      const result = await queuedRequest(requests[i], { critical: false });
      results.push(result);
    } catch (error) {
      console.warn(`Staggered request ${i} failed:`, error);
      results.push(null);
    }
  }
  
  return results;
}

// Reset queue state (useful for testing or recovery)
export const resetQueue = () => {
  activeRequests = 0;
  pendingRequests.length = 0;
};

// Export queue stats for debugging
export const getQueueStats = () => ({
  activeRequests,
  pendingRequests: pendingRequests.length,
  maxConcurrent: MAX_CONCURRENT_REQUESTS,
});
