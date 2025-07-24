export const slideIn = (element) => {
  if (!element) return;
  
  // Reset any existing transitions and start from bottom
  element.style.transition = 'none';
  element.style.transform = 'translateY(100%)';
  element.style.opacity = '1';

  // Force a reflow to ensure the initial state is applied
  element.offsetHeight;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.style.transition = 'transform 0.3s ease-in-out';
      element.style.transform = 'translateY(0)';
    });
  });
};

export const slideOut = (element, overlay, callback) => {
  if (element) {
    element.style.transition = 'transform 0.3s ease-in-out';
    element.style.transform = 'translateY(100%)';
  }

  if (overlay) {
    overlay.classList.remove('visible');
  }

  // Wait for transition to complete before cleanup
  setTimeout(() => {
    if (overlay) {
      overlay.style.pointerEvents = 'none'; // optional safeguard
    }
    if (callback) {
      callback();
    }
  }, 300); // match CSS transition duration
};