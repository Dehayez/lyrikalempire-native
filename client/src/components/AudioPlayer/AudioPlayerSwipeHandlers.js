/**
 * Handlers for swipe gestures in the audio player
 */

export const handleSwipeTouchStart = (e, swipeStartX, isSwipeDragging, swipeableContainerRef) => {
  // Don't start swiping if user is trying to interact with form elements
  const target = e.target;
  const isFormElement = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON';
  
  // Check if target is inside a form element or has interactive classes
  const isInsideFormElement = target.closest('input, select, textarea, button, .form-group__input, .selectable-input, .select-input, .form-input, .select-wrapper, .file-input, .code-input');
  
  if (isFormElement || isInsideFormElement) {
    // Don't start swiping if user is interacting with form elements
    return;
  }
  
  swipeStartX.current = e.touches[0].clientX;
  isSwipeDragging.current = true;
  
  if (swipeableContainerRef.current) {
    swipeableContainerRef.current.style.transition = 'none';
  }
};

export const handleSwipeTouchMove = (e, swipeStartX, swipeCurrentX, isSwipeDragging, swipeableContainerRef, activeSlideIndex) => {
  if (!isSwipeDragging.current) return;
  
  swipeCurrentX.current = e.touches[0].clientX;
  const diffX = swipeCurrentX.current - swipeStartX.current;
  
  if (swipeableContainerRef.current) {
    const translateX = -activeSlideIndex * 100 + (diffX / swipeableContainerRef.current.offsetWidth) * 100;
    swipeableContainerRef.current.style.transform = `translateX(${translateX}%)`;
  }
};

export const handleSwipeTouchEnd = (
  swipeStartX, 
  swipeCurrentX, 
  isSwipeDragging, 
  swipeableContainerRef, 
  activeSlideIndex, 
  setActiveSlideIndex,
  slidesLength
) => {
  if (!isSwipeDragging.current) return;
  
  const diffX = swipeCurrentX.current - swipeStartX.current;
  const threshold = 50; // Minimum distance to trigger slide
  
  if (swipeableContainerRef.current) {
    swipeableContainerRef.current.style.transition = 'transform 0.3s ease-out';
  }
  
  if (Math.abs(diffX) > threshold) {
    if (diffX > 0 && activeSlideIndex > 0) {
      // Swipe right - go to previous slide
      setActiveSlideIndex(activeSlideIndex - 1);
    } else if (diffX < 0 && activeSlideIndex < slidesLength - 1) {
      // Swipe left - go to next slide
      setActiveSlideIndex(activeSlideIndex + 1);
    }
  }
  
  isSwipeDragging.current = false;
  updateSwipeTransform(swipeableContainerRef, activeSlideIndex);
};

export const handleSwipeMouseDown = (e, swipeStartX, isSwipeDragging, swipeableContainerRef) => {
  // Don't prevent default if user is trying to interact with form elements
  const target = e.target;
  const isFormElement = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON';
  
  // Check if target is inside a form element or has interactive classes
  const isInsideFormElement = target.closest('input, select, textarea, button, .form-group__input, .selectable-input, .select-input, .form-input, .select-wrapper, .file-input, .code-input');
  
  if (isFormElement || isInsideFormElement) {
    // Don't start swiping if user is interacting with form elements
    return;
  }
  
  swipeStartX.current = e.clientX;
  isSwipeDragging.current = true;
  
  if (swipeableContainerRef.current) {
    swipeableContainerRef.current.style.transition = 'none';
  }
  
  // Prevent text selection during drag
  e.preventDefault();
};

export const handleSwipeMouseMove = (e, swipeStartX, swipeCurrentX, isSwipeDragging, swipeableContainerRef, activeSlideIndex) => {
  if (!isSwipeDragging.current) return;
  
  swipeCurrentX.current = e.clientX;
  const diffX = swipeCurrentX.current - swipeStartX.current;
  
  if (swipeableContainerRef.current) {
    const translateX = -activeSlideIndex * 100 + (diffX / swipeableContainerRef.current.offsetWidth) * 100;
    swipeableContainerRef.current.style.transform = `translateX(${translateX}%)`;
  }
};

export const handleSwipeMouseUp = (
  swipeStartX, 
  swipeCurrentX, 
  isSwipeDragging, 
  swipeableContainerRef, 
  activeSlideIndex, 
  setActiveSlideIndex,
  slidesLength
) => {
  if (!isSwipeDragging.current) return;
  
  const diffX = swipeCurrentX.current - swipeStartX.current;
  const threshold = 50;
  
  if (swipeableContainerRef.current) {
    swipeableContainerRef.current.style.transition = 'transform 0.3s ease-out';
  }
  
  if (Math.abs(diffX) > threshold) {
    if (diffX > 0 && activeSlideIndex > 0) {
      setActiveSlideIndex(activeSlideIndex - 1);
    } else if (diffX < 0 && activeSlideIndex < slidesLength - 1) {
      setActiveSlideIndex(activeSlideIndex + 1);
    }
  }
  
  isSwipeDragging.current = false;
  updateSwipeTransform(swipeableContainerRef, activeSlideIndex);
};

export const updateSwipeTransform = (swipeableContainerRef, activeSlideIndex) => {
  if (swipeableContainerRef.current) {
    swipeableContainerRef.current.style.transform = `translateX(-${activeSlideIndex * 100}%)`;
  }
}; 