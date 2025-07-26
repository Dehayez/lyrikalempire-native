import { useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { isMobileOrTablet } from '../utils';

export const useWaveform = ({
  audioSrc,
  isFullPage,
  waveform,
  wavesurfer,
  waveformRefDesktop,
  waveformRefFullPage,
  playerRef,
  isFullPageVisible
}) => {
  // Initialize and load waveform
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const loadWaveform = async () => {
      const container = isFullPage ? waveformRefFullPage.current : waveformRefDesktop.current;

      if (container && audioSrc && waveform) {
        if (wavesurfer.current) {
          wavesurfer.current.destroy();
          window.globalWavesurfer = null; // Clean up global reference
        }

        wavesurfer.current = WaveSurfer.create({
          container,
          waveColor: '#828282',
          progressColor: '#FFCC44',
          height: 80,
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
          const response = await fetch(audioSrc, { signal });
          if (!response.ok) throw new Error('Network response was not ok');
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          wavesurfer.current.load(url);
          wavesurfer.current.setVolume(0);
          
          wavesurfer.current.on('ready', () => {
            const mainAudio = playerRef.current?.audio.current;
            const duration = wavesurfer.current.getDuration();
            if (mainAudio && !isNaN(mainAudio.currentTime) && duration > 0) {
              wavesurfer.current.seekTo(mainAudio.currentTime / duration);
            }
          });
        } catch (error) {
          if (error.name !== 'AbortError') console.error("Error loading audio source:", error);
        }
      }
    };

    if (waveform) {
      const timer = setTimeout(loadWaveform, 100);
      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    } else {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
        wavesurfer.current = null;
        window.globalWavesurfer = null; // Clean up global reference
      }
    }

    return () => {
      controller.abort();
    };
  }, [audioSrc, isFullPage, waveform, wavesurfer, waveformRefDesktop, waveformRefFullPage, playerRef]);

  // Position waveform in the correct container
  useEffect(() => {
    if (!waveform) return;

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
      const waveformEl = isFullPage ? waveformRefFullPage.current : waveformRefDesktop.current;

      if (container && waveformEl && !container.contains(waveformEl)) {
        if (waveformEl.parentElement && waveformEl.parentElement.classList.contains('rhap_progress-container')) {
          waveformEl.parentElement.removeChild(waveformEl);
        }

        container.style.position = 'relative';
        waveformEl.style.position = 'absolute';
        waveformEl.style.top = '-30px';
        waveformEl.style.left = '0';
        waveformEl.style.width = '100%';
        waveformEl.style.height = '100%';
        waveformEl.style.zIndex = '0';
        waveformEl.style.pointerEvents = 'none';

        container.prepend(waveformEl);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [waveform, isFullPage, isFullPageVisible, waveformRefDesktop, waveformRefFullPage]);
}; 