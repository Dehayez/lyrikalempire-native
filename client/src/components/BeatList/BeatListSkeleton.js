import React from 'react';
import { useHeaderWidths } from '../../contexts';
import './BeatListSkeleton.scss';

const BeatListSkeleton = () => {
  const { headerWidths } = useHeaderWidths();

  // Get column widths from localStorage or use defaults
  const getColumnWidth = (index) => {
    const savedWidth = localStorage.getItem(`headerWidth${index}`);
    if (savedWidth) {
      return parseFloat(savedWidth);
    }
    
    // Default widths from useResizableColumns
    const staticWidths = {
      0: 60,  // number
      2: 95,  // tierlist
      3: 80,  // bpm
      8: 80,  // duration
      9: 50   // menu
    };
    
    const defaultPercentages = {
      1: 20,  // title
      4: 20,  // genre
      5: 20,  // mood
      6: 20,  // keyword
      7: 20   // feature
    };
    
    if (staticWidths[index] !== undefined) {
      return staticWidths[index];
    }
    
    return defaultPercentages[index];
  };

  // Build grid template columns string
  const getGridTemplateColumns = () => {
    const columns = [];
    for (let i = 0; i < 10; i++) {
      const width = getColumnWidth(i);
      if (i === 1 || i === 4 || i === 5 || i === 6 || i === 7) {
        // Resizable columns use percentage
        columns.push(`${width}%`);
      } else {
        // Static columns use pixels
        columns.push(`${width}px`);
      }
    }
    return columns.join(' ');
  };

  const gridTemplateColumns = getGridTemplateColumns();

  // Log the column information
  console.log('🎭 BeatListSkeleton - Column Info:', {
    totalColumns: 10,
    gridTemplateColumns,
    columnWidths: Array.from({ length: 10 }, (_, i) => ({
      index: i,
      width: getColumnWidth(i),
      isResizable: [1, 4, 5, 6, 7].includes(i),
      localStorageValue: localStorage.getItem(`headerWidth${i}`)
    }))
  });

  return (
    <div className="beat-list-skeleton">
      {/* Table skeleton */}
      <div className="beat-list-skeleton__table">
        {/* Table header skeleton */}
        <div 
          className="beat-list-skeleton__table-header"
          style={{ gridTemplateColumns }}
        >
          <div className="beat-list-skeleton__header-cell beat-list-skeleton__header-cell--index"></div>
          <div className="beat-list-skeleton__header-cell beat-list-skeleton__header-cell--title"></div>
          <div className="beat-list-skeleton__header-cell beat-list-skeleton__header-cell--tierlist"></div>
          <div className="beat-list-skeleton__header-cell beat-list-skeleton__header-cell--bpm"></div>
          <div className="beat-list-skeleton__header-cell beat-list-skeleton__header-cell--genre"></div>
          <div className="beat-list-skeleton__header-cell beat-list-skeleton__header-cell--mood"></div>
          <div className="beat-list-skeleton__header-cell beat-list-skeleton__header-cell--keyword"></div>
          <div className="beat-list-skeleton__header-cell beat-list-skeleton__header-cell--feature"></div>
          <div className="beat-list-skeleton__header-cell beat-list-skeleton__header-cell--duration"></div>
          <div className="beat-list-skeleton__header-cell beat-list-skeleton__header-cell--menu"></div>
        </div>
        
        {/* Table rows skeleton */}
        {Array.from({ length: 10 }).map((_, index) => (
          <div 
            key={index} 
            className="beat-list-skeleton__row"
            style={{ gridTemplateColumns }}
          >
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--index"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--title"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--tierlist"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--bpm"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--genre"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--mood"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--keyword"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--feature"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--duration"></div>
            <div className="beat-list-skeleton__cell beat-list-skeleton__cell--menu"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BeatListSkeleton; 