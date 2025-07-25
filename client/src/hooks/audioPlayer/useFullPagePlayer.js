import { useEffect, useCallback } from 'react';
import { isMobileOrTablet, slideIn, slideOut } from '../../utils';

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
  // Toggle full page player visibility - simplified approach like original
  const toggleFullPagePlayer = useCallback(() => {
    // Don't allow opening full page player when lyrics modal is open on mobile
    if (isMobileOrTablet() && lyricsModal) {
      return;
    }

    if (!isFullPage) {
      setIsFullPage(true);
      setIsReturningFromLyrics(false);

      // Use the original simple approach
      requestAnimationFrame(() => {
        setIsFullPageVisible(true);
        
        requestAnimationFrame(() => {
          if (fullPagePlayerRef.current) {
            // Use the original slideIn function - no custom overrides
            slideIn(fullPagePlayerRef.current);
          }
        });
      });
    } else {
      slideOut(fullPagePlayerRef.current, fullPageOverlayRef.current, () => {
        setIsFullPage(false);
        setIsFullPageVisible(false);
        setIsReturningFromLyrics(false);
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
    const isMobile = isMobileOrTablet();
    
    if (isMobile && lyricsModal && isFullPage) {
      // Close full page player when lyrics modal opens
      setIsReturningFromLyrics(true);
      slideOut(fullPagePlayerRef.current, fullPageOverlayRef.current, () => {
        setIsFullPageVisible(false);
      });
    } else if (isMobile && !lyricsModal && isFullPage && !isFullPageVisible) {
      // Re-open full page player when lyrics modal closes
      requestAnimationFrame(() => {
        setIsFullPageVisible(true);
        
        requestAnimationFrame(() => {
          if (fullPagePlayerRef.current) {
            if (!isReturningFromLyrics) {
              // Use original slideIn function
              slideIn(fullPagePlayerRef.current);
            } else {
              // Show without animation - minimal style changes
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