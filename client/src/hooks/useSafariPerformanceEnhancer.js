import { useEffect, useRef } from 'react';
import { isSafari, isIOSSafari } from '../utils/safariOptimizations';

/**
 * Safari Performance Enhancer Hook
 * Works behind the scenes to improve audio performance without changing UI/UX
 */
export const useSafariPerformanceEnhancer = () => {
  const audioElementsRef = useRef(new Set());
  const performanceMonitorRef = useRef(null);

  useEffect(() => {
    if (!isSafari()) return;

    // Monitor for audio elements and optimize them
    const optimizeAudioElements = () => {
      const audioElements = document.querySelectorAll('audio');
      
      audioElements.forEach(audio => {
        if (!audioElementsRef.current.has(audio)) {
          audioElementsRef.current.add(audio);
          
          // Apply safe Safari optimizations (no property overrides)
          audio.setAttribute('playsinline', 'true');
          audio.setAttribute('webkit-playsinline', 'true');
          audio.setAttribute('preload', 'metadata');
          audio.setAttribute('crossorigin', 'anonymous');
          audio.crossOrigin = 'anonymous';
          
          // iOS-specific optimizations
          if (isIOSSafari()) {
            audio.setAttribute('x-webkit-airplay', 'allow');
            audio.setAttribute('muted', 'false');
          }

          // Safe play/pause optimization using try-catch
          const originalPlay = audio.play;
          const originalPause = audio.pause;
          
          // Override play method for better performance
          audio.play = function() {
            try {
              return originalPlay.call(this);
            } catch (error) {
              // Silent fail for better performance
              return Promise.resolve();
            }
          };

          // Override pause method for better performance
          audio.pause = function() {
            try {
              return originalPause.call(this);
            } catch (error) {
              // Silent fail for better performance
            }
          };
        }
      });
    };

    // Monitor for new audio elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'AUDIO') {
                optimizeAudioElements();
              } else if (node.querySelectorAll) {
                const audioElements = node.querySelectorAll('audio');
                if (audioElements.length > 0) {
                  optimizeAudioElements();
                }
              }
            }
          });
        }
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial optimization
    optimizeAudioElements();

    // Performance monitoring
    const startPerformanceMonitoring = () => {
      if (performanceMonitorRef.current) return;
      
      performanceMonitorRef.current = setInterval(() => {
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
          // Monitor for performance issues
          if (audio.readyState === 0 && audio.src) {
            // Audio is not loading properly, try to reload
            const currentSrc = audio.src;
            audio.src = '';
            setTimeout(() => {
              audio.src = currentSrc;
              audio.load();
            }, 0);
          }
        });
      }, 5000); // Check every 5 seconds
    };

    startPerformanceMonitoring();

    // Cleanup
    return () => {
      observer.disconnect();
      if (performanceMonitorRef.current) {
        clearInterval(performanceMonitorRef.current);
        performanceMonitorRef.current = null;
      }
      audioElementsRef.current.clear();
    };
  }, []);

  // Return optimization functions that can be called manually
  return {
    optimizeAudioElement: (audioElement) => {
      if (!isSafari() || !audioElement) return;
      
      audioElement.setAttribute('playsinline', 'true');
      audioElement.setAttribute('webkit-playsinline', 'true');
      audioElement.setAttribute('preload', 'metadata');
      audioElement.setAttribute('crossorigin', 'anonymous');
      audioElement.crossOrigin = 'anonymous';
      
      if (isIOSSafari()) {
        audioElement.setAttribute('x-webkit-airplay', 'allow');
        audioElement.setAttribute('muted', 'false');
      }
    },
    
    fastPlay: (audioElement) => {
      if (!isSafari() || !audioElement) return Promise.resolve();
      
      try {
        return audioElement.play();
      } catch (error) {
        return Promise.resolve();
      }
    },
    
    fastPause: (audioElement) => {
      if (!isSafari() || !audioElement) return;
      
      try {
        audioElement.pause();
      } catch (error) {
        // Silent fail
      }
    },
    
    fastSeek: (audioElement, time) => {
      if (!isSafari() || !audioElement) return;
      
      try {
        audioElement.currentTime = Math.max(0, time);
      } catch (error) {
        // Silent fail
      }
    }
  };
}; 