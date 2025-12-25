import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { isMobileOrTablet } from '../utils';

export const useWaveform = ({
  audioSrc,
  isFullPage,
  waveform,
  wavesurfer,
  waveformRefDesktop,
  waveformRefFullPage,
  waveformRefMobile,
  playerRef,
  isFullPageVisible
}) => {
  const retryCountRef = useRef(0);
  const maxRetries = 2;
  // Initialize and load waveform
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const loadWaveform = async () => {
      // Determine which container to use based on device and view
      let container;
      if (isFullPage) {
        container = waveformRefFullPage.current;
      } else if (isMobileOrTablet()) {
        container = waveformRefMobile?.current;
      } else {
        container = waveformRefDesktop.current;
      }

      // Avoid initializing on hidden full-page container
      if (isFullPage && !isFullPageVisible) return;

      if (container && audioSrc) {
        // Ensure container has a measurable width to avoid 0px canvas
        if (container.clientWidth === 0) {
          setTimeout(loadWaveform, 200);
          return;
        }
        if (wavesurfer.current) {
          try { wavesurfer.current.unAll && wavesurfer.current.unAll(); } catch (_) {}
          wavesurfer.current.destroy();
          window.globalWavesurfer = null; // Clean up global reference
        }

        // Use different height for mobile devices
        const waveformHeight = isMobileOrTablet() ? 60 : 80;
        
        wavesurfer.current = WaveSurfer.create({
          container,
          waveColor: '#828282',
          progressColor: '#FFCC44',
          height: waveformHeight,
          responsive: true,
          interact: false,
          cursorColor: '#FFCC44',
          cursorWidth: 0,
          partialRender: true,
          barWidth: 1,
          barGap: 2,
          barRadius: 0,
        });

        // Make wavesurfer instance globally accessible for drag interactions
        window.globalWavesurfer = wavesurfer.current;

        try {
          // Use XMLHttpRequest instead of fetch to avoid performance monitor interference
          const xhr = new XMLHttpRequest();
          xhr.open('GET', audioSrc, true);
          xhr.responseType = 'blob';
          
          const loadPromise = new Promise((resolve, reject) => {
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
              } else {
                reject(new Error(`Network response was not ok: ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.onabort = () => reject(new Error('Request aborted'));
          });
          
          // Handle abort signal
          if (signal) {
            signal.addEventListener('abort', () => xhr.abort());
          }
          
          xhr.send();
          const blob = await loadPromise;
          
          // Load the blob directly into WaveSurfer instead of creating a URL
          // This bypasses WaveSurfer's internal fetch calls
          wavesurfer.current.loadBlob(blob);
          wavesurfer.current.setVolume(0);

          // Handle successful decode/ready once
          const handleReady = () => {
            try { wavesurfer.current && wavesurfer.current.un && wavesurfer.current.un('ready', handleReady); } catch (_) {}
            const mainAudio = playerRef.current?.audio.current;
            const duration = wavesurfer.current.getDuration();
            if (mainAudio && !isNaN(mainAudio.currentTime) && duration > 0) {
              wavesurfer.current.seekTo(mainAudio.currentTime / duration);
            }
            // Ensure proper sizing after container becomes visible
            try {
              wavesurfer.current.drawer && wavesurfer.current.drawer.updateSize && wavesurfer.current.drawer.updateSize();
              wavesurfer.current.drawBuffer && wavesurfer.current.drawBuffer();
            } catch (_) {}
          };
          wavesurfer.current.on('ready', handleReady);

          // Basic error handling with limited retries
          wavesurfer.current.on('error', (err) => {
            if (retryCountRef.current >= maxRetries) return;
            retryCountRef.current += 1;
            try { wavesurfer.current.unAll && wavesurfer.current.unAll(); } catch (_) {}
            try { wavesurfer.current.destroy(); } catch (_) {}
            window.globalWavesurfer = null;
            setTimeout(() => {
              // If the effect is already cleaned up, do nothing
              if (signal.aborted) return;
              loadWaveform();
            }, 200);
          });
        } catch (error) {
          if (error.name !== 'AbortError') console.error("Error loading audio source:", error);
        }
      }
    };

    // Always load waveform for hover effects, but only show it when waveform toggle is on
    const timer = setTimeout(loadWaveform, 100);
    return () => {
      clearTimeout(timer);
      try { wavesurfer.current && wavesurfer.current.unAll && wavesurfer.current.unAll(); } catch (_) {}
      try { wavesurfer.current && wavesurfer.current.destroy && wavesurfer.current.destroy(); } catch (_) {}
      controller.abort();
    };
  }, [audioSrc, isFullPage, waveform, wavesurfer, waveformRefDesktop, waveformRefFullPage, waveformRefMobile, playerRef]);

  // Position waveform in the correct container (always, for hover effects)
  useEffect(() => {

    let containerSelector;
    if (isFullPage) {
      containerSelector = '.smooth-progress-bar--full-page .rhap_progress-container';
    } else if (isMobileOrTablet()) {
      containerSelector = '.smooth-progress-bar--mobile .rhap_progress-container';
    } else {
      containerSelector = '.smooth-progress-bar--desktop .rhap_progress-container';
    }

    const timer = setTimeout(() => {
      const container = document.querySelector(containerSelector);
      let waveformEl;
      if (isFullPage) {
        waveformEl = waveformRefFullPage.current;
      } else if (isMobileOrTablet()) {
        waveformEl = waveformRefMobile?.current;
      } else {
        waveformEl = waveformRefDesktop.current;
      }

      if (container && waveformEl && !container.contains(waveformEl)) {
        // Remove from any existing parent
        if (waveformEl.parentElement) {
          waveformEl.parentElement.removeChild(waveformEl);
        }

        // Set container styles
        container.style.position = 'relative';
        
        // Set waveform element styles based on device
        const isMobile = isMobileOrTablet();
        waveformEl.style.position = 'absolute';
        waveformEl.style.top = isMobile ? '-20px' : '-30px';
        waveformEl.style.left = '0';
        waveformEl.style.width = '100%';
        waveformEl.style.height = isMobile ? '60px' : '100%';
        waveformEl.style.zIndex = '0';
        waveformEl.style.pointerEvents = 'none';

        // Add to container
        container.prepend(waveformEl);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [waveform, isFullPage, isFullPageVisible, waveformRefDesktop, waveformRefFullPage, waveformRefMobile]);

  // Ensure waveform resizes/redraws when container visibility/size changes
  useEffect(() => {
    if (!wavesurfer.current) return;

    const redraw = () => {
      try {
        wavesurfer.current.drawer && wavesurfer.current.drawer.updateSize && wavesurfer.current.drawer.updateSize();
        wavesurfer.current.drawBuffer && wavesurfer.current.drawBuffer();
      } catch (_) {}
    };

    // Redraw shortly after visibility toggle
    const t = setTimeout(redraw, 120);

    // Redraw on window resize
    let frame = null;
    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        redraw();
      });
    };
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [waveform, isFullPageVisible, isFullPage, wavesurfer]);
}; 