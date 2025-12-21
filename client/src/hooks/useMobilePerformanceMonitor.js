import { useEffect, useRef, useState, useCallback } from 'react';
import mobilePerformanceMonitor from '../utils/performanceMonitor';

/**
 * React hook for mobile performance monitoring
 * Provides real-time performance metrics and alerts
 */
export const useMobilePerformanceMonitor = (componentName = 'Component') => {
  const [metrics, setMetrics] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    renderTime: 0,
    apiCalls: 0,
    isOverheating: false
  });
  
  const [alerts, setAlerts] = useState([]);
  const renderStartTime = useRef(0);
  const lastReportTime = useRef(Date.now());
  const renderCount = useRef(0);

  // Check for performance issues
  const checkPerformanceAlerts = useCallback((report) => {
    const newAlerts = [];

    if (report.avgCpuUsage > 80) {
      newAlerts.push({
        type: 'high-cpu',
        component: componentName,
        value: report.avgCpuUsage,
        timestamp: Date.now(),
        message: `High CPU usage: ${report.avgCpuUsage.toFixed(1)}%`
      });
    }

    if (report.avgMemoryUsage > 500) {
      newAlerts.push({
        type: 'high-memory',
        component: componentName,
        value: report.avgMemoryUsage,
        timestamp: Date.now(),
        message: `High memory usage: ${report.avgMemoryUsage}MB`
      });
    }

    if (report.activeIntervals > 20) {
      newAlerts.push({
        type: 'too-many-intervals',
        component: componentName,
        value: report.activeIntervals,
        timestamp: Date.now(),
        message: `Too many active intervals: ${report.activeIntervals}`
      });
    }

    if (report.avgApiLatency > 2000) {
      newAlerts.push({
        type: 'slow-api',
        component: componentName,
        value: report.avgApiLatency,
        timestamp: Date.now(),
        message: `Slow API calls: ${report.avgApiLatency.toFixed(0)}ms average`
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev.slice(-9), ...newAlerts]);
      // Performance alerts disabled for production
      // newAlerts.forEach(alert => console.warn(`[Performance Alert] ${alert.message}`));
    }
  }, [componentName]);

  // Track render performance
  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current++;
    
    // Mark render performance
    const renderTime = performance.now() - renderStartTime.current;
    if (renderTime > 0) {
      const markName = `${componentName}-render-${renderCount.current}`;
      const measureName = `${componentName}-render-duration-${renderCount.current}`;
      
      performance.mark(markName);
      performance.measure(measureName, markName);
      
      // Clean up old marks/measures to prevent accumulation (keep last 50)
      if (renderCount.current > 50) {
        const oldMarkName = `${componentName}-render-${renderCount.current - 50}`;
        const oldMeasureName = `${componentName}-render-duration-${renderCount.current - 50}`;
        try {
          performance.clearMarks(oldMarkName);
          performance.clearMeasures(oldMeasureName);
        } catch (e) {
          // Ignore errors if mark/measure doesn't exist
        }
      }
    }
  });

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      const report = mobilePerformanceMonitor.getReport();

      const newMetrics = {
        cpuUsage: report.avgCpuUsage,
        memoryUsage: report.avgMemoryUsage,
        renderTime: report.avgRenderTime,
        apiCalls: report.totalApiCalls,
        isOverheating: report.avgCpuUsage > 80 || report.avgMemoryUsage > 500
      };

      setMetrics(newMetrics);

      // Check for performance alerts
      const now = Date.now();
      if (now - lastReportTime.current > 5000) { // Check every 5 seconds
        checkPerformanceAlerts(report);
        lastReportTime.current = now;
      }
    };

    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, [componentName, checkPerformanceAlerts]);

  // Performance actions
  const clearAlerts = () => setAlerts([]);
  const getReport = () => mobilePerformanceMonitor.getReport();
  const logReport = () => mobilePerformanceMonitor.logReport();
  const exportData = () => mobilePerformanceMonitor.exportData();

  return {
    metrics,
    alerts,
    clearAlerts,
    getReport,
    logReport,
    exportData,
    isMonitoring: mobilePerformanceMonitor.isEnabled
  };
};

export default useMobilePerformanceMonitor;
