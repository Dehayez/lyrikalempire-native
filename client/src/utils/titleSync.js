/**
 * Title synchronization utility that works even when tabs are inactive
 */

// Store the current title in localStorage so it persists across tabs
export const setTitleWithStorage = (title) => {
  try {
    // Set the document title
    document.title = title;
    
    // Store in localStorage for persistence
    localStorage.setItem('currentDocumentTitle', title);
    
    console.log('📝 Title set and stored:', title);
  } catch (error) {
    console.error('Error setting title:', error);
  }
};

// Get the stored title from localStorage
export const getStoredTitle = () => {
  try {
    return localStorage.getItem('currentDocumentTitle') || 'Lyrikal Empire';
  } catch (error) {
    console.error('Error getting stored title:', error);
    return 'Lyrikal Empire';
  }
};

// Setup title sync mechanism
export const setupTitleSync = () => {
  // Initial setup - restore title from storage
  document.title = getStoredTitle();
  
  // Function to check and restore title
  const checkAndRestoreTitle = () => {
    const storedTitle = getStoredTitle();
    if (document.title !== storedTitle) {
      console.log('🔄 Restoring title from storage:', storedTitle);
      document.title = storedTitle;
    }
  };
  
  // Check title when visibility changes
  document.addEventListener('visibilitychange', () => {
    // Small delay to let browser complete its operations
    setTimeout(checkAndRestoreTitle, 100);
  });
  
  // Periodically check title (every 1 second)
  setInterval(checkAndRestoreTitle, 1000);
  
  // Also check when window gets focus
  window.addEventListener('focus', checkAndRestoreTitle);
  
  // Handle storage events (when another tab updates localStorage)
  window.addEventListener('storage', (event) => {
    if (event.key === 'currentDocumentTitle') {
      console.log('🔄 Title updated in another tab:', event.newValue);
      document.title = event.newValue;
    }
  });
  
  console.log('🔄 Title sync mechanism set up');
}; 