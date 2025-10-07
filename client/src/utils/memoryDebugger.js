/**
 * Memory Debugging Utility
 * 
 * Usage in browser console:
 * 1. window.startMemoryMonitor() - Start monitoring
 * 2. window.stopMemoryMonitor() - Stop monitoring
 * 3. window.getMemoryReport() - Get detailed report
 */

let memorySnapshots = [];
let monitorInterval = null;
let isMonitoring = false;

const captureMemory = () => {
  if (performance.memory) {
    return {
      timestamp: Date.now(),
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usedMB: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
      totalMB: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
    };
  }
  return null;
};

const formatBytes = (bytes) => {
  return (bytes / 1048576).toFixed(2) + ' MB';
};

window.startMemoryMonitor = (intervalMs = 1000) => {
  if (isMonitoring) {
    console.warn('⚠️ Memory monitor is already running');
    return;
  }
  
  memorySnapshots = [];
  isMonitoring = true;
  
  console.log('🔍 Memory monitoring started. Capturing every', intervalMs / 1000, 'seconds');
  console.log('💡 Navigate, scroll, and interact with your app');
  console.log('📊 Run window.getMemoryReport() to see results');
  
  // Take initial snapshot
  const initial = captureMemory();
  if (initial) {
    memorySnapshots.push(initial);
    console.log('📸 Initial memory:', formatBytes(initial.usedJSHeapSize));
  }
  
  monitorInterval = setInterval(() => {
    const snapshot = captureMemory();
    if (snapshot) {
      const previous = memorySnapshots[memorySnapshots.length - 1];
      const delta = snapshot.usedJSHeapSize - previous.usedJSHeapSize;
      const deltaStr = delta > 0 ? '+' + formatBytes(delta) : formatBytes(delta);
      
      memorySnapshots.push(snapshot);
      
      // Only log significant changes (> 1MB)
      if (Math.abs(delta) > 1048576) {
        console.log('📊', snapshot.usedMB + ' MB', '(' + deltaStr + ')');
      }
    }
  }, intervalMs);
};

window.stopMemoryMonitor = () => {
  if (!isMonitoring) {
    console.warn('⚠️ Memory monitor is not running');
    return;
  }
  
  clearInterval(monitorInterval);
  isMonitoring = false;
  
  console.log('⏹️ Memory monitoring stopped');
  console.log('📊 Run window.getMemoryReport() to see full analysis');
};

window.getMemoryReport = () => {
  if (memorySnapshots.length < 2) {
    console.error('❌ Not enough data. Run window.startMemoryMonitor() first');
    return;
  }
  
  const first = memorySnapshots[0];
  const last = memorySnapshots[memorySnapshots.length - 1];
  const totalDelta = last.usedJSHeapSize - first.usedJSHeapSize;
  const durationSec = (last.timestamp - first.timestamp) / 1000;
  const averageGrowthPerSec = totalDelta / durationSec;
  
  // Find largest single increase
  let maxIncrease = 0;
  let maxIncreaseTime = null;
  for (let i = 1; i < memorySnapshots.length; i++) {
    const delta = memorySnapshots[i].usedJSHeapSize - memorySnapshots[i - 1].usedJSHeapSize;
    if (delta > maxIncrease) {
      maxIncrease = delta;
      maxIncreaseTime = new Date(memorySnapshots[i].timestamp).toLocaleTimeString();
    }
  }
  
  console.log('\n📊 ===== MEMORY ANALYSIS REPORT =====');
  console.log('⏱️  Duration:', durationSec.toFixed(1), 'seconds');
  console.log('📸 Snapshots:', memorySnapshots.length);
  console.log('\n📈 MEMORY USAGE:');
  console.log('   Start:', formatBytes(first.usedJSHeapSize));
  console.log('   End:', formatBytes(last.usedJSHeapSize));
  console.log('   Change:', (totalDelta > 0 ? '+' : '') + formatBytes(totalDelta));
  console.log('\n📊 GROWTH RATE:');
  console.log('   Average:', formatBytes(averageGrowthPerSec), '/ second');
  console.log('   Average:', formatBytes(averageGrowthPerSec * 60), '/ minute');
  console.log('   Largest spike:', formatBytes(maxIncrease), 'at', maxIncreaseTime);
  
  // Memory leak detection
  const leakThreshold = 1048576; // 1MB per minute
  const growthPerMinute = averageGrowthPerSec * 60;
  
  if (growthPerMinute > leakThreshold) {
    console.log('\n⚠️  POTENTIAL MEMORY LEAK DETECTED!');
    console.log('   Growing at', formatBytes(growthPerMinute), 'per minute');
    console.log('   This will cause issues in ~', Math.floor(100 / (growthPerMinute / 1048576)), 'minutes');
  } else {
    console.log('\n✅ Memory usage appears stable');
  }
  
  console.log('\n💾 Heap Limit:', formatBytes(last.jsHeapSizeLimit));
  console.log('📊 Memory Used:', (last.usedJSHeapSize / last.jsHeapSizeLimit * 100).toFixed(1) + '%');
  console.log('\n💡 Tips:');
  console.log('   • Look for patterns before big spikes');
  console.log('   • Check Chrome DevTools → Memory → Take Heap Snapshot');
  console.log('   • Compare snapshots to find retained objects');
  console.log('=====================================\n');
  
  return {
    duration: durationSec,
    startMemory: first.usedJSHeapSize,
    endMemory: last.usedJSHeapSize,
    totalGrowth: totalDelta,
    growthPerSecond: averageGrowthPerSec,
    growthPerMinute: growthPerMinute,
    snapshots: memorySnapshots,
  };
};

window.clearMemorySnapshots = () => {
  memorySnapshots = [];
  console.log('🗑️  Memory snapshots cleared');
};

// Auto-expose on load
if (typeof window !== 'undefined') {
  console.log('🔧 Memory debugger loaded!');
  console.log('📋 Available commands:');
  console.log('   window.startMemoryMonitor() - Start monitoring');
  console.log('   window.stopMemoryMonitor() - Stop monitoring');
  console.log('   window.getMemoryReport() - Get detailed report');
  console.log('   window.clearMemorySnapshots() - Clear data');
}

export { captureMemory, formatBytes };

