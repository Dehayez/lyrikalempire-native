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
          if (!newSelectedBeats.map(b => b.id).includes(beat.id)) {
            newSelectedBeats.push(beat);
          }
        });
        return newSelectedBeats;
      });
    } else if (!e.ctrlKey && !e.metaKey) {
      setSelectedBeats([beats[clickedBeatIndex]]);
    } else {
      setSelectedBeats(prevBeats => {
        if (prevBeats.map(b => b.id).includes(beats[clickedBeatIndex].id)) {
          return prevBeats.filter(b => b.id !== beats[clickedBeatIndex].id);
        } else {
          return [...prevBeats, beats[clickedBeatIndex]];
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
          const currentBeatIndex = currentBeat ? beats.findIndex(b => b.id === currentBeat.id) : -1;
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
          const currentIndex = beats.findIndex(b => b.id === selectedBeats[0].id);
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