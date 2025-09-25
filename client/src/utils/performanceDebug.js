/**
 * Performance Debug Utilities
 * Add these to browser console for debugging
 */

import mobilePerformanceMonitor from './performanceMonitor';

// Make performance monitor available globally for debugging
window.performanceDebug = {
  // Enable monitoring
  enable: (interceptTimers = false) => {
    mobilePerformanceMonitor.enable({ interceptTimers });
    console.log(`Mobile performance monitoring enabled (timer interception: ${interceptTimers})`);
  },
  
  // Disable monitoring
  disable: () => {
    mobilePerformanceMonitor.disable();
    console.log('Mobile performance monitoring disabled');
  },
  
  // Get current report
  report: () => {
    const report = mobilePerformanceMonitor.getReport();
    console.log('=== Performance Report ===');
    console.log(report);
    return report;
  },
  
  // Log report to console
  log: () => {
    mobilePerformanceMonitor.logReport();
  },
  
  // Export data
  export: () => {
    const data = mobilePerformanceMonitor.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('Performance data exported');
  },
  
  // Check for overheating indicators
  checkOverheating: () => {
    const report = mobilePerformanceMonitor.getReport();
    const issues = [];
    
    if (report.avgCpuUsage > 80) {
      issues.push(`High CPU usage: ${report.avgCpuUsage.toFixed(1)}%`);
    }
    
    if (report.avgMemoryUsage > 500) {
      issues.push(`High memory usage: ${report.avgMemoryUsage}MB`);
    }
    
    if (report.activeIntervals > 20) {
      issues.push(`Too many intervals: ${report.activeIntervals}`);
    }
    
    if (report.avgApiLatency > 2000) {
      issues.push(`Slow API calls: ${report.avgApiLatency.toFixed(0)}ms`);
    }
    
    if (issues.length > 0) {
      console.warn('Potential overheating issues detected:');
      issues.forEach(issue => console.warn(`- ${issue}`));
    } else {
      console.log('No overheating issues detected');
    }
    
    return issues;
  },
  
  // Monitor specific functions
  monitorFunction: (func, name) => {
    return (...args) => {
      const start = performance.now();
      const result = func(...args);
      const end = performance.now();
      
      if (end - start > 10) { // Log functions taking more than 10ms
        console.warn(`[Performance] ${name} took ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    };
  }
};

console.log('Performance debug utilities loaded. Use window.performanceDebug.* to access them.');
console.log('Available commands:');
console.log('- window.performanceDebug.enable() - Start monitoring');
console.log('- window.performanceDebug.disable() - Stop monitoring');
console.log('- window.performanceDebug.report() - Get current report');
console.log('- window.performanceDebug.log() - Log report to console');
console.log('- window.performanceDebug.export() - Export data as JSON');
console.log('- window.performanceDebug.checkOverheating() - Check for issues');

export default window.performanceDebug;
