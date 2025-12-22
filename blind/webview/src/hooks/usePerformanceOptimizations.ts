import { useMemo, useCallback } from 'react';
import { TraceEvent } from '../types';

/**
 * Performance optimizations for large trace datasets
 */
export const usePerformanceOptimizations = () => {
  /**
   * Throttle function to limit execution frequency
   */
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle = false;
    return function (this: any, ...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }, []);

  /**
   * Debounce function to delay execution until after a pause
   */
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return function (this: any, ...args: Parameters<T>) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }, []);

  /**
   * Chunk large arrays for processing
   */
  const chunkArray = useCallback(<T,>(array: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }, []);

  /**
   * Memoized event filtering with optimized lookups
   */
  const createEventIndexMap = useCallback((events: TraceEvent[]) => {
    const map = new Map<number, number>();
    events.forEach((event, index) => {
      map.set(event.event_id, index);
    });
    return map;
  }, []);

  /**
   * Create a LRU cache for expensive computations
   */
  const createLRUCache = useCallback(<K, V>(maxSize: number) => {
    const cache = new Map<K, V>();
    const accessOrder: K[] = [];

    return {
      get(key: K): V | undefined {
        if (!cache.has(key)) return undefined;

        // Move to end (most recently used)
        const index = accessOrder.indexOf(key);
        if (index > -1) {
          accessOrder.splice(index, 1);
        }
        accessOrder.push(key);

        return cache.get(key);
      },
      set(key: K, value: V): void {
        // If already exists, update and move to end
        if (cache.has(key)) {
          const index = accessOrder.indexOf(key);
          if (index > -1) {
            accessOrder.splice(index, 1);
          }
        }

        // Add to cache
        cache.set(key, value);
        accessOrder.push(key);

        // Evict oldest if over capacity
        if (cache.size > maxSize) {
          const oldest = accessOrder.shift();
          if (oldest !== undefined) {
            cache.delete(oldest);
          }
        }
      },
      clear(): void {
        cache.clear();
        accessOrder.length = 0;
      },
      size(): number {
        return cache.size;
      },
    };
  }, []);

  /**
   * Optimize string formatting with caching
   */
  const createStringFormatter = useCallback(() => {
    const formatCache = new Map<string, string>();

    return {
      formatFileName(filePath: string): string {
        if (formatCache.has(filePath)) {
          return formatCache.get(filePath)!;
        }
        const formatted = filePath.split('/').pop() || filePath;
        formatCache.set(filePath, formatted);
        return formatted;
      },
      formatLocation(filePath: string, lineNumber: number): string {
        const key = `${filePath}:${lineNumber}`;
        if (formatCache.has(key)) {
          return formatCache.get(key)!;
        }
        const fileName = this.formatFileName(filePath);
        const formatted = `${fileName}:${lineNumber}`;
        formatCache.set(key, formatted);
        return formatted;
      },
      clear(): void {
        formatCache.clear();
      },
    };
  }, []);

  /**
   * Batch DOM updates using requestAnimationFrame
   */
  const batchUpdate = useCallback((callback: () => void) => {
    requestAnimationFrame(() => {
      callback();
    });
  }, []);

  /**
   * Check if dataset is "large" and needs optimization
   */
  const isLargeDataset = useCallback((eventCount: number): boolean => {
    return eventCount > 1000;
  }, []);

  /**
   * Get recommended chunk/page size based on dataset size
   */
  const getOptimalChunkSize = useCallback((totalItems: number): number => {
    if (totalItems < 100) return totalItems;
    if (totalItems < 1000) return 100;
    if (totalItems < 10000) return 200;
    return 500;
  }, []);

  return {
    throttle,
    debounce,
    chunkArray,
    createEventIndexMap,
    createLRUCache,
    createStringFormatter,
    batchUpdate,
    isLargeDataset,
    getOptimalChunkSize,
  };
};
