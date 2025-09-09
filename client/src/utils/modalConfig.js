import Modal from 'react-modal';

// Set app element only once to avoid conflicts
let isAppElementSet = false;

export const initializeModal = () => {
  if (typeof window !== 'undefined' && !isAppElementSet) {
    try {
      Modal.setAppElement('#root');
      isAppElementSet = true;
      console.log('Modal app element set successfully');
    } catch (error) {
      // App element already set, ignore
      console.warn('Modal app element already set:', error.message);
      isAppElementSet = true; // Mark as set even if it failed
    }
  }
};

// Custom modal styles that prevent aria-hidden issues
export const getModalStyles = (customOverlay = {}, customContent = {}) => ({
  overlay: {
    backgroundColor: 'rgba(20, 20, 20, 0.5)',
    zIndex: 10,
    ...customOverlay,
  },
  content: {
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    padding: '0',
    ...customContent,
  },
});

// Don't auto-initialize to prevent multiple calls
// initializeModal();
