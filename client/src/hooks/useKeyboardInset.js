import { useEffect } from 'react';

const getViewportMetrics = () => {
  const viewport = window.visualViewport;

  if (!viewport) {
    return {
      height: window.innerHeight,
      offsetTop: 0,
      keyboardInset: 0
    };
  }

  const height = Math.round(viewport.height);
  const offsetTop = Math.round(viewport.offsetTop);
  const keyboardInset = Math.max(0, Math.round(window.innerHeight - height - offsetTop));

  return { height, offsetTop, keyboardInset };
};

const useKeyboardInset = () => {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;

    const updateInset = () => {
      const { height, offsetTop, keyboardInset } = getViewportMetrics();
      root.style.setProperty('--keyboard-inset', `${keyboardInset}px`);
      root.style.setProperty('--viewport-height', `${height}px`);
      root.style.setProperty('--viewport-offset-top', `${offsetTop}px`);
    };

    const handleFocusChange = () => {
      window.requestAnimationFrame(updateInset);
    };

    updateInset();

    if (viewport) {
      viewport.addEventListener('resize', updateInset);
      viewport.addEventListener('scroll', updateInset);
    }

    window.addEventListener('resize', updateInset);
    window.addEventListener('orientationchange', updateInset);
    window.addEventListener('focusin', handleFocusChange);
    window.addEventListener('focusout', handleFocusChange);

    return () => {
      if (viewport) {
        viewport.removeEventListener('resize', updateInset);
        viewport.removeEventListener('scroll', updateInset);
      }

      window.removeEventListener('resize', updateInset);
      window.removeEventListener('orientationchange', updateInset);
      window.removeEventListener('focusin', handleFocusChange);
      window.removeEventListener('focusout', handleFocusChange);
      root.style.removeProperty('--keyboard-inset');
      root.style.removeProperty('--viewport-height');
      root.style.removeProperty('--viewport-offset-top');
    };
  }, []);
};

export default useKeyboardInset;
