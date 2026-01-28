import { useState, useRef, useEffect } from 'react';
import { getInitialState } from '../utils';

export const usePanels = () => {
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(() => getInitialState('isLeftPanelVisible', false));
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(() => getInitialState('isRightPanelVisible', false));
  const [isLeftDivVisible, setIsLeftDivVisible] = useState(false);
  const [isRightDivVisible, setIsRightDivVisible] = useState(false);
  const [allowHover, setAllowHover] = useState(true);
  const hoverRefLeft = useRef(false);
  const hoverRefRight = useRef(false);
  const leftHoverTimeoutRef = useRef(null);
  const rightHoverTimeoutRef = useRef(null);

  const handleMouseEnterLeft = () => {
    if (!allowHover) return;
    
    // Clear any pending hide timeout
    if (leftHoverTimeoutRef.current) {
      clearTimeout(leftHoverTimeoutRef.current);
      leftHoverTimeoutRef.current = null;
    }
    
    hoverRefLeft.current = true;
    setIsLeftDivVisible(true);
  };

  const handleMouseLeaveLeft = () => {
    hoverRefLeft.current = false;
    
    // Add a delay before hiding to allow mouse movement to panel
    leftHoverTimeoutRef.current = setTimeout(() => {
      if (!hoverRefLeft.current) {
        setIsLeftDivVisible(false);
      }
    }, 150); // 150ms delay
  };

  const handleMouseEnterRight = () => {
    if (!allowHover) return;
    
    // Clear any pending hide timeout
    if (rightHoverTimeoutRef.current) {
      clearTimeout(rightHoverTimeoutRef.current);
      rightHoverTimeoutRef.current = null;
    }
    
    hoverRefRight.current = true;
    setIsRightDivVisible(true);
  };

  const handleMouseLeaveRight = () => {
    hoverRefRight.current = false;
    
    // Add a delay before hiding to allow mouse movement to panel
    rightHoverTimeoutRef.current = setTimeout(() => {
      if (!hoverRefRight.current) {
        setIsRightDivVisible(false);
      }
    }, 150); // 150ms delay
  };

  const toggleSidePanel = (panel) => {
    // Clear any pending timeouts when toggling
    if (leftHoverTimeoutRef.current) {
      clearTimeout(leftHoverTimeoutRef.current);
      leftHoverTimeoutRef.current = null;
    }
    if (rightHoverTimeoutRef.current) {
      clearTimeout(rightHoverTimeoutRef.current);
      rightHoverTimeoutRef.current = null;
    }
    
    if (panel === 'left') {
      setIsLeftPanelVisible(!isLeftPanelVisible);
      setIsLeftDivVisible(!isLeftPanelVisible);
    } else if (panel === 'right') {
      setIsRightPanelVisible(!isRightPanelVisible);
      setIsRightDivVisible(!isRightPanelVisible);
    } else if (panel === 'both') {
      setIsLeftPanelVisible(!isLeftPanelVisible);
      setIsLeftDivVisible(!isLeftPanelVisible);
      setIsRightPanelVisible(!isRightPanelVisible);
      setIsRightDivVisible(!isRightPanelVisible);
    }
    setAllowHover(false);
    setTimeout(() => {
      setAllowHover(true);
    }, 200);
  };

  const setPanelState = (panel, isOpen) => {
    if (leftHoverTimeoutRef.current) {
      clearTimeout(leftHoverTimeoutRef.current);
      leftHoverTimeoutRef.current = null;
    }
    if (rightHoverTimeoutRef.current) {
      clearTimeout(rightHoverTimeoutRef.current);
      rightHoverTimeoutRef.current = null;
    }

    if (panel === 'left') {
      setIsLeftPanelVisible(isOpen);
      setIsLeftDivVisible(isOpen);
    } else if (panel === 'right') {
      setIsRightPanelVisible(isOpen);
      setIsRightDivVisible(isOpen);
    } else if (panel === 'both') {
      setIsLeftPanelVisible(isOpen);
      setIsLeftDivVisible(isOpen);
      setIsRightPanelVisible(isOpen);
      setIsRightDivVisible(isOpen);
    }
    setAllowHover(false);
    setTimeout(() => {
      setAllowHover(true);
    }, 200);
  };

  const closeSidePanel = (panel) => {
    // Clear any pending timeouts when closing
    if (leftHoverTimeoutRef.current) {
      clearTimeout(leftHoverTimeoutRef.current);
      leftHoverTimeoutRef.current = null;
    }
    if (rightHoverTimeoutRef.current) {
      clearTimeout(rightHoverTimeoutRef.current);
      rightHoverTimeoutRef.current = null;
    }
    
    if (panel === 'left' && isLeftPanelVisible) {
      setIsLeftPanelVisible(false);
    } else if (panel === 'right' && isRightPanelVisible) {
      setIsRightPanelVisible(false);
      setIsRightDivVisible(false);
    } else if (panel === 'both') {
      setIsLeftPanelVisible(false);
      setIsLeftDivVisible(false);
      setIsRightPanelVisible(false);
      setIsRightDivVisible(false);
    }
    setAllowHover(false);
    setTimeout(() => {
      setAllowHover(true);
    }, 200);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (leftHoverTimeoutRef.current) {
        clearTimeout(leftHoverTimeoutRef.current);
      }
      if (rightHoverTimeoutRef.current) {
        clearTimeout(rightHoverTimeoutRef.current);
      }
    };
  }, []);

  return {
    isLeftPanelVisible,
    isRightPanelVisible,
    isLeftDivVisible,
    isRightDivVisible,
    handleMouseEnterLeft,
    handleMouseLeaveLeft,
    handleMouseEnterRight,
    handleMouseLeaveRight,
    toggleSidePanel,
    closeSidePanel,
    setPanelState,
  };
};