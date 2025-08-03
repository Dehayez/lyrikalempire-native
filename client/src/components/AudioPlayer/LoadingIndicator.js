import React, { useMemo } from 'react';
import './LoadingIndicator.scss';

const LoadingIndicator = ({ 
  progress = 0,
  phase = 'loading',
  showText = false,
  size = 'medium',
  className = ''
}) => {
  const phaseText = useMemo(() => {
    switch (phase) {
      case 'loading':
        return 'Loading...';
      case 'buffering':
        return 'Buffering...';
      case 'error':
        return 'Error loading audio';
      case 'ready':
        return 'Ready';
      default:
        return '';
    }
  }, [phase]);

  const strokeDasharray = useMemo(() => {
    const circumference = 2 * Math.PI * 47; // radius = 47
    return `${(progress / 100) * circumference} ${circumference}`;
  }, [progress]);

  return (
    <div className={`loading-indicator loading-indicator--${size} ${className}`}>
      <svg viewBox="0 0 100 100" className="loading-indicator__svg">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="47"
          className="loading-indicator__background"
        />
        
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="47"
          className={`loading-indicator__progress loading-indicator__progress--${phase}`}
          style={{
            strokeDasharray,
            strokeDashoffset: '0'
          }}
        />

        {/* Error X or Success ✓ */}
        {phase === 'error' && (
          <g className="loading-indicator__error">
            <line x1="35" y1="35" x2="65" y2="65" />
            <line x1="35" y1="65" x2="65" y2="35" />
          </g>
        )}
        {phase === 'ready' && (
          <path
            className="loading-indicator__success"
            d="M30 50 L45 65 L70 35"
          />
        )}
      </svg>

      {showText && (
        <div className="loading-indicator__text">
          <span className="loading-indicator__phase">{phaseText}</span>
          {phase === 'loading' && (
            <span className="loading-indicator__percentage">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(LoadingIndicator);