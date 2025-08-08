import React, { useState, useEffect } from 'react';
import { IoSpeedometer, IoWifi, IoWifiOutline, IoClose, IoRefresh, IoStatsChart } from 'react-icons/io5';
import networkThrottleService from '../../services/networkThrottleService';
import usePerformanceMonitor from '../../hooks/usePerformanceMonitor';
import './PerformancePanel.scss';

const PerformancePanel = ({
  isOpen,
  onClose,
  // Controlled props (optional)
  networkConfig: controlledNetworkConfig,
  onUpdateNetworkConfig,
  selectedPreset: controlledPreset,
  onChangePreset,
  isThrottlingEnabled: controlledIsThrottlingEnabled,
  onToggleThrottling
}) => {
  const [uncontrolledNetworkConfig, setUncontrolledNetworkConfig] = useState(() => {
    const saved = localStorage.getItem('networkThrottleConfig');
    return saved ? JSON.parse(saved) : {
      latency: 100,
      downloadSpeed: 1024 * 1024,
      uploadSpeed: 512 * 1024,
      packetLoss: 0
    };
  });
  const [uncontrolledPreset, setUncontrolledPreset] = useState(() => localStorage.getItem('networkThrottlePreset') || 'Custom');
  const [uncontrolledIsEnabled, setUncontrolledIsEnabled] = useState(() => !!JSON.parse(localStorage.getItem('isThrottlingEnabled') || 'false'));

  const networkConfig = controlledNetworkConfig ?? uncontrolledNetworkConfig;
  const selectedPreset = controlledPreset ?? uncontrolledPreset;
  const isThrottlingEnabled = controlledIsThrottlingEnabled ?? uncontrolledIsEnabled;
  
  const { metrics } = usePerformanceMonitor('PerformancePanel');

  const presets = networkThrottleService.getPresets();

  useEffect(() => {
    const status = networkThrottleService.getStatus();
    if (controlledIsThrottlingEnabled === undefined) {
      setUncontrolledIsEnabled(status.isEnabled);
    }
  }, [controlledIsThrottlingEnabled]);

  const handlePresetChange = (presetName) => {
    if (onChangePreset) onChangePreset(presetName);
    else setUncontrolledPreset(presetName);

    if (presetName === 'Custom') {
      localStorage.setItem('networkThrottlePreset', 'Custom');
      return;
    }

    const preset = presets[presetName];
    if (onUpdateNetworkConfig) onUpdateNetworkConfig(preset);
    else setUncontrolledNetworkConfig(preset);
    localStorage.setItem('networkThrottlePreset', presetName);
    localStorage.setItem('networkThrottleConfig', JSON.stringify(preset));
    
    if (isThrottlingEnabled) {
      networkThrottleService.enable(preset);
    }
  };

  const handleConfigChange = (field, value) => {
    const newConfig = { ...networkConfig, [field]: value };
    if (onUpdateNetworkConfig) onUpdateNetworkConfig(newConfig);
    else setUncontrolledNetworkConfig(newConfig);
    localStorage.setItem('networkThrottleConfig', JSON.stringify(newConfig));
    
    if (isThrottlingEnabled) {
      networkThrottleService.enable(newConfig);
    }
  };

  const toggleThrottling = () => {
    const next = !isThrottlingEnabled;
    if (next) {
      networkThrottleService.enable(networkConfig);
    } else {
      networkThrottleService.disable();
    }
    localStorage.setItem('isThrottlingEnabled', JSON.stringify(next));
    if (onToggleThrottling) onToggleThrottling(next);
    else setUncontrolledIsEnabled(next);
  };

  const formatSpeed = (bytesPerSecond) => {
    if (bytesPerSecond >= 1024 * 1024) {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)}MB/s`;
    } else if (bytesPerSecond >= 1024) {
      return `${(bytesPerSecond / 1024).toFixed(1)}KB/s`;
    } else {
      return `${bytesPerSecond.toFixed(0)}B/s`;
    }
  };

  const formatLatency = (ms) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  const getPerformanceStatus = () => {
    const { lastRenderTime, memoryUsage, networkLatency } = metrics;
    
    let status = 'Good';
    let color = '#4CAF50';
    
    if (lastRenderTime > 50 || networkLatency > 2000 || 
        (memoryUsage && memoryUsage.used > memoryUsage.limit * 0.9)) {
      status = 'Poor';
      color = '#F44336';
    } else if (lastRenderTime > 16 || networkLatency > 1000 || 
               (memoryUsage && memoryUsage.used > memoryUsage.limit * 0.7)) {
      status = 'Fair';
      color = '#FF9800';
    }
    
    return { status, color };
  };

  const { status: performanceStatus, color: statusColor } = getPerformanceStatus();

  if (!isOpen) return null;

  return (
    <div className="performance-panel">
      <div className="performance-panel__header">
        <div className="performance-panel__title">
          <IoSpeedometer />
          <span>Performance Testing</span>
        </div>
        <button 
          className="performance-panel__close"
          onClick={onClose}
          aria-label="Close performance panel"
        >
          <IoClose />
        </button>
      </div>

      <div className="performance-panel__content">
        {/* Network Throttling Section */}
        <section className="performance-panel__section">
          <h3 className="performance-panel__section-title">
            <IoWifi />
            Network Throttling
          </h3>
          
          <div className="performance-panel__throttle-controls">
            <div className="performance-panel__preset-selector">
              <label>Preset:</label>
              <select 
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                <option value="Custom">Custom</option>
                {Object.keys(presets).map(preset => (
                  <option key={preset} value={preset}>{preset}</option>
                ))}
              </select>
            </div>

            <button 
              className={`performance-panel__toggle ${isThrottlingEnabled ? 'performance-panel__toggle--active' : ''}`}
              onClick={toggleThrottling}
            >
              {isThrottlingEnabled ? <IoWifi /> : <IoWifiOutline />}
              {isThrottlingEnabled ? 'Disable' : 'Enable'} Throttling
            </button>
          </div>

          <div className="performance-panel__config-grid">
            <div className="performance-panel__config-item">
              <label>Latency (ms)</label>
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                value={networkConfig.latency}
                onChange={(e) => handleConfigChange('latency', parseInt(e.target.value))}
              />
              <span>{formatLatency(networkConfig.latency)}</span>
            </div>

            <div className="performance-panel__config-item">
              <label>Download Speed</label>
              <input
                type="range"
                min="1024"
                max="10 * 1024 * 1024"
                step="1024 * 1024"
                value={networkConfig.downloadSpeed}
                onChange={(e) => handleConfigChange('downloadSpeed', parseInt(e.target.value))}
              />
              <span>{formatSpeed(networkConfig.downloadSpeed)}</span>
            </div>

            <div className="performance-panel__config-item">
              <label>Upload Speed</label>
              <input
                type="range"
                min="1024"
                max="5 * 1024 * 1024"
                step="512 * 1024"
                value={networkConfig.uploadSpeed}
                onChange={(e) => handleConfigChange('uploadSpeed', parseInt(e.target.value))}
              />
              <span>{formatSpeed(networkConfig.uploadSpeed)}</span>
            </div>

            <div className="performance-panel__config-item">
              <label>Packet Loss (%)</label>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={networkConfig.packetLoss * 100}
                onChange={(e) => handleConfigChange('packetLoss', parseInt(e.target.value) / 100)}
              />
              <span>{(networkConfig.packetLoss * 100).toFixed(1)}%</span>
            </div>
          </div>
        </section>

        {/* Performance Metrics Section */}
        <section className="performance-panel__section">
          <h3 className="performance-panel__section-title">
            <IoStatsChart />
            Performance Metrics
          </h3>
          
          <div className="performance-panel__metrics">
            <div className="performance-panel__metric">
              <span className="performance-panel__metric-label">Status:</span>
              <span 
                className="performance-panel__metric-value"
                style={{ color: statusColor }}
              >
                {performanceStatus}
              </span>
            </div>

            <div className="performance-panel__metric">
              <span className="performance-panel__metric-label">Render Time:</span>
              <span className="performance-panel__metric-value">
                {metrics.lastRenderTime.toFixed(2)}ms
              </span>
            </div>

            <div className="performance-panel__metric">
              <span className="performance-panel__metric-label">Avg Render:</span>
              <span className="performance-panel__metric-value">
                {metrics.averageRenderTime.toFixed(2)}ms
              </span>
            </div>

            <div className="performance-panel__metric">
              <span className="performance-panel__metric-label">Render Count:</span>
              <span className="performance-panel__metric-value">
                {metrics.renderCount}
              </span>
            </div>

            {metrics.memoryUsage && (
              <>
                <div className="performance-panel__metric">
                  <span className="performance-panel__metric-label">Memory Used:</span>
                  <span className="performance-panel__metric-value">
                    {metrics.memoryUsage.used}MB
                  </span>
                </div>
                <div className="performance-panel__metric">
                  <span className="performance-panel__metric-label">Memory Limit:</span>
                  <span className="performance-panel__metric-value">
                    {metrics.memoryUsage.limit}MB
                  </span>
                </div>
              </>
            )}

            <div className="performance-panel__metric">
              <span className="performance-panel__metric-label">Network Requests:</span>
              <span className="performance-panel__metric-value">
                {metrics.networkRequests}
              </span>
            </div>

            <div className="performance-panel__metric">
              <span className="performance-panel__metric-label">Last Network Latency:</span>
              <span className="performance-panel__metric-value">
                {metrics.networkLatency.toFixed(2)}ms
              </span>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="performance-panel__section">
          <h3 className="performance-panel__section-title">Quick Actions</h3>
          
          <div className="performance-panel__actions">
            <button 
              className="performance-panel__action"
              onClick={() => window.location.reload()}
            >
              <IoRefresh />
              Reload Page
            </button>
            
            <button 
              className="performance-panel__action"
              onClick={() => {
                if (window.gc) {
                  window.gc();
                  console.log('[Performance] Garbage collection triggered');
                }
              }}
            >
              <IoStatsChart />
              Force GC
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PerformancePanel; 