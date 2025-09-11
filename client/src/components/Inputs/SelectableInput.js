import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import classNames from 'classnames';
import { addAssociationsToBeat, removeAssociationFromBeat, getAssociationsByBeatId } from '../../services';
import { useHeaderWidths, useData } from '../../contexts';
import { SelectedList } from './SelectedList';
import './SelectableInput.scss';

export const SelectableInput = ({
  beatId,
  associationType,
  headerIndex,
  label,
  placeholder,
  disableFocus,
  form,
  newBeatId,
  mode,
  beat // Add beat prop to access associations directly
}) => {
  const { headerWidths } = useHeaderWidths();
  const { genres, moods, keywords, features } = useData();

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const inputContainerRef = useRef(null);

  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [pendingAssociations, setPendingAssociations] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const items = { moods, genres, keywords, features }[associationType];

  const associationItems = useMemo(() => 
    items.filter(item => item.name.toLowerCase().includes(inputValue.toLowerCase())),
    [items, inputValue]
  );

  const singularAssociationType = useMemo(() => {
    return associationType.endsWith('s') ? associationType.slice(0, -1) : associationType;
  }, [associationType]);

  const isItemSelected = useCallback((item) => {
    return selectedItems.some(selectedItem => selectedItem[`${singularAssociationType}_id`] === item.id);
  }, [selectedItems, singularAssociationType]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);
  
  const handleContainerClick = useCallback(() => {
    inputRef.current.classList.remove('selectable-input__input--hidden');
    inputRef.current.focus();
  
    // Scroll the container to the right
    if (inputContainerRef.current) {
      const { scrollWidth, clientWidth } = inputContainerRef.current;
      inputContainerRef.current.scrollLeft = scrollWidth - clientWidth;
    }
  }, []);

  const handleBlur = useCallback((e) => {
    e.preventDefault();
    setFocusedIndex(-1);
    if (inputContainerRef.current && !isFocused) {
      inputContainerRef.current.scrollLeft = 0;
    }
  }, [isFocused]);

  const handleInputChange = useCallback((e) => setInputValue(e.target.value), []);

  const handleItemSelect = useCallback(async (item) => {
    const associationId = item.id;
    const newAssociation = {
      beat_id: beatId,
      [`${singularAssociationType}_id`]: associationId
    };

    const isSelected = isItemSelected(item);

    if (isSelected) {
      await handleRemoveAssociation(newAssociation);
    } else {
      if (form) {
        setSelectedItems(prevItems => [...prevItems, newAssociation]);
        setPendingAssociations(prevItems => [...prevItems, associationId]);
      } else {
        try {
          await addAssociationsToBeat(beatId, associationType, [associationId]);
          setSelectedItems(prevItems => [...prevItems, newAssociation]);
        } catch (error) {
          console.error('Failed to add association:', error);
        }
      }
    }
    setInputValue('');
    inputRef.current.focus();
  }, [beatId, associationType, form, isItemSelected, singularAssociationType]);

  const handleRemoveAssociation = useCallback(async (item) => {
    const associationId = item[`${singularAssociationType}_id`];
    if (form) {
      setSelectedItems(prevItems => prevItems.filter(item => item[`${singularAssociationType}_id`] !== associationId));
      setPendingAssociations(prevItems => prevItems.filter(id => id !== associationId));
    } else {
      try {
        await removeAssociationFromBeat(beatId, associationType, associationId);
        setSelectedItems(prevItems => prevItems.filter(item => item[`${singularAssociationType}_id`] !== associationId));
      } catch (error) {
        console.error('Failed to remove association:', error);
      }
    }
  }, [beatId, associationType, form, singularAssociationType]);

  const scrollToFocusedItem = useCallback((index) => {
    const listContainer = containerRef.current.querySelector('.selectable-input__list');
    const listItems = containerRef.current.querySelectorAll('.selectable-input__list-item');
    
    if (listContainer && listItems[index]) {
      const focusedItem = listItems[index];
      const containerRect = listContainer.getBoundingClientRect();
      const itemRect = focusedItem.getBoundingClientRect();
      
      // Check if item is above the visible area
      if (itemRect.top < containerRect.top) {
        focusedItem.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
      // Check if item is below the visible area
      else if (itemRect.bottom > containerRect.bottom) {
        focusedItem.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setFocusedIndex((prevIndex) => {
        const newIndex = (prevIndex + 1) % associationItems.length;
        scrollToFocusedItem(newIndex);
        return newIndex;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setFocusedIndex((prevIndex) => {
        const newIndex = prevIndex - 1 < 0 ? associationItems.length - 1 : prevIndex - 1;
        scrollToFocusedItem(newIndex);
        return newIndex;
      });
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      e.stopPropagation();
      handleItemSelect(associationItems[focusedIndex]);
    }
  }, [associationItems, focusedIndex, scrollToFocusedItem, handleItemSelect]);

  useEffect(() => {
    // Use associations from beat prop instead of making API call
    if (beat && beat[associationType]) {
      const associations = beat[associationType].map(item => ({
        beat_id: beatId,
        [`${singularAssociationType}_id`]: item[`${singularAssociationType}_id`],
        name: item.name
      }));
      setSelectedItems(associations);
    } else {
      // Fallback to API call if beat prop doesn't have associations (for backward compatibility)
      const fetchAssociations = async () => {
        try {
          const associations = await getAssociationsByBeatId(beatId, associationType);
          setSelectedItems(associations);
        } catch (error) {
          console.error('Error fetching associations:', error);
        }
      };
      fetchAssociations();
    }
  }, [beatId, associationType, beat, singularAssociationType]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (form && newBeatId && pendingAssociations.length > 0) {
      const uploadPendingAssociations = async () => {
        try {
          await addAssociationsToBeat(newBeatId, associationType, pendingAssociations);
          setPendingAssociations([]);
        } catch (error) {
          console.error('Failed to upload pending associations:', error);
        }
      };

      uploadPendingAssociations();
    }
  }, [newBeatId, form, associationType, pendingAssociations]);

  return (
    <div className='selectable-input-container'>
      <div className={`selectable-input ${label ? 'selectable-input--label' : ''}`} ref={containerRef}>
        <div
          className={classNames('selectable-input__input-container', {
            'selectable-input__input-container--focused': isFocused,
            'selectable-input__input-container--form': form,
            'selectable-input__input-container--disabled': disableFocus,
            'selectable-input__input-container--edit': mode === 'edit',
          })}
          {...(mode === 'edit' && { onClick: handleContainerClick })}
          ref={inputContainerRef}
        >
          <SelectedList selectedItems={selectedItems} isFocused={isFocused} handleRemoveAssociation={handleRemoveAssociation} />
          <input
            ref={inputRef}
            id={`selectable-input-${associationType}-${beatId}-${headerIndex}`}
            className={classNames('form-group__input', 'selectable-input__input', {
              'selectable-input__input--hidden': !isFocused,
              'selectable-input__input--disabled': disableFocus,
            })}
            placeholder={selectedItems.length === 0 ? placeholder : ''}
            type="text"
            value={inputValue}
            onFocus={(e) => {
              handleFocus();
              e.target.nextSibling.classList.add('form-group__label--active');
            }}
            onBlur={(e) => {
              handleBlur(e);
              if (!inputValue && selectedItems.length === 0) {
                e.target.nextSibling.classList.remove('form-group__label--active');
              }
            }}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            disabled={disableFocus}
            autoComplete="off"
          />
          <label htmlFor={`selectable-input-${associationType}-${beatId}-${headerIndex}`} className={`form-group__label ${inputValue || isFocused || selectedItems.length > 0 ? 'form-group__label--active' : ''}`}>
            {label}
          </label>
        </div>
        {isFocused && (
          <ul className="selectable-input__list">
            {associationItems.map((item, index) => {
              const isSelected = isItemSelected(item);
              return (
                <li
                  key={item.id}
                  className={classNames('selectable-input__list-item', {
                    'selectable-input__list-item--selected': isSelected,
                    'selectable-input__list-item--focused': focusedIndex === index,
                  })}
                  onClick={() => handleItemSelect(item)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  {item.name}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};