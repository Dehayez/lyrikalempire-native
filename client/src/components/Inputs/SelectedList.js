import React from 'react';
import { IconButton } from '../Buttons';
import { IoCloseSharp } from "react-icons/io5";
import { useData } from '../../contexts';

const findNameById = (id, items) => {
  const item = items.find(item => item.id === id);
  return item ? item.name : 'Unknown';
};

const renderName = (item, genres, moods, keywords, features) => {
  // If the item has a name directly, use it (from beat object associations)
  if (item.name) {
    return item.name;
  } 
  // Otherwise, fall back to finding by ID (for backward compatibility)
  else if (item.genre_id) {
    return findNameById(item.genre_id, genres);
  } else if (item.mood_id) {
    return findNameById(item.mood_id, moods);
  } else if (item.keyword_id) {
    return findNameById(item.keyword_id, keywords);
  } else if (item.feature_id) {
    return findNameById(item.feature_id, features);
  }
  return 'Unknown';
};

export const SelectedList = ({ selectedItems, isFocused, handleRemoveAssociation }) => {
  const { genres, moods, keywords, features } = useData();

  const handleDeleteClick = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (handleRemoveAssociation) {
      handleRemoveAssociation(item);
    }
  };

  return (
    <div className="selectable-input__selected-list">
      {selectedItems.map((item, index) => (
        <span 
          key={index} 
          className={`selectable-input__selected-list__item ${isFocused ? 'selectable-input__selected-list__item--focused' : ''}`}
        >
          {renderName(item, genres, moods, keywords, features)}
          {isFocused && handleRemoveAssociation && (
            <IconButton 
              className="selectable-input__selected-list__item__icon" 
              onClick={(e) => handleDeleteClick(e, item)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <IoCloseSharp fontSize={16} />
            </IconButton>
          )}
        </span>
      ))}
    </div>
  );
};