import { useState, useEffect } from 'react';

export const useHandleBeatClick = (beats, tableRef, currentBeat) => {
  const [selectedBeats, setSelectedBeats] = useState([]);
  const [lastSelectedBeatIndex, setLastSelectedBeatIndex] = useState(null);

  const handleBeatClick = (beat, e) => {
    // Use a more specific identifier to handle duplicate beats
    // First try to find by uniqueKey if available, otherwise use id + index combination
    const clickedBeatIndex = beats.findIndex(b => {
      if (beat.uniqueKey && b.uniqueKey) {
        return b.uniqueKey === beat.uniqueKey;
      }
      // Fallback: use id + index combination for uniqueness
      const beatIndex = beats.indexOf(beat);
      const bIndex = beats.indexOf(b);
      return b.id === beat.id && bIndex === beatIndex;
    });
    processSelection(clickedBeatIndex, e);
  };

  const processSelection = (clickedBeatIndex, e) => {
    if (e.shiftKey && lastSelectedBeatIndex !== null) {
      const start = Math.min(clickedBeatIndex, lastSelectedBeatIndex);
      const end = Math.max(clickedBeatIndex, lastSelectedBeatIndex);
      let selectedBeatsRange = beats.slice(start, end + 1);

      setSelectedBeats(prevBeats => {
        const newSelectedBeats = [...prevBeats];
        selectedBeatsRange.forEach(beat => {
          const isAlreadySelected = newSelectedBeats.some(b => {
            if (beat.uniqueKey && b.uniqueKey) {
              return b.uniqueKey === beat.uniqueKey;
            }
            // Fallback: use id + index combination for uniqueness
            const beatIndex = beats.indexOf(beat);
            const bIndex = beats.indexOf(b);
            return b.id === beat.id && bIndex === beatIndex;
          });

          if (!isAlreadySelected) {
            newSelectedBeats.push(beat);
          }
        });
        return newSelectedBeats;
      });
    } else if (!e.ctrlKey && !e.metaKey) {
      setSelectedBeats([beats[clickedBeatIndex]]);
    } else {
      setSelectedBeats(prevBeats => {
        const clickedBeat = beats[clickedBeatIndex];
        const isAlreadySelected = prevBeats.some(b => {
          if (clickedBeat.uniqueKey && b.uniqueKey) {
            return b.uniqueKey === clickedBeat.uniqueKey;
          }
          // Fallback: use id + index combination for uniqueness
          const clickedBeatIndex = beats.indexOf(clickedBeat);
          const bIndex = beats.indexOf(b);
          return b.id === clickedBeat.id && bIndex === clickedBeatIndex;
        });

        if (isAlreadySelected) {
          return prevBeats.filter(b => {
            if (clickedBeat.uniqueKey && b.uniqueKey) {
              return b.uniqueKey !== clickedBeat.uniqueKey;
            }
            // Fallback: use id + index combination for uniqueness
            const clickedBeatIndex = beats.indexOf(clickedBeat);
            const bIndex = beats.indexOf(b);
            return !(b.id === clickedBeat.id && bIndex === clickedBeatIndex);
          });
        } else {
          return [...prevBeats, clickedBeat];
        }
      });
    }

    setLastSelectedBeatIndex(clickedBeatIndex);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't clear selection if clicking on modals, context menus, or other UI elements
      const target = event.target;
      const isModal = target.closest('.modal') || target.closest('.context-menu') || target.closest('.tooltip');
      const isButton = target.closest('button') || target.closest('[role="button"]');
      const isDropdown = target.closest('.filter-dropdown') || target.closest('.dropdown');
      
      if (isModal || isButton || isDropdown) {
        return;
      }
      
      if (tableRef.current && !tableRef.current.contains(event.target)) {
        setSelectedBeats([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [tableRef]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedBeats([]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        let newIndex;
        if (selectedBeats.length === 0) {
          const currentBeatIndex = currentBeat ? beats.findIndex(b => {
            if (currentBeat.uniqueKey && b.uniqueKey) {
              return b.uniqueKey === currentBeat.uniqueKey;
            }
            // Fallback: use id + index combination for uniqueness
            const beatIndex = beats.indexOf(currentBeat);
            const bIndex = beats.indexOf(b);
            return b.id === currentBeat.id && bIndex === beatIndex;
          }) : -1;
          if (currentBeatIndex !== -1) {
            if (e.key === 'ArrowUp') {
              newIndex = currentBeatIndex - 1 >= 0 ? currentBeatIndex - 1 : beats.length - 1;
            } else if (e.key === 'ArrowDown') {
              newIndex = currentBeatIndex + 1 < beats.length ? currentBeatIndex + 1 : 0;
            }
          } else {
            if (e.key === 'ArrowUp') {
              newIndex = beats.length - 1;
            } else if (e.key === 'ArrowDown') {
              newIndex = 0;
            }
          }
        } else {
          const currentIndex = beats.findIndex(b => {
            const selectedBeat = selectedBeats[0];
            if (selectedBeat.uniqueKey && b.uniqueKey) {
              return b.uniqueKey === selectedBeat.uniqueKey;
            }
            // Fallback: use id + index combination for uniqueness
            const selectedBeatIndex = beats.indexOf(selectedBeat);
            const bIndex = beats.indexOf(b);
            return b.id === selectedBeat.id && bIndex === selectedBeatIndex;
          });
          if (e.key === 'ArrowUp') {
            newIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : beats.length - 1;
          } else if (e.key === 'ArrowDown') {
            newIndex = currentIndex + 1 < beats.length ? currentIndex + 1 : 0;
          }
        }
        if (newIndex !== undefined) {
          setSelectedBeats([beats[newIndex]]);
          setLastSelectedBeatIndex(newIndex);
          e.preventDefault();
  
          setTimeout(() => { 
            const beatElements = document.querySelectorAll('.beat-row');
            if (beatElements[newIndex]) {
              beatElements[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 0);
        }
      }
    };
  
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedBeats, beats, currentBeat]);

  return { selectedBeats, handleBeatClick, setSelectedBeats };
};