import React, { useRef, useEffect, useState } from 'react';
import { isMobileOrTablet } from '../../utils';
import { useHeaderWidths } from '../../contexts';
import './BeatListSkeleton.scss';

const BeatListSkeleton = () => {
  const containerRef = useRef(null);
  const tableRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  // Get actual table width (like real BeatList)
  useEffect(() => {
    if (tableRef.current) {
      const updateWidth = () => {
        // Small delay to ensure table is rendered
        setTimeout(() => {
          if (tableRef.current) {
            setContainerWidth(tableRef.current.offsetWidth);
          }
        }, 0);
      };
      
      updateWidth();
      window.addEventListener('resize', updateWidth);
      
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

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

  // Check if column should be visible based on container width (matching BeatList responsive rules)
  const isColumnVisible = (index) => {
    if (containerWidth <= 200) return index !== 0; // Hide number column
    if (containerWidth <= 300) return index !== 8; // Hide duration column
    if (containerWidth <= 400) return index !== 2; // Hide tierlist column
    if (containerWidth <= 500) return index !== 3; // Hide bpm column
    if (containerWidth <= 600) return index !== 4; // Hide genre column
    if (containerWidth <= 800) return index !== 5; // Hide mood column
    if (containerWidth <= 1000) return index !== 6; // Hide keyword column
    if (containerWidth <= 1200) return index !== 7; // Hide feature column
    return true; // All columns visible
  };

  // Calculate column widths like real BeatList
  const getColumnWidths = () => {
    const staticColumns = [0, 2, 3, 8, 9];
    const staticWidths = { 0: 60, 2: 95, 3: 80, 8: 80, 9: 50 };
    
    // Calculate total static width for visible columns only
    const visibleStaticColumns = staticColumns.filter(isColumnVisible);
    const totalStaticWidth = visibleStaticColumns.reduce((sum, index) => sum + staticWidths[index], 0);
    const availableWidth = containerWidth - totalStaticWidth;
    
    const widths = [];
    for (let i = 0; i < 10; i++) {
      if (!isColumnVisible(i)) {
        widths.push(0);
        continue;
      }
      
      const width = getColumnWidth(i);
      
      if (i === 1 || i === 4 || i === 5 || i === 6 || i === 7) {
        widths.push(width);
      } else {
        // Static columns use fixed width
        widths.push(width);
      }
    }
    return widths;
  };

  const columnPercents = getColumnWidths();
  // Normalize resizable column percentages to total 100
  const resizableIndexes = [1,4,5,6,7].filter(isColumnVisible);
  const percentSum = resizableIndexes.reduce((sum,i)=>sum+columnPercents[i],0);
  const factor = percentSum>0?100/percentSum:1;
  const columnWidths = columnPercents.map((w,i)=>{
    if(resizableIndexes.includes(i)) return w*factor;
    return w;});

  // Log the column information
  const visibleStaticColumns = [0, 2, 3, 8, 9].filter(isColumnVisible);
  const staticWidths = { 0: 60, 2: 95, 3: 80, 8: 80, 9: 50 };
  const totalStaticWidth = visibleStaticColumns.reduce((sum, index) => sum + staticWidths[index], 0);
  const availableWidth = containerWidth - totalStaticWidth;
  
  console.log('🎭 BeatListSkeleton - Column Info:', {
    totalColumns: 10,
    containerWidth,
    availableWidth,
    columnWidths: Array.from({ length: 10 }, (_, i) => {
      const width = getColumnWidth(i);
      const isResizable = [1, 4, 5, 6, 7].includes(i);
      const isVisible = isColumnVisible(i);
      const pixelWidth = isVisible ? (isResizable ? (availableWidth * width) / 100 : width) : 0;
      
      return {
        index: i,
        percentage: width,
        pixelWidth: `${pixelWidth}px`,
        isResizable,
        isVisible,
        localStorageValue: localStorage.getItem(`headerWidth${i}`)
      };
    })
  });

  return (
    <div ref={containerRef} className="beat-list-skeleton">
      <div className="beat-list-skeleton__table-container">
        <table className="beat-list-skeleton__table" ref={tableRef}>
          <thead className="beat-list-skeleton__table-header">
            <tr>
              {columnWidths.map((w,i)=>{
                const isResizable=resizableIndexes.includes(i);
                const style={width:isResizable?`${w}%`:`${w}px`};
                const className = `beat-list-skeleton__header-cell${i===9 ? ' beat-list-skeleton__header-cell--menu' : ''}`;
                return <th key={i} className={className} style={style}></th>
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="beat-list-skeleton__row">
                {columnWidths.map((w,i)=>{
                  const isResizable=resizableIndexes.includes(i);
                  const style={width:isResizable?`${w}%`:`${w}px`};
                  const className = `beat-list-skeleton__cell${i===9 && !isMobileOrTablet() ? ' beat-list-skeleton__cell--menu' : ''}`;
                  return <td key={i} className={className} style={style}></td>
                })}
                <td className="beat-list-skeleton__cell" style={{ width: `${columnWidths[1]}px` }}></td>
                <td className="beat-list-skeleton__cell" style={{ width: `${columnWidths[2]}px` }}></td>
                <td className="beat-list-skeleton__cell" style={{ width: `${columnWidths[3]}px` }}></td>
                <td className="beat-list-skeleton__cell" style={{ width: `${columnWidths[4]}px` }}></td>
                <td className="beat-list-skeleton__cell" style={{ width: `${columnWidths[5]}px` }}></td>
                <td className="beat-list-skeleton__cell" style={{ width: `${columnWidths[6]}px` }}></td>
                <td className="beat-list-skeleton__cell" style={{ width: `${columnWidths[7]}px` }}></td>
                <td className="beat-list-skeleton__cell" style={{ width: `${columnWidths[8]}px` }}></td>
                <td className="beat-list-skeleton__cell" style={{ width: `${columnWidths[9]}px` }}></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BeatListSkeleton; 