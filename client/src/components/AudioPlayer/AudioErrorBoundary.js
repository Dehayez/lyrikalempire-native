import React from 'react';
import { LoadingIndicator } from './LoadingIndicator';
import './AudioErrorBoundary.scss';

class AudioErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error details
    console.error('Audio Player Error:', {
      error,
      errorInfo,
      componentStack: errorInfo?.componentStack,
      currentBeat: this.props.currentBeat
    });
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));

    // Call parent's retry handler if provided
    this.props.onRetry?.();
  }

  handleSkip = () => {
    // Skip to next track
    this.props.onNext?.();
    
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="audio-error">
          <div className="audio-error__content">
            <LoadingIndicator
              progress={100}
              phase="error"
              size="large"
              showText={false}
            />
            
            <div className="audio-error__message">
              <h3>Playback Error</h3>
              <p>
                {this.state.error?.message || 'An error occurred during playback'}
              </p>
            </div>

            <div className="audio-error__actions">
              {this.state.retryCount < 3 && (
                <button
                  className="audio-error__button audio-error__button--retry"
                  onClick={this.handleRetry}
                >
                  Try Again
                </button>
              )}
              
              <button
                className="audio-error__button audio-error__button--skip"
                onClick={this.handleSkip}
              >
                Skip Track
              </button>
            </div>

            {this.props.showDebugInfo && (
              <details className="audio-error__debug">
                <summary>Error Details</summary>
                <pre>
                  {this.state.error?.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}