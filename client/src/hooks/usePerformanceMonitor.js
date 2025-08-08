import { useEffect, useRef, useState, useCallback } from 'react';

const usePerformanceMonitor = (componentName = 'Component') => {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    memoryUsage: null,
    networkRequests: 0,
    networkLatency: 0
  });

  const renderStartTime = useRef(null);
  const renderCount = useRef(0);
  const totalRenderTime = useRef(0);
  const networkRequests = useRef(0);
  const networkLatency = useRef(0);

  // Track render performance
  const startRenderTimer = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderTimer = useCallback(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      renderCount.current += 1;
      totalRenderTime.current += renderTime;

      setMetrics(prev => ({
        ...prev,
        renderCount: renderCount.current,
        lastRenderTime: renderTime,
        averageRenderTime: totalRenderTime.current / renderCount.current
      }));
    }
  }, []);

  // Track memory usage
  const updateMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = performance.memory;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
        }
      }));
    }
  }, []);

  // Track network performance
  const trackNetworkRequest = useCallback((url, startTime, endTime) => {
    const latency = endTime - startTime;
    networkRequests.current += 1;
    networkLatency.current = latency;

    setMetrics(prev => ({
      ...prev,
      networkRequests: networkRequests.current,
      networkLatency: latency
    }));
  }, []);

  // Monitor network requests
  useEffect(() => {
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;

    // Intercept fetch requests
    window.fetch = function(...args) {
      const startTime = performance.now();
      return originalFetch.apply(this, args).then(response => {
        const endTime = performance.now();
        trackNetworkRequest(args[0], startTime, endTime);
        return response;
      });
    };

    // Intercept XMLHttpRequest
    XMLHttpRequest.prototype.open = function(...args) {
      const startTime = performance.now();
      this.addEventListener('load', () => {
        const endTime = performance.now();
        trackNetworkRequest(args[1], startTime, endTime);
      });
      return originalXHROpen.apply(this, args);
    };

    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
    };
  }, [trackNetworkRequest]);

  // Update memory usage periodically
  useEffect(() => {
    const interval = setInterval(updateMemoryUsage, 5000);
    return () => clearInterval(interval);
  }, [updateMemoryUsage]);

  // Log performance warnings
  useEffect(() => {
    if (metrics.lastRenderTime > 16) { // 60fps threshold
      console.warn(`[Performance] ${componentName} render took ${metrics.lastRenderTime.toFixed(2)}ms (target: <16ms)`);
    }

    if (metrics.memoryUsage && metrics.memoryUsage.used > metrics.memoryUsage.limit * 0.8) {
      console.warn(`[Performance] High memory usage: ${metrics.memoryUsage.used}MB / ${metrics.memoryUsage.limit}MB`);
    }

    if (metrics.networkLatency > 1000) {
      console.warn(`[Performance] Slow network request: ${metrics.networkLatency.toFixed(2)}ms`);
    }
  }, [metrics, componentName]);

  return {
    metrics,
    startRenderTimer,
    endRenderTimer,
    updateMemoryUsage,
    trackNetworkRequest
  };
};

export default usePerformanceMonitor; 