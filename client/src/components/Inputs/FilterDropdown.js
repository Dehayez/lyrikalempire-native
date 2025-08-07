import React, { useState, useEffect, useRef } from 'react';
import { IoChevronDownSharp, IoCloseSharp } from "react-icons/io5";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';

import { useLocalStorageSync, useDragToDismiss } from '../../hooks';
import { getInitialState, getInitialStateForFilters } from '../../utils/stateUtils';
import { isMobileOrTablet, slideIn, slideOut } from '../../utils';

import { Button } from '../Buttons';
import Portal from './Portal';
import './FilterDropdown.scss';

export const FilterDropdown = React.forwardRef(({ filters, onFilterChange }, ref) => {
  const dropdownRefs = useRef({});
  const listRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const autoHideTimeoutRef = useRef(null);
  const originalBodyOverflow = useRef(null);

  const initialSelectedItems = getInitialStateForFilters(filters, []);
  const initialDropdownState = getInitialStateForFilters(filters, false);
  
  const [selectedItems, setSelectedItems] = useState(() => getInitialState('selectedItems', initialSelectedItems));
  const [isDropdownOpen, setIsDropdownOpen] = useState(() => getInitialState('isDropdownOpen', initialDropdownState));
  const [searchTerms, setSearchTerms] = useState({});

  const hasOpenDropdown = Object.values(isDropdownOpen).some(Boolean);
  
  const {
    dismissRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = useDragToDismiss(() => {
    closeAllDropdowns();
  });

  useLocalStorageSync({
    selectedItems,
    isDropdownOpen
  });

  // Disable background scroll when dropdown is open
  const disableBackgroundScroll = () => {
    if (!isMobileOrTablet()) {
      originalBodyOverflow.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
  };

  // Re-enable background scroll
  const enableBackgroundScroll = () => {
    if (!isMobileOrTablet()) {
      document.body.style.overflow = originalBodyOverflow.current || '';
    }
  };

  // Start auto-hide timer for dropdown
  const startAutoHideTimer = (filterType) => {
    if (!isMobileOrTablet()) {
      // Clear any existing auto-hide timeout
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
      
      autoHideTimeoutRef.current = setTimeout(() => {
        handleSmoothClose(filterType);
      }, 100);
    }
  };

  // Handle mouse enter on dropdown or label container
  const handleDropdownMouseEnter = () => {
    if (!isMobileOrTablet()) {
      // Clear any existing timeouts
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
        autoHideTimeoutRef.current = null;
      }
    }
  };

  // Handle mouse leave on dropdown or label container
  const handleDropdownMouseLeave = () => {
    if (!isMobileOrTablet()) {
      // Start the auto-hide timer when mouse leaves
      Object.keys(isDropdownOpen).forEach(filterType => {
        if (isDropdownOpen[filterType]) {
          startAutoHideTimer(filterType);
        }
      });
    }
  };

  const handleSelect = (filterType, item) => {
    const isSelected = selectedItems[filterType]?.some(selectedItem => selectedItem.id === item.id);
    const newSelectedItems = isSelected
      ? selectedItems[filterType].filter(selectedItem => selectedItem.id !== item.id)
      : [...(selectedItems[filterType] || []), item];
  
    setSelectedItems(prevState => ({
      ...prevState,
      [filterType]: newSelectedItems
    }));
    onFilterChange(newSelectedItems, filterType);
  };

  const toggleDropdown = (filterType, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    setIsDropdownOpen(prevState => {
      const newState = {};
      
      if (prevState[filterType]) {
        return newState;
      }
      
      newState[filterType] = true;
      
      // Calculate position for desktop dropdown to follow the item when scrolled
      if (!isMobileOrTablet()) {
        setTimeout(() => {
          const dropdownRef = dropdownRefs.current[filterType];
          const wrapper = dropdownRef?.querySelector('.filter-dropdown__wrapper');
          if (dropdownRef && wrapper) {
            const rect = dropdownRef.getBoundingClientRect();
            const container = document.querySelector('.filter-dropdowns-container');
            const containerRect = container?.getBoundingClientRect();
            
            // Calculate initial position
            let left = rect.left - 6;
            let top = 36;
            
            // Check if dropdown would overflow the right edge of the container
            if (containerRect) {
              const dropdownWidth = 280; // max-width from CSS
              const rightEdge = left + dropdownWidth;
              const containerRightEdge = containerRect.right;
              
                              if (rightEdge > containerRightEdge) {
                  // Calculate how much we need to shift left
                  const overflow = rightEdge - containerRightEdge;
                  // Shift left by only a portion of the overflow to keep it more to the right
                  left -= (overflow * 0.5);
                  
                  // Ensure we don't go too far left (keep at least some of the dropdown visible)
                  const minLeft = containerRect.left + 10;
                  left = Math.max(left, minLeft);
                }
            }
            
            // Position the dropdown
            wrapper.style.left = `${left}px`;
            wrapper.style.top = `${top}px`;
            
            // Add visible class after positioning for smooth transition
            requestAnimationFrame(() => {
              wrapper.classList.add('filter-dropdown__wrapper--visible');
            });
          }
        }, 0);
      }
      
      return newState;
    });
  };

  // Handle smooth closing with transition
  const handleSmoothClose = (filterType) => {
    if (isMobileOrTablet()) {
      // Mobile uses existing slide animation
      closeAllDropdowns();
      return;
    }

    const dropdownRef = dropdownRefs.current[filterType];
    const wrapper = dropdownRef?.querySelector('.filter-dropdown__wrapper');
    
    if (wrapper) {
      // Remove visible class to trigger transition
      wrapper.classList.remove('filter-dropdown__wrapper--visible');
      
      // Wait for transition to complete before removing from DOM
      setTimeout(() => {
        setIsDropdownOpen(prevState => {
          const newState = { ...prevState };
          delete newState[filterType];
          return newState;
        });
        setSearchTerms(prevState => {
          const newState = { ...prevState };
          delete newState[filterType];
          return newState;
        });
        enableBackgroundScroll();
      }, 200); // Match transition duration
    } else {
      closeAllDropdowns();
    }
  };

  const handleClear = (filterType) => {
    setSelectedItems(prevState => ({
      ...prevState,
      [filterType]: []
    }));
    onFilterChange([], filterType);
  };

  const handleSearch = (filterType, searchTerm) => {
    setSearchTerms(prevState => ({
      ...prevState,
      [filterType]: searchTerm
    }));
  };

  const getFilteredOptions = (options, filterType) => {
    const searchTerm = searchTerms[filterType];
    if (!searchTerm) return options;
    
    return options.filter(option => 
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const closeAllDropdowns = () => {
    // Clear any existing timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }

    if (isMobileOrTablet()) {
      const overlay = document.querySelector('.filter-dropdown__overlay');
      const activeDropdown = document.querySelector('.filter-dropdown__wrapper');
      if (activeDropdown) {
        slideOut(activeDropdown, overlay, () => {
          setIsDropdownOpen({});
          setSearchTerms({});
          enableBackgroundScroll();
        });
      } else {
        setIsDropdownOpen({});
        setSearchTerms({});
        enableBackgroundScroll();
      }
    } else {
      setIsDropdownOpen({});
      setSearchTerms({});
      enableBackgroundScroll();
    }
  };

  const handleClickOutside = (event) => {
    const isOutside = !Object.keys(dropdownRefs.current).some(key => 
      dropdownRefs.current[key] && dropdownRefs.current[key].contains(event.target)
    );
    
    if (isOutside) {
      closeAllDropdowns();
    }
  };

  const handleOverlayClick = (event) => {
    event.stopPropagation();
    closeAllDropdowns();
  };

  // Enhanced touch handling to distinguish between scroll and drag-to-dismiss
  const handleTouchStartWrapper = (e) => {
    if (!isMobileOrTablet()) return;
    
    const target = e.target;
    const list = listRef.current;
    
    // If touch started within the scrollable list area, don't prevent default
    // This allows normal scrolling behavior
    if (list && list.contains(target)) {
      // Check if list is scrollable and has scroll content
      const isScrollable = list.scrollHeight > list.clientHeight;
      if (isScrollable) {
        // Don't prevent default - allow normal scrolling
        return;
      }
    }
    
    // Only handle drag-to-dismiss for header area or when list is not scrollable
    handleDragStart(e);
  };

  const handleTouchMoveWrapper = (e) => {
    if (!isMobileOrTablet()) return;
    
    const target = e.target;
    const list = listRef.current;
    
    // If touch is within the scrollable list, allow normal scrolling
    if (list && list.contains(target)) {
      const isScrollable = list.scrollHeight > list.clientHeight;
      const isAtTop = list.scrollTop === 0;
      const isAtBottom = list.scrollTop + list.clientHeight >= list.scrollHeight;
      
      // Only prevent scrolling and trigger drag-to-dismiss if:
      // 1. We're at the top and trying to scroll up further, OR
      // 2. The list is not scrollable
      if (isScrollable && !(isAtTop && e.touches[0].clientY > e.touches[0].startY)) {
        return; // Allow normal scrolling
      }
    }
    
    // Handle drag-to-dismiss
    e.stopPropagation();
    handleDragMove(e);
  };

  const handleTouchEndWrapper = (e) => {
    if (!isMobileOrTablet()) return;
    handleDragEnd(e);
  };

  // Add this effect to handle slide in animation when dropdown opens
  useEffect(() => {
    if (isMobileOrTablet() && hasOpenDropdown) {
      const activeWrapper = dismissRef.current;
      if (activeWrapper) {
        slideIn(activeWrapper);
      }
    }
  }, [hasOpenDropdown]);

  // Effect to handle background scroll when dropdown opens/closes
  useEffect(() => {
    if (hasOpenDropdown) {
      disableBackgroundScroll();
    } else {
      enableBackgroundScroll();
    }

    return () => {
      enableBackgroundScroll();
    };
  }, [hasOpenDropdown]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    
    // Add scroll listener to update dropdown positions when container scrolls
    const container = document.querySelector('.filter-dropdowns-container');
    if (container && !isMobileOrTablet()) {
      const handleScroll = () => {
        // Update position of any open dropdowns
        Object.keys(isDropdownOpen).forEach(filterType => {
          if (isDropdownOpen[filterType]) {
            const dropdownRef = dropdownRefs.current[filterType];
            const wrapper = dropdownRef?.querySelector('.filter-dropdown__wrapper');
            if (dropdownRef && wrapper) {
              const rect = dropdownRef.getBoundingClientRect();
              
              // Position the dropdown just below the item and perfectly aligned
              wrapper.style.left = `${rect.left - 6}px`;
              wrapper.style.top = `36px`;
            }
          }
        });
      };
      
      container.addEventListener('scroll', handleScroll);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        container.removeEventListener('scroll', handleScroll);
      };
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    const element = dismissRef.current;
    if (element && isMobileOrTablet()) {
      element.addEventListener('touchmove', handleDragMove, { passive: false });
    }
    return () => {
      if (element) {
        element.removeEventListener('touchmove', handleDragMove);
      }
    };
  }, [handleDragMove]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
      enableBackgroundScroll();
    };
  }, []);

  return (
    <div className="filter-dropdown-container" ref={ref}>
      {/* Mobile overlay */}
      {isMobileOrTablet() && hasOpenDropdown && (
        <div 
          className="filter-dropdown__overlay"
          onClick={handleOverlayClick}
        />
      )}
      
      <div className="filter-dropdowns-container">
        {filters.map(({ id, name, label, options }) => (
          <div 
            key={id} 
            className={`filter-dropdown ${name === 'hidden' ? 'hidden-filter' : ''}`} 
            ref={el => dropdownRefs.current[name] = el}
          >
            <span
              onClick={(e) => toggleDropdown(name, e)}
              className={`filter-dropdown__label-container ${isDropdownOpen[name] ? 'filter-dropdown__label-container--active' : ''}`}
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleDropdownMouseLeave}
            >
              {label && (
                <span className="filter-dropdown__label-text">
                  {label} {selectedItems[name]?.length > 0 && `(${selectedItems[name].length})`}
                </span>
              )}
              <IoChevronDownSharp className="filter-dropdown__label-icon" />
            </span>

            {isDropdownOpen[name] && (
              isMobileOrTablet() ? (
                <Portal>
                  <div 
                    className="filter-dropdown__wrapper filter-dropdown__wrapper--mobile"
                    ref={dismissRef}
                    onTouchStart={handleTouchStartWrapper}
                    onTouchMove={handleTouchMoveWrapper}
                    onTouchEnd={handleTouchEndWrapper}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div 
                      className="filter-dropdown__header"
                      onTouchStart={(e) => {
                        // Always allow drag-to-dismiss from header
                        e.stopPropagation();
                        handleDragStart(e);
                      }}
                    >
                      Filter {label}
                    </div>
                    <div className="filter-dropdown__search">
                      <input
                        type="text"
                        name={`search-${name}`} 
                        id={`search-${name}`}
                        placeholder={`Search ${label?.toLowerCase()}...`} 
                        value={searchTerms[name] || ''} 
                        onChange={(e) => handleSearch(name, e.target.value)} 
                        className="filter-dropdown__search-input"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <SimpleBar className="filter-dropdown__list">
                      <div ref={listRef}>
                        {getFilteredOptions(options, name).map(option => {
                          const optionId = `${id}-${option.id}`;
                          return (
                            <div key={option.id} className="filter-dropdown__option">
                              <input
                                type="checkbox"
                                id={optionId}
                                name={name}
                                value={option.id}
                                checked={selectedItems[name]?.some(selectedItem => selectedItem.id === option.id)}
                                onChange={() => handleSelect(name, option)}
                                className="filter-dropdown__option-input"
                              />
                              <span onClick={() => handleSelect(name, option)} className="filter-dropdown__option-text">
                                {option.name} <span className="filter-dropdown__option-text-count">{option.count}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </SimpleBar>
                    <div className="filter-dropdown__actions filter-dropdown__actions--mobile">
                      <Button size="small" variant="transparent" className="filter-dropdown__clear-button" onClick={() => handleClear(name)}>Clear</Button>
                      <Button size="small" className="filter-dropdown__close-button" variant='primary' onClick={(e) => toggleDropdown(name, e)}>Done</Button>
                    </div>
                  </div>
                </Portal>
              ) : (
                <div 
                  className="filter-dropdown__wrapper"
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={handleDropdownMouseEnter}
                  onMouseLeave={handleDropdownMouseLeave}
                >
                  <div className="filter-dropdown__search">
                    <input
                      type="text"
                      name={`search-${name}`} 
                      id={`search-${name}`}
                      placeholder={`Search ${label?.toLowerCase()}...`} 
                      value={searchTerms[name] || ''} 
                      onChange={(e) => handleSearch(name, e.target.value)} 
                      className="filter-dropdown__search-input"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <SimpleBar className="filter-dropdown__list">
                    <div ref={listRef}>
                      {getFilteredOptions(options, name).map(option => {
                        const optionId = `${id}-${option.id}`;
                        return (
                          <div key={option.id} className="filter-dropdown__option">
                            <input
                              type="checkbox"
                              id={optionId}
                              name={name}
                              value={option.id}
                              checked={selectedItems[name]?.some(selectedItem => selectedItem.id === option.id)}
                              onChange={() => handleSelect(name, option)}
                              className="filter-dropdown__option-input"
                            />
                            <span onClick={() => handleSelect(name, option)} className="filter-dropdown__option-text">
                              {option.name} <span className="filter-dropdown__option-text-count">{option.count}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </SimpleBar>
                  <div className="filter-dropdown__actions">
                    <Button size="small" variant="transparent" className="filter-dropdown__clear-button" onClick={() => handleClear(name)}>Clear</Button>
                    <Button size="small" className="filter-dropdown__close-button" variant='primary' onClick={(e) => toggleDropdown(name, e)}>Done</Button>
                  </div>
                </div>
              )
            )}
          </div>
        ))}
      </div>
      
      {/* Selected items display */}
      {Object.values(selectedItems).flatMap(items => items).length > 0 && (
        <div className="filter-dropdown__selected">
          {Object.entries(selectedItems).flatMap(([filterType, items]) =>
            items.map(item => (
              <div
                key={item.id}
                className="filter-dropdown__selected-item"
                onClick={() => handleSelect(filterType, item)}
              >
                <span>{item.name}</span>
                <button>
                  <IoCloseSharp />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
});