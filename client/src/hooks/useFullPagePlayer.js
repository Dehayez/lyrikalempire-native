import { useEffect, useCallback } from 'react';
import { isMobileOrTablet, slideIn, slideOut } from '../utils';

export const useFullPagePlayer = ({
  isFullPage,
  setIsFullPage,
  isFullPageVisible,
  setIsFullPageVisible,
  fullPagePlayerRef,
  fullPageOverlayRef,
  lyricsModal,
  isReturningFromLyrics,
  setIsReturningFromLyrics
}) => {
  // Toggle full page player visibility
  const toggleFullPagePlayer = useCallback(() => {
    // Don't allow opening full page player when lyrics modal is open on mobile
    if (isMobileOrTablet() && lyricsModal) {
      return;
    }

    if (!isFullPage) {
      setIsFullPage(true);
      setIsReturningFromLyrics(false); // Reset flag when manually opening

      // Use multiple requestAnimationFrame calls to ensure element is in DOM
      requestAnimationFrame(() => {
        setIsFullPageVisible(true);
        
        // Wait an additional frame to ensure the component has rendered
        requestAnimationFrame(() => {
          if (fullPagePlayerRef.current) {
            slideIn(fullPagePlayerRef.current);
          }
        });
      });
    } else {
      slideOut(fullPagePlayerRef.current, fullPageOverlayRef.current, () => {
        setIsFullPage(false);
        setIsFullPageVisible(false);
        setIsReturningFromLyrics(false); // Reset flag when closing
      });
    }
  }, [
    isFullPage,
    setIsFullPage,
    setIsFullPageVisible,
    fullPagePlayerRef,
    fullPageOverlayRef,
    lyricsModal,
    setIsReturningFromLyrics
  ]);

  // Handle lyrics modal and full page player interaction
  useEffect(() => {
    if (isMobileOrTablet() && lyricsModal && isFullPage) {
      // Mark that we're going to return from lyrics modal
      setIsReturningFromLyrics(true);
      // Smoothly close the full page player
      slideOut(fullPagePlayerRef.current, fullPageOverlayRef.current, () => {
        setIsFullPageVisible(false);
      });
    } else if (isMobileOrTablet() && !lyricsModal && isFullPage && !isFullPageVisible) {
      // Re-open full page player when lyrics modal closes (if it was open before)
      requestAnimationFrame(() => {
        setIsFullPageVisible(true);
        
        // Wait an additional frame to ensure the component has rendered
        requestAnimationFrame(() => {
          if (fullPagePlayerRef.current) {
            // Only slide in if we're not returning from lyrics modal
            if (!isReturningFromLyrics) {
              slideIn(fullPagePlayerRef.current);
            } else {
              // Just show without animation and reset the flag
              fullPagePlayerRef.current.style.transform = 'translateY(0)';
              fullPagePlayerRef.current.style.opacity = '1';
              setIsReturningFromLyrics(false);
            }
          }
        });
      });
    }
  }, [
    lyricsModal,
    isFullPage,
    isFullPageVisible,
    isReturningFromLyrics,
    fullPagePlayerRef,
    fullPageOverlayRef,
    setIsFullPageVisible,
    setIsReturningFromLyrics
  ]);

  return {
    toggleFullPagePlayer
  };
}; 