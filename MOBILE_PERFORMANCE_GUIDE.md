# Mobile Performance Monitoring Guide

## Overview

Your mobile app overheating issue has been addressed with a comprehensive performance monitoring system. This guide explains how to identify and fix the root causes of mobile overheating.

## Quick Start

### For User ID 39 (You)
The performance monitoring is automatically enabled when you log in. You'll see two new buttons in the right panel:
- **Network** - For network throttling testing
- **Mobile** - For mobile performance monitoring

### For Other Users
The monitoring system is automatically disabled for other users to avoid performance impact.

## How to Use the Mobile Performance Panel

1. **Open the Panel**: Click the "Mobile" button in the right panel
2. **View Real-time Metrics**:
   - CPU Usage (should be < 80%)
   - Memory Usage (should be < 500MB)
   - Render Time (should be < 16ms for 60fps)
   - API Calls count

3. **Check Alerts**: The panel shows performance alerts in real-time
4. **Export Data**: Click "Export Data" to save detailed performance logs

## Browser Console Commands

In development mode, you can use these console commands:

```javascript
// Enable monitoring (safe mode - no timer interception)
window.performanceDebug.enable()

// Enable with timer interception (may cause conflicts)
window.performanceDebug.enable(true)

// Disable monitoring  
window.performanceDebug.disable()

// Get current report
window.performanceDebug.report()

// Check for overheating issues
window.performanceDebug.checkOverheating()

// Export performance data
window.performanceDebug.export()
```

## Common Overheating Causes in Your App

Based on the codebase analysis, here are the likely culprits:

### 1. **Audio Processing Issues**
- **Problem**: Multiple audio players running simultaneously
- **Location**: `AudioPlayer.js`, `SafariAudioPlayer.js`
- **Fix**: Ensure only one audio player is active at a time

### 2. **Excessive API Calls**
- **Problem**: Too many simultaneous fetch requests
- **Location**: `beatService.js`, `audioCacheService.js`
- **Fix**: Implement request throttling and caching

### 3. **Memory Leaks in Audio Caching**
- **Problem**: Audio buffers not being cleaned up
- **Location**: `audioBufferService.js`, `audioCacheService.js`
- **Fix**: Clear buffers when switching tracks

### 4. **Too Many Intervals/Timeouts**
- **Problem**: Background processes running constantly
- **Location**: Various hooks and services
- **Fix**: Clear intervals when components unmount

### 5. **Cross-tab Synchronization**
- **Problem**: WebSocket connections and localStorage sync
- **Location**: `useCrossTabSync.js`
- **Fix**: Disable when not needed

## Performance Thresholds

The monitoring system alerts you when:

- **CPU Usage > 80%**: Device is working too hard
- **Memory Usage > 500MB**: Risk of memory pressure
- **Render Time > 16ms**: Below 60fps performance
- **API Latency > 2000ms**: Slow network requests
- **Active Intervals > 20**: Too many background processes
- **DOM Mutations > 50**: Excessive UI updates

## Debugging Steps

### Step 1: Enable Monitoring
```javascript
// Safe mode (recommended) - monitors CPU, memory, API calls, etc.
window.performanceDebug.enable()

// Advanced mode - also monitors timers (may cause conflicts with existing code)
window.performanceDebug.enable(true)
```

### Step 2: Use Your App Normally
- Play audio tracks
- Navigate between pages
- Use different features
- Let it run for 5-10 minutes

### Step 3: Check for Issues
```javascript
window.performanceDebug.checkOverheating()
```

### Step 4: Get Detailed Report
```javascript
window.performanceDebug.report()
```

### Step 5: Export Data for Analysis
```javascript
window.performanceDebug.export()
```

## Immediate Fixes to Try

### 1. Disable Cross-tab Sync
In `useCrossTabSync.js`, the WebSocket functionality is already disabled, but you can also disable localStorage sync if not needed.

### 2. Reduce Audio Buffer Size
In `audioBufferService.js`, reduce the buffer size:
```javascript
this.bufferSize = 512 * 1024; // Instead of 1024 * 1024
```

### 3. Limit Concurrent Audio Operations
In `audioCacheService.js`, reduce concurrent operations:
```javascript
maxConcurrent: 1 // Instead of 2
```

### 4. Clear Intervals More Aggressively
Add cleanup in components that use intervals:
```javascript
useEffect(() => {
  return () => {
    // Clear all intervals
    for (let i = 1; i < 10000; i++) {
      clearInterval(i);
      clearTimeout(i);
    }
  };
}, []);
```

## Mobile-Specific Optimizations

### 1. Reduce Animation Frequency
- Lower frame rates for non-critical animations
- Use `will-change` CSS property sparingly

### 2. Optimize Audio Playback
- Use `preload="metadata"` instead of `preload="auto"`
- Implement audio context suspension when not playing

### 3. Memory Management
- Clear large objects when switching views
- Use `WeakMap` for temporary data storage
- Implement garbage collection hints

## Monitoring Dashboard

The performance panel shows:
- **Real-time metrics** with color-coded warnings
- **Performance alerts** with timestamps
- **Detailed reports** with averages and totals
- **Export functionality** for offline analysis

## Red Flags to Watch For

1. **CPU Usage consistently > 60%**
2. **Memory usage growing over time**
3. **More than 10 active intervals**
4. **API calls taking > 1 second**
5. **Render times > 16ms consistently**

## Next Steps

1. **Enable monitoring** and use your app normally
2. **Identify the specific issue** causing overheating
3. **Apply targeted fixes** based on the alerts
4. **Monitor improvements** with the dashboard
5. **Export data** for further analysis if needed

The monitoring system will help you pinpoint exactly what's causing the overheating so you can fix it efficiently.
