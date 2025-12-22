import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualizedRange {
  startIndex: number;
  endIndex: number;
  offsetY: number;
}

/**
 * Hook for virtualizing long lists to improve performance
 */
export const useVirtualization = <T,>(
  items: T[],
  options: VirtualizationOptions
): {
  visibleItems: T[];
  visibleRange: VirtualizedRange;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
} => {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const scrollingRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate visible range
  const visibleRange = useMemo((): VirtualizedRange => {
    const totalItems = items.length;
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      totalItems - 1,
      Math.floor(scrollTop / itemHeight) + visibleCount + overscan
    );

    return {
      startIndex,
      endIndex,
      offsetY: startIndex * itemHeight,
    };
  }, [items.length, scrollTop, itemHeight, containerHeight, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  // Total height for scrolling
  const totalHeight = items.length * itemHeight;

  // Handle scroll with throttling
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;

    // Clear previous timeout
    if (scrollingRef.current) {
      clearTimeout(scrollingRef.current);
    }

    // Update scroll position immediately for smooth scrolling
    setScrollTop(target.scrollTop);

    // Mark as scrolling
    scrollingRef.current = setTimeout(() => {
      scrollingRef.current = null;
    }, 150);
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback(
    (index: number) => {
      const newScrollTop = Math.max(0, Math.min(index * itemHeight, totalHeight - containerHeight));
      setScrollTop(newScrollTop);
    },
    [itemHeight, totalHeight, containerHeight]
  );

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    scrollToIndex,
    handleScroll,
  };
};

/**
 * Hook for measuring dynamic item heights (if items have variable heights)
 */
export const useDynamicItemHeight = () => {
  const [heights, setHeights] = useState<Map<number, number>>(new Map());
  const measureRef = useRef<Map<number, HTMLElement>>(new Map());

  const measureItem = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      measureRef.current.set(index, element);
      const height = element.getBoundingClientRect().height;
      setHeights((prev) => {
        const next = new Map(prev);
        next.set(index, height);
        return next;
      });
    } else {
      measureRef.current.delete(index);
    }
  }, []);

  const getItemHeight = useCallback(
    (index: number, defaultHeight: number): number => {
      return heights.get(index) ?? defaultHeight;
    },
    [heights]
  );

  const getTotalHeight = useCallback(
    (itemCount: number, defaultHeight: number): number => {
      let total = 0;
      for (let i = 0; i < itemCount; i++) {
        total += heights.get(i) ?? defaultHeight;
      }
      return total;
    },
    [heights]
  );

  return {
    measureItem,
    getItemHeight,
    getTotalHeight,
  };
};
