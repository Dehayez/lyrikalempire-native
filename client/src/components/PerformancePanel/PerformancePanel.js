import React, { useState, useEffect } from 'react';
import { useMobilePerformanceMonitor } from '../../hooks/useMobilePerformanceMonitor';
import networkThrottleService from '../../services/networkThrottleService';
import './PerformancePanel.scss';

const PerformancePanel = ({
  isOpen,
  onClose,
  networkConfig, 
  onUpdateNetworkConfig,
  selectedPreset, 
  onChangePreset,
  isThrottlingEnabled, 
  onToggleThrottling
}) => {
  const { metrics, alerts, clearAlerts, getReport, logReport, exportData } = useMobilePerformanceMonitor('PerformancePanel');
  const [detailedReport, setDetailedReport] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('performance'); // 'performance' or 'network'

  useEffect(() => {
    if (isOpen) {
      const report = getReport();
      setDetailedReport(report);
    }
  }, [isOpen, getReport]);

  // Apply throttling when config changes
  useEffect(() => {
    if (isThrottlingEnabled) {
      networkThrottleService.enable(networkConfig);
    }
  }, [networkConfig, isThrottlingEnabled]);

  const handleExportData = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (value, thresholds) => {
    if (value >= thresholds.high) return '#ff4444';
    if (value >= thresholds.medium) return '#ffaa00';
    return '#44ff44';
  };

  const cpuColor = getStatusColor(metrics.cpuUsage, { medium: 50, high: 80 });
  const memoryColor = getStatusColor(metrics.memoryUsage, { medium: 300, high: 500 });
  const renderColor = getStatusColor(metrics.renderTime, { medium: 8, high: 16 });

  // Network throttling handlers
  const handlePresetChange = (preset) => {
    onChangePreset(preset);
    if (preset !== 'Custom') {
      const presets = networkThrottleService.getPresets();
      onUpdateNetworkConfig(presets[preset]);
    }
  };

  const handleToggleThrottling = () => {
    const newState = !isThrottlingEnabled;
    onToggleThrottling(newState);
    
    // Apply throttling immediately
    if (newState) {
      networkThrottleService.enable(networkConfig);
    } else {
      networkThrottleService.disable();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="performance-panel">
      <div className="performance-panel__header">
        <h3 className="performance-panel__title">Performance Monitor</h3>
        <button className="performance-panel__close" onClick={onClose}>×</button>
        </div>

      {/* Tab Toggle */}
      <div className="performance-panel__tabs">
        <button 
          className={`performance-panel__tab ${activeTab === 'performance' ? 'performance-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
        <button 
          className={`performance-panel__tab ${activeTab === 'network' ? 'performance-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          Network
        </button>
      </div>

      <div className="performance-panel__content">
        {activeTab === 'performance' && (
          <>
            {/* Performance Metrics */}
            <div className="performance-panel__metrics">
          <div className="performance-panel__metric">
            <div className="performance-panel__metric-label">CPU Usage</div>
            <div 
              className="performance-panel__metric-value" 
              style={{ color: cpuColor }}
            >
              {metrics.cpuUsage.toFixed(1)}%
            </div>
            <div className="performance-panel__metric-bar">
              <div 
                className="performance-panel__metric-fill"
                style={{ 
                  width: `${Math.min(100, metrics.cpuUsage)}%`,
                  backgroundColor: cpuColor
                }}
              />
            </div>
            </div>

          <div className="performance-panel__metric">
            <div className="performance-panel__metric-label">Memory Usage</div>
            <div 
              className="performance-panel__metric-value" 
              style={{ color: memoryColor }}
            >
              {metrics.memoryUsage.toFixed(0)}MB
            </div>
            <div className="performance-panel__metric-bar">
              <div 
                className="performance-panel__metric-fill"
                style={{ 
                  width: `${Math.min(100, (metrics.memoryUsage / 1000) * 100)}%`,
                  backgroundColor: memoryColor
                }}
              />
            </div>
          </div>

            <div className="performance-panel__metric">
            <div className="performance-panel__metric-label">Render Time</div>
            <div 
                className="performance-panel__metric-value"
              style={{ color: renderColor }}
              >
              {metrics.renderTime.toFixed(1)}ms
            </div>
            <div className="performance-panel__metric-bar">
              <div 
                className="performance-panel__metric-fill"
                style={{ 
                  width: `${Math.min(100, (metrics.renderTime / 33) * 100)}%`,
                  backgroundColor: renderColor
                }}
              />
            </div>
            </div>

            <div className="performance-panel__metric">
            <div className="performance-panel__metric-label">API Calls</div>
            <div className="performance-panel__metric-value">
              {metrics.apiCalls}
            </div>
          </div>
            </div>

        {/* Overheating Warning */}
        {metrics.isOverheating && (
          <div className="performance-panel__warning">
            <div className="performance-panel__warning-icon">⚠️</div>
            <div className="performance-panel__warning-text">
              Device overheating detected! Check alerts below for details.
                </div>
                </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="performance-panel__alerts">
            <div className="performance-panel__alerts-header">
              <h4>Performance Alerts ({alerts.length})</h4>
              <button 
                className="performance-panel__clear-alerts"
                onClick={clearAlerts}
              >
                Clear
              </button>
            </div>
            <div className="performance-panel__alerts-list">
              {alerts.map((alert, index) => (
                <div 
                  key={index} 
                  className={`performance-panel__alert performance-panel__alert--${alert.type}`}
                >
                  <div className="performance-panel__alert-message">
                    {alert.message}
                  </div>
                  <div className="performance-panel__alert-time">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Report */}
        <div className="performance-panel__detailed">
          <button 
            className="performance-panel__toggle-details"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide' : 'Show'} Detailed Report
          </button>
          
          {isExpanded && detailedReport && (
            <div className="performance-panel__details">
              <div className="performance-panel__detail-item">
                <span className="performance-panel__detail-label">Uptime:</span>
                <span className="performance-panel__detail-value">{detailedReport.uptime}s</span>
              </div>
              <div className="performance-panel__detail-item">
                <span className="performance-panel__detail-label">Avg API Latency:</span>
                <span className="performance-panel__detail-value">{detailedReport.avgApiLatency}ms</span>
              </div>
              <div className="performance-panel__detail-item">
                <span className="performance-panel__detail-label">Active Intervals:</span>
                <span className="performance-panel__detail-value">{detailedReport.activeIntervals}</span>
              </div>
              <div className="performance-panel__detail-item">
                <span className="performance-panel__detail-label">Active Timeouts:</span>
                <span className="performance-panel__detail-value">{detailedReport.activeTimeouts}</span>
              </div>
              <div className="performance-panel__detail-item">
                <span className="performance-panel__detail-label">DOM Mutations:</span>
                <span className="performance-panel__detail-value">{detailedReport.totalDomMutations}</span>
              </div>
              <div className="performance-panel__detail-item">
                <span className="performance-panel__detail-label">Audio Operations:</span>
                <span className="performance-panel__detail-value">{detailedReport.totalAudioOperations}</span>
              </div>
            </div>
          )}
        </div>

            {/* Actions */}
          <div className="performance-panel__actions">
            <button 
              className="performance-panel__action"
                onClick={logReport}
            >
                Log Report to Console
            </button>
            <button 
              className="performance-panel__action"
                onClick={handleExportData}
              >
                Export Data
            </button>
          </div>
          </>
        )}

        {activeTab === 'network' && (
          <>
            {/* Network Throttling Controls */}
            <div className="performance-panel__network">
              <div className="performance-panel__section">
                <h4 className="performance-panel__section-title">Network Throttling</h4>
                
                <div className="performance-panel__toggle">
                  <label className="performance-panel__toggle-label">
                    <input
                      type="checkbox"
                      checked={isThrottlingEnabled}
                      onChange={handleToggleThrottling}
                    />
                    Enable Network Throttling
                  </label>
                </div>

                {isThrottlingEnabled && (
                  <>
                    <div className="performance-panel__preset">
                      <label className="performance-panel__label">Preset:</label>
                      <select 
                        value={selectedPreset} 
                        onChange={(e) => handlePresetChange(e.target.value)}
                        className="performance-panel__select"
                      >
                        <option value="Custom">Custom</option>
                        <option value="Fast 3G">Fast 3G</option>
                        <option value="Slow 3G">Slow 3G</option>
                        <option value="2G">2G</option>
                        <option value="Dial-up">Dial-up</option>
                      </select>
                    </div>

                    <div className="performance-panel__config">
                      <div className="performance-panel__config-item">
                        <label className="performance-panel__label">Latency (ms):</label>
                        <input
                          type="number"
                          value={networkConfig.latency}
                          onChange={(e) => onUpdateNetworkConfig({...networkConfig, latency: parseInt(e.target.value)})}
                          className="performance-panel__input"
                        />
                      </div>
                      
                      <div className="performance-panel__config-item">
                        <label className="performance-panel__label">Download Speed (KB/s):</label>
                        <input
                          type="number"
                          value={Math.round(networkConfig.downloadSpeed / 1024)}
                          onChange={(e) => onUpdateNetworkConfig({...networkConfig, downloadSpeed: parseInt(e.target.value) * 1024})}
                          className="performance-panel__input"
                        />
                      </div>
                      
                      <div className="performance-panel__config-item">
                        <label className="performance-panel__label">Upload Speed (KB/s):</label>
                        <input
                          type="number"
                          value={Math.round(networkConfig.uploadSpeed / 1024)}
                          onChange={(e) => onUpdateNetworkConfig({...networkConfig, uploadSpeed: parseInt(e.target.value) * 1024})}
                          className="performance-panel__input"
                        />
                      </div>
                      
                      <div className="performance-panel__config-item">
                        <label className="performance-panel__label">Packet Loss (%):</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={networkConfig.packetLoss * 100}
                          onChange={(e) => onUpdateNetworkConfig({...networkConfig, packetLoss: parseFloat(e.target.value) / 100})}
                          className="performance-panel__input"
                        />
                      </div>
                    </div>

                    <div className="performance-panel__status">
                      <div className="performance-panel__status-item">
                        <span className="performance-panel__status-label">Status:</span>
                        <span className="performance-panel__status-value performance-panel__status-value--active">
                          Active
                        </span>
                      </div>
                      <div className="performance-panel__status-item">
                        <span className="performance-panel__status-label">Current Settings:</span>
                        <span className="performance-panel__status-value">
                          {networkConfig.latency}ms, {Math.round(networkConfig.downloadSpeed / 1024)}KB/s down, {Math.round(networkConfig.uploadSpeed / 1024)}KB/s up
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PerformancePanel; 