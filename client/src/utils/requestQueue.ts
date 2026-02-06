// Request Queue System for batching and rate limiting
interface QueuedRequest {
  id: string;
  request: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  timestamp: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private batchSize = 5;
  private batchDelay = 100; // 100ms delay between batches

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: Math.random().toString(36).substr(2, 9),
        request,
        resolve: (v: unknown) => resolve(v as T),
        reject: (e: unknown) => reject(e),
        timestamp: Date.now()
      };

      this.queue.push(queuedRequest);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      
      // Process batch in parallel
      const promises = batch.map(async (queuedRequest) => {
        try {
          const result = await queuedRequest.request();
          queuedRequest.resolve(result);
        } catch (error) {
          queuedRequest.reject(error);
        }
      });

      await Promise.allSettled(promises);

      // Wait before processing next batch
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.batchDelay));
      }
    }

    this.processing = false;
  }

  clear() {
    this.queue.forEach(queuedRequest => {
      queuedRequest.reject(new Error('Request queue cleared'));
    });
    this.queue = [];
  }

  getQueueLength() {
    return this.queue.length;
  }
}

export const requestQueue = new RequestQueue();

// Debounce function for API calls
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | undefined;
  
  return (...args: Parameters<T>) => {
    if (timeout !== undefined) clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (func as any)(...args);
    }, wait);
  };
}

// Throttle function for API calls
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (func as any)(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
