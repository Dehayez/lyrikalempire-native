import { useEffect, useCallback } from 'react';
import { useHeaderWidths } from '../contexts';

export const useResizableColumns = (tableRef) => {
  const { setHeaderWidths } = useHeaderWidths();

  const staticColumns = [0, 2, 3, 8, 9];
  const staticWidths = {
    0: 60,  // number
    2: 95,  // tierlist
    3: 80,  // bpm
    8: 60,  // duration
    9: 50   // menu
  };

  const resizableColumns = [1, 4, 5, 6, 7];
  const defaultPercentages = {
    1: 20,  // title
    4: 20,  // genre
    5: 20,  // mood
    6: 20,  // keyword
    7: 20   // feature
  };

  // Function to check if a column is visible (not hidden by CSS)
  const isColumnVisible = useCallback((header) => {
    if (!header) return false;
    const computedStyle = window.getComputedStyle(header);
    return computedStyle.display !== 'none';
  }, []);

  const recalculatePercentages = useCallback(() => {
    if (!tableRef.current) return;
    
    const table = tableRef.current.closest('table');
    if (!table) return;
    
    const headers = table.querySelectorAll('th');
    
    // Determine which columns are visible
    const visibleStaticColumns = staticColumns.filter(index => isColumnVisible(headers[index]));
    const visibleResizableColumns = resizableColumns.filter(index => isColumnVisible(headers[index]));
    
    // Set static widths for visible fixed columns
    visibleStaticColumns.forEach(index => {
      const header = headers[index];
      if (header) {
        const width = staticWidths[index];
        header.style.width = `${width}px`;
        header.style.minWidth = `${width}px`;
        header.style.maxWidth = `${width}px`;
      }
    });

    // Calculate available width for percentage columns
    const tableWidth = table.offsetWidth;
    const totalStaticWidth = visibleStaticColumns.reduce((sum, index) => sum + staticWidths[index], 0);
    const availableWidth = tableWidth - totalStaticWidth;

    // If no resizable columns are visible, we're done
    if (visibleResizableColumns.length === 0) return;

    // Get current widths of visible resizable columns
    const currentWidths = {};
    let totalResizablePercentage = 0;
    
    visibleResizableColumns.forEach(index => {
      const header = headers[index];
      if (header) {
        // Get saved percentage or default
        const savedPercentage = localStorage.getItem(`headerWidth${index}`);
        const percentage = savedPercentage ? parseFloat(savedPercentage) : defaultPercentages[index];
        currentWidths[index] = percentage;
        totalResizablePercentage += percentage;
      }
    });
    
    // Normalize percentages to ensure they total 100% for visible columns
    if (totalResizablePercentage > 0) {
      const scaleFactor = 100 / totalResizablePercentage;
      
      visibleResizableColumns.forEach(index => {
        const header = headers[index];
        if (header) {
          const newPercentage = Math.max(10, Math.min(60, currentWidths[index] * scaleFactor));
          currentWidths[index] = newPercentage;
          localStorage.setItem(`headerWidth${index}`, newPercentage);
          setHeaderWidths((prev) => ({
            ...prev,
            [`headerWidth${index}`]: newPercentage,
          }));
        }
      });
    }

    // Apply percentage widths to visible resizable columns
    visibleResizableColumns.forEach(index => {
      const header = headers[index];
      if (header) {
        const percentage = currentWidths[index];
        const pixelWidth = (availableWidth * percentage) / 100;
        header.style.width = `${pixelWidth}px`;
        header.style.minWidth = `${Math.max(80, pixelWidth * 0.5)}px`;
        header.style.maxWidth = `${pixelWidth * 2}px`;
      }
    });
  }, [setHeaderWidths, isColumnVisible]);

  useEffect(() => {
    if (!tableRef.current) return;

    const table = tableRef.current.closest('table');
    if (!table) return;

    const headers = table.querySelectorAll('th');

    // Migration: Clear old values for static columns
    const clearOldValues = () => {
      staticColumns.forEach(index => {
        const oldKey = `headerWidth${index}`;
        localStorage.removeItem(oldKey); // Remove any old values for static columns
      });

      // For resizable columns, clear old pixel-based values
      resizableColumns.forEach(index => {
        const oldKey = `headerWidth${index}`;
        const oldValue = localStorage.getItem(oldKey);
        
        if (oldValue && oldValue.includes('px')) {
          localStorage.removeItem(oldKey);
        }
        
        // Set default percentage if no value exists
        if (!localStorage.getItem(oldKey)) {
          localStorage.setItem(oldKey, defaultPercentages[index]);
        }
      });
    };

    clearOldValues();

    // Initial column setup
    recalculatePercentages();

    // Add resize functionality to resizable columns only
    resizableColumns.forEach(index => {
      const header = headers[index];
      if (!header) return;

      // Remove any existing resize handle
      const existingHandle = header.querySelector('.resize-handle');
      if (existingHandle) {
        existingHandle.remove();
      }

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';

      header.style.position = 'relative';
      header.appendChild(resizeHandle);

      let isResizing = false;
      let startX = 0;
      let startPercentage = 0;

      const handleMouseDown = (e) => {
        isResizing = true;
        startX = e.clientX;
        // Get the current percentage from localStorage or default
        const savedPercentage = localStorage.getItem(`headerWidth${index}`);
        startPercentage = savedPercentage ? parseFloat(savedPercentage) : defaultPercentages[index];
        header.classList.add('dragging');
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        e.preventDefault();
      };

      const handleMouseMove = (e) => {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        const tableWidth = table.offsetWidth;
        
        // Calculate available width based on visible columns
        const visibleStaticColumns = staticColumns.filter(i => isColumnVisible(headers[i]));
        const visibleResizableColumns = resizableColumns.filter(i => isColumnVisible(headers[i]));
        const totalStaticWidth = visibleStaticColumns.reduce((sum, i) => sum + staticWidths[i], 0);
        const availableWidth = tableWidth - totalStaticWidth;
        
        // Calculate percentage change based on available width
        const deltaPercentage = (deltaX / availableWidth) * 100;
        const newPercentage = Math.max(10, Math.min(60, startPercentage + deltaPercentage));
        
        // Calculate how much space was gained/lost
        const percentageChange = newPercentage - startPercentage;
        
        // Get current percentages for all visible resizable columns
        const currentPercentages = {};
        let totalOtherPercentages = 0;
        
        visibleResizableColumns.forEach(colIndex => {
          if (colIndex === index) {
            currentPercentages[colIndex] = newPercentage;
          } else {
            const savedPercentage = localStorage.getItem(`headerWidth${colIndex}`);
            const percentage = savedPercentage ? parseFloat(savedPercentage) : defaultPercentages[colIndex];
            currentPercentages[colIndex] = percentage;
            totalOtherPercentages += percentage;
          }
        });
        
        // Redistribute the space among other columns proportionally
        if (totalOtherPercentages > 0 && percentageChange !== 0) {
          const scaleFactor = (100 - newPercentage) / totalOtherPercentages;
          
          visibleResizableColumns.forEach(colIndex => {
            if (colIndex !== index) {
              const originalPercentage = currentPercentages[colIndex];
              const adjustedPercentage = Math.max(10, Math.min(60, originalPercentage * scaleFactor));
              currentPercentages[colIndex] = adjustedPercentage;
            }
          });
        }
        
        // Apply all the new widths immediately and save to localStorage
        visibleResizableColumns.forEach(colIndex => {
          const columnHeader = headers[colIndex];
          if (columnHeader) {
            const percentage = currentPercentages[colIndex];
            const pixelWidth = (availableWidth * percentage) / 100;
            columnHeader.style.width = `${pixelWidth}px`;
            
            // Save to localStorage for ALL affected columns
            localStorage.setItem(`headerWidth${colIndex}`, percentage);
            
            // Update context for ALL affected columns
            setHeaderWidths((prev) => ({
              ...prev,
              [`headerWidth${colIndex}`]: percentage,
            }));
          }
        });
      };

      const handleMouseUp = () => {
        isResizing = false;
        header.classList.remove('dragging');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // No need to recalculate - everything is already properly set during drag
      };

      resizeHandle.addEventListener('mousedown', handleMouseDown);
    });

    // Listen for window resize to recalculate column widths
    const handleResize = () => {
      recalculatePercentages();
    };

    // Use ResizeObserver to detect container size changes (more reliable than window resize)
    const resizeObserver = new ResizeObserver(() => {
      recalculatePercentages();
    });

    if (table) {
      resizeObserver.observe(table);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };

  }, [tableRef, setHeaderWidths, recalculatePercentages, isColumnVisible]);

  // Export the recalculate function so it can be called from outside
  return { recalculatePercentages };
};

export default useResizableColumns;
