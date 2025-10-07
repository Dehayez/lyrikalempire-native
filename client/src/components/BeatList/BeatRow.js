import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useLocation } from 'react-router-dom';
import { IoRemoveCircleOutline, IoAddSharp, IoListSharp, IoEllipsisHorizontal, IoTrashBinOutline, IoRefreshSharp } from "react-icons/io5";
import classNames from 'classnames';

import { useBpmHandlers } from '../../hooks';
import { addBeatsToPlaylist, getBeatsByPlaylistId } from '../../services';
import { isMobileOrTablet, formatTime, replaceAudioWithToast } from '../../utils';
import { usePlaylist, useBeat, useData, useUser, useHeaderWidths } from '../../contexts';

import { IconButton } from '../Buttons';
import BeatAnimation from './BeatAnimation';
import PlayPauseButton from './PlayPauseButton';
import { ContextMenu } from '../ContextMenu';
import { Highlight } from '../Highlight';
import { SelectableInput } from '../Inputs';

import './BeatRow.scss';

const BeatRow = React.memo(({
  beat, 
  index, 
  moveBeat, 
  handlePlayPause, 
  handleUpdate, 
  isPlaying, 
  onBeatClick,
  selectedBeats = [], 
  handleBeatClick, 
  openConfirmModal, 
  beats, 
  activeContextMenu, 
  setActiveContextMenu, 
  currentBeat, 
  addToCustomQueue, 
  searchText, 
  mode, 
  deleteMode, 
  onUpdateBeat, 
  playlistId, 
  setBeats, 
  setHoverIndex, 
  setHoverPosition,
  isBeatCachedSync,
  isOffline = false,
}) => {
  const ref = useRef(null);
  const inputTitleRef = useRef(null);
  const location = useLocation();
  const { user } = useUser();
  // Remove useData dependency - associations are now in beat object
  const { setHoveredBeat, setRefreshBeats } = useBeat();
  const { playlists, isSamePlaylist } = usePlaylist();
  const { handleBpmBlur } = useBpmHandlers(handleUpdate, beat);
  const { headerWidths } = useHeaderWidths();

  // Compute derived state with useMemo to avoid recalculations
  const beatIndices = useMemo(() => 
    beats.reduce((acc, b, i) => ({ ...acc, [b.id]: i }), {}), 
    [beats]
  );

  const isSelected = useMemo(() => 
    selectedBeats.some(b => {
      if (beat.uniqueKey && b.uniqueKey) {
        return b.uniqueKey === beat.uniqueKey;
      }
      // Fallback: use id + index combination for uniqueness
      const beatIndex = beats.indexOf(beat);
      const bIndex = beats.indexOf(b);
      return b.id === beat.id && bIndex === beatIndex;
    }), 
    [selectedBeats, beat.id, beat.uniqueKey, beats]
  );

  const hasSelectedBefore = useMemo(() => {
    const currentBeatIndex = beats.indexOf(beat);
    return selectedBeats.some(b => {
      const bIndex = beats.indexOf(b);
      return bIndex === currentBeatIndex - 1;
    });
  }, [selectedBeats, beats, beat]);

  const hasSelectedAfter = useMemo(() => {
    const currentBeatIndex = beats.indexOf(beat);
    return selectedBeats.some(b => {
      const bIndex = beats.indexOf(b);
      return bIndex === currentBeatIndex + 1;
    });
  }, [selectedBeats, beats, beat]);

  const isMiddle = hasSelectedBefore && hasSelectedAfter;

  // State variables
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [tierlist, setTierlist] = useState(beat.tierlist || '');
  const [disableFocus, setDisableFocus] = useState(mode !== 'edit');
  
  // API calls and handlers
  const fetchBeats = useCallback(async (playlistId, setBeats) => {
    try {
      const beatsData = await getBeatsByPlaylistId(playlistId);
      const sortedBeats = beatsData.sort((a, b) => a.beat_order - b.beat_order);
      setBeats(sortedBeats);
    } catch (error) {
      console.error('Error fetching beats:', error);
    }
  }, []);

  // Drag and drop configuration
  const isPlaylistPage = location.pathname !== '/';
  const toDragAndDrop = isPlaylistPage && (mode === 'lock' || mode === 'listen');
  const canDragToPlaylist = location.pathname === '/' && mode === 'listen';
  const canDragFromPlaylistToPlaylist = isPlaylistPage && mode === 'listen';
  
  const [{ isDragging }, drag] = useDrag({
    type: 'BEAT',
    item: { 
      type: 'BEAT', 
      id: beat.id, 
      index,
      title: beat.title,
      isFromHomePage: location.pathname === '/',
      isFromPlaylistPage: isPlaylistPage,
      sourcePlaylistId: playlistId
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => toDragAndDrop || canDragToPlaylist || canDragFromPlaylistToPlaylist,
    end: useCallback((item, monitor) => {
      // Clear hover indicators when drag ends
      setHoverIndex(null);
      setHoverPosition(null);
      
      // If drag was cancelled or dropped outside valid area, refresh beats to ensure consistency
      if (!monitor.didDrop() && toDragAndDrop && playlistId && setBeats) {
        fetchBeats(playlistId, setBeats);
      }
    }, [setHoverIndex, setHoverPosition, toDragAndDrop, playlistId, setBeats, fetchBeats]),
  });

  const [, drop] = useDrop({
    accept: 'BEAT',
    hover: useCallback((item, monitor) => {
      if (!toDragAndDrop || !ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
    
      const clientOffset = monitor.getClientOffset();
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
    
      // Set hover position for visual feedback only
      if (hoverClientY < hoverMiddleY) {
        setHoverPosition('top');
      } else {
        setHoverPosition('bottom');
      }
      setHoverIndex(hoverIndex);
    }, [toDragAndDrop, index, setHoverIndex, setHoverPosition]),
    
    drop: useCallback((item, monitor) => {
      if (!toDragAndDrop) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Only perform the actual move on drop within the same playlist
      if (dragIndex !== hoverIndex) {
        const clientOffset = monitor.getClientOffset();
        const hoverBoundingRect = ref.current?.getBoundingClientRect();
        
        if (!hoverBoundingRect) return;
        
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;
        
        let targetIndex = hoverIndex;
        
        // Determine final position based on drop location
        if (dragIndex < hoverIndex && hoverClientY > hoverMiddleY) {
          // Moving down, place after hover item
          targetIndex = hoverIndex;
        } else if (dragIndex > hoverIndex && hoverClientY < hoverMiddleY) {
          // Moving up, place before hover item  
          targetIndex = hoverIndex;
        } else if (hoverClientY > hoverMiddleY) {
          // Place after hover item
          targetIndex = hoverIndex + 1;
        } else {
          // Place before hover item
          targetIndex = hoverIndex;
        }
        
        // Clamp target index to valid range
        targetIndex = Math.max(0, Math.min(targetIndex, beats.length - 1));
        
        if (targetIndex !== dragIndex) {
          moveBeat(dragIndex, targetIndex);
        }
      }
      
      setHoverIndex(null);
      setHoverPosition(null);
    }, [toDragAndDrop, index, moveBeat, setHoverIndex, setHoverPosition, beats.length]),
    
    canDrop: useCallback(() => {
      return toDragAndDrop;
    }, [toDragAndDrop]),
  });

  // Connect drag and drop refs
  if (toDragAndDrop) {
    drag(drop(ref));
  } else if (canDragToPlaylist || canDragFromPlaylistToPlaylist) {
    drag(ref);
  }

  // Dynamic text for delete/remove operation
  const deleteText = useMemo(() => {
    if (selectedBeats.length > 1) {
      return deleteMode === 'playlist'
        ? `Remove ${selectedBeats.length} tracks`
        : `Delete ${selectedBeats.length} tracks`;
    }
    return deleteMode === 'playlist' ? 'Remove from playlist' : 'Delete this track';
  }, [selectedBeats.length, deleteMode]);

  // Check if beat is cached
  const isBeatCached = isBeatCachedSync ? isBeatCachedSync(beat) : false;

  // Dynamic class names
  const beatRowClasses = useMemo(() => classNames({
    'beat-row': true,
    'beat-row--selected-middle': isSelected && isMiddle,
    'beat-row--selected-bottom': isSelected && !isMiddle && hasSelectedBefore,
    'beat-row--selected-top': isSelected && !isMiddle && hasSelectedAfter,
    'beat-row--selected': isSelected && !isMiddle && !hasSelectedBefore && !hasSelectedAfter || isDragging,
    'beat-row--playing': currentBeat && beat.id === currentBeat.id && isSamePlaylist,
    'beat-row--edit': mode === 'edit',
    'beat-row--offline-uncached': isOffline && !isBeatCached,
  }), [isSelected, isMiddle, hasSelectedBefore, hasSelectedAfter, isDragging, currentBeat, beat.id, isSamePlaylist, mode, isOffline, isBeatCached]);

  const handleInputChange = useCallback((property, value) => {
    onUpdateBeat?.(beat.id, { [property]: value });
  }, [beat.id, onUpdateBeat]);
  


  const handleBlur = useCallback((id, field, value) => {
    handleUpdate(id, field, value);
  }, [handleUpdate]);

  const handleMenuClick = useCallback((e, beatItem) => {
    e.preventDefault();
    if (!selectedBeats.some(selectedBeat => selectedBeat.id === beatItem.id)) {
      handleBeatClick(beatItem, e);
    }
  }, [selectedBeats, handleBeatClick]);

  const handleMenuButtonClick = useCallback((e, beatItem) => {
    e.stopPropagation();
    handleMenuClick(e, beatItem);
    
    // Create unique identifier for context menu
    const uniqueMenuId = beatItem.uniqueKey || `${beatItem.id}-${beats.indexOf(beatItem)}`;
    
    if (isMobileOrTablet()) {
      setActiveContextMenu(uniqueMenuId);
    } else {
      if (activeContextMenu === uniqueMenuId) {
        setActiveContextMenu(null);
      } else {
        setActiveContextMenu(uniqueMenuId);
        const buttonRect = e.currentTarget.getBoundingClientRect();
        const contextMenuWidth = 240;
        const offsetY = 24;
        
        let calculatedX = buttonRect.left;
        let calculatedY = buttonRect.top + offsetY;
        
        // Ensure menu stays within viewport
        if (calculatedX + contextMenuWidth > window.innerWidth) {
          calculatedX = window.innerWidth - contextMenuWidth;
        }
        if (calculatedX < 0) {
          calculatedX = 0;
        }
        
        setContextMenuPosition({ x: calculatedX, y: calculatedY });
      }
    }
  }, [activeContextMenu, handleMenuClick, setActiveContextMenu, beats]);

  const handleAddBeatToPlaylist = useCallback(async (playlistId, beatIds) => {
    try {
      await addBeatsToPlaylist(playlistId, beatIds);
    } catch (error) {
      console.error('Error adding beats to playlist:', error);
    }
  }, []);

  const selectNewAudioFile = useCallback(() => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/mpeg, audio/wav';
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          resolve(file);
        } else {
          alert('Unsupported file format. Please select an MP3 or WAV file.');
          resolve(null);
        }
      };
      input.click();
    });
  }, []);

  const getAudioDuration = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audio.src);
      });
      audio.onerror = () => reject(new Error('Failed to load audio metadata'));
    });
  }, []);

  const handleReplaceAudio = useCallback(async () => {
    const newAudioFile = await selectNewAudioFile();

    if (newAudioFile) {
      try {
        const duration = await getAudioDuration(newAudioFile);
        await replaceAudioWithToast(beat.id, newAudioFile, user.id, setRefreshBeats, duration);
        console.log('Audio replaced successfully');
      } catch (error) {
        console.error('Failed to replace audio:', error);
      }
    }
  }, [beat.id, selectNewAudioFile, user.id, setRefreshBeats, getAudioDuration]);

  const handleAddToCustomQueueClick = useCallback(() => {
    addToCustomQueue(selectedBeats);
  }, [addToCustomQueue, selectedBeats]);

  const calculateActualIndex = useCallback((index) => {
    const urlKey = `currentPage_${location.pathname}`;
    const currentPage = parseInt(localStorage.getItem(urlKey), 10) || 1;
    const itemsPerPage = 30;
    return (currentPage - 1) * itemsPerPage + index;
  }, [location.pathname]);
  
  // Effect for context menu behavior
  useEffect(() => {
    const contextMenuElement = document.getElementById('context-menu');
    let hideTimeoutId;
  
    const toggleScroll = (disable) => document.body.classList.toggle('no-scroll', disable);
    const hideContextMenu = () => setActiveContextMenu(null);
    
    const eventHandlers = {
      mouseleave: () => hideTimeoutId = setTimeout(hideContextMenu, 0),
      mouseenter: () => clearTimeout(hideTimeoutId)
    };
    
    const manageContextMenuVisibility = (show) => {
      if (show) {
        window.addEventListener('click', hideContextMenu);
        toggleScroll(true);
        if (contextMenuElement) {
          contextMenuElement.addEventListener('mouseleave', eventHandlers.mouseleave);
          contextMenuElement.addEventListener('mouseenter', eventHandlers.mouseenter);
        }
      } else {
        window.removeEventListener('click', hideContextMenu);
        toggleScroll(false);
        if (contextMenuElement) {
          contextMenuElement.removeEventListener('mouseleave', eventHandlers.mouseleave);
          contextMenuElement.removeEventListener('mouseenter', eventHandlers.mouseenter);
        }
      }
    };
  
    manageContextMenuVisibility(activeContextMenu === beat.id);
    
    return () => manageContextMenuVisibility(false);
  }, [activeContextMenu, beat.id, setActiveContextMenu]);

  // Handle focus state based on edit mode
  useEffect(() => {
    setDisableFocus(mode !== 'edit');
  }, [mode]);

  // Mouse event handlers
  const handleMouseEnter = useCallback((e) => {
    if (!isMobileOrTablet()) { 
      e.currentTarget.querySelectorAll('.interactive-button').forEach(button => { 
        button.style.opacity = 1; 
      }); 
      // Use beat.id and index to create unique identifier for each row instance
      setHoveredBeat(`${beat.id}-${index}`); 
    }
  }, [beat.id, index, setHoveredBeat]);

  const handleMouseLeave = useCallback((e) => {
    if (!isMobileOrTablet()) { 
      e.currentTarget.querySelectorAll('.interactive-button').forEach(button => { 
        button.style.opacity = 0; 
      }); 
      setHoveredBeat(null); 
    }
  }, [setHoveredBeat]);

  // Extract commonly used props for SelectableInput
  const commonSelectableInputProps = {
    beatId: beat.id,
    mode: mode,
    disableFocus: disableFocus,
    beat: beat, // Pass beat object so SelectableInput can access associations directly
    onUpdate: (updatedItems, type) => {
      // This callback will be triggered when the associations are updated
      if (onUpdateBeat) {
        onUpdateBeat(beat.id, { [type]: updatedItems });
      }
    }
  };

  // Build the component's click handler conditionally
  const rowClickHandler = mode !== "edit" 
    ? (e) => {
        // Handle selection
        handleBeatClick(beat, e);
        // Also handle play if no modifier keys are pressed AND it's a mobile/tablet device
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && onBeatClick && isMobileOrTablet()) {
          onBeatClick(beat);
        }
      }
    : undefined;

  // Handle right-click for context menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    handleMenuClick(e, beat);
    // Create unique identifier for context menu
    const uniqueMenuId = beat.uniqueKey || `${beat.id}-${beats.indexOf(beat)}`;
    setActiveContextMenu(uniqueMenuId);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  }, [beat, handleMenuClick, setActiveContextMenu, beats]);

  // Menu items for context menu
  const contextMenuItems = useMemo(() => [
    {
      icon: IoAddSharp,
      iconClass: 'add-playlist',
      text: 'Add to playlist',
      buttonClass: 'add-playlist',
      subItems: playlists.map(playlist => ({
        text: playlist.title,
        onClick: () => {
          const selectedBeatIds = selectedBeats.map(beat => beat.id);
          handleAddBeatToPlaylist(playlist.id, selectedBeatIds);
        },
      })),
    },
    {
      icon: IoListSharp,
      iconClass: 'add-queue',
      text: 'Add to queue',
      buttonClass: 'add-queue',
      onClick: handleAddToCustomQueueClick,
    },
    {
      icon: IoRefreshSharp,
      iconClass: 'replace-audio',
      text: 'Replace audio',
      buttonClass: 'replace-audio',
      onClick: handleReplaceAudio,
    },
    {
      icon: deleteMode === "playlist" ? IoTrashBinOutline : IoRemoveCircleOutline,
      iconClass: 'delete',
      text: deleteText,
      buttonClass: 'delete',
      onClick: () => openConfirmModal(beat.id),
    },
  ], [
    playlists, selectedBeats, handleAddBeatToPlaylist, 
    handleAddToCustomQueueClick, handleReplaceAudio, 
    deleteMode, deleteText, openConfirmModal
  ]);

  // Render the component
  return (
    <tr
      ref={ref} 
      className={beatRowClasses}
      key={`beat-row-${beat.id}`}
      onClick={rowClickHandler}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
    >
      {!(mode === 'lock' && isMobileOrTablet()) && (
        <td className="beat-row__number">
          <div className="beat-row__button-cell">
            <BeatAnimation 
              beat={beat} 
              currentBeat={currentBeat} 
              isPlaying={isPlaying} 
              index={calculateActualIndex(index)}
              showPlayButton={!isOffline || isBeatCached}
            />
            {(!isOffline || isBeatCached) && (
              <PlayPauseButton 
                beat={beat} 
                handlePlayPause={handlePlayPause}
                currentBeat={currentBeat} 
                isPlaying={isPlaying}
                index={calculateActualIndex(index)}
              />
            )}
          </div>
        </td>
      )}
      <td className="beat-row__data">
        <Highlight text={beat.title} highlight={searchText} />
        {mode === 'edit' ? (
          <>
            <label htmlFor={`beat-title-input-${beat.id}`} className="sr-only">Title</label>
            <input 
              id={`beat-title-input-${beat.id}`}
              className='beat-row__input beat-row__input--title'
              type="text"
              defaultValue={beat.title} 
              onBlur={(e) => {
                handleInputChange('title', e.target.value);
                handleBlur(beat.id, 'title', e.target.value);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
              onClick={(e) => e.stopPropagation()}
              spellCheck="false"
              ref={inputTitleRef}
            />
          </>
        ) : (
          <div className='beat-row__input beat-row__input--title beat-row__input--static' ref={inputTitleRef}>{beat.title}</div>
        )}
      </td>
      {mode !== 'lock' && (
        <>
          <td className="beat-row__data">
            {mode === 'edit' ? (
              <>
                <label htmlFor={`beat-tierlist-select-${beat.id}`} className="sr-only">Tierlist</label>
                <div className="form-group">
                  <div className="select-wrapper">
                    <select 
                      id={`beat-tierlist-select-${beat.id}`}
                      className="select-wrapper__select" 
                      value={tierlist}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : e.target.value;
                        setTierlist(e.target.value);
                        handleInputChange('tierlist', value);
                        handleUpdate(beat.id, 'tierlist', value);
                      }}
                      onFocus={(e) => e.target.style.color = 'white'}
                      onBlur={(e) => e.target.style.color = tierlist ? 'white' : 'grey'}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: tierlist ? 'white' : 'grey' }}
                    >
                      <option value=""></option>
                      <option value="M">M</option>
                      <option value="G">G</option>
                      <option value="S">S</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                      <option value="F">F</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <div className="beat-row__input beat-row__input--static">{beat.tierlist}</div>
            )}
          </td>
          <td className="beat-row__data">
            {mode === 'edit' ? (
              <>
                <label htmlFor={`beat-bpm-input-${beat.id}`} className="sr-only">BPM</label>
                <input 
                  id={`beat-bpm-input-${beat.id}`}
                  className='beat-row__input beat-row__input--bpm'
                  type="text" 
                  defaultValue={beat.bpm} 
                  onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                  onBlur={(e) => {
                    handleInputChange('bpm', e.target.value);
                    handleBpmBlur(e);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  spellCheck="false"
                  autoComplete="off"
                />
              </>
            ) : (
              <div className='beat-row__input beat-row__input--static beat-row__input--bpm'>{beat.bpm}</div>
            )}
          </td>
          <td className="beat-row__data">
             <SelectableInput
              {...commonSelectableInputProps}
              associationType="genres"
              headerIndex='4'
              key={`genres-${beat.id}`}
            />
          </td>
          <td className="beat-row__data">
              <SelectableInput
                {...commonSelectableInputProps}
                associationType="moods"
                headerIndex='5'
                key={`moods-${beat.id}`}
              />
          </td>
          <td className="beat-row__data">
              <SelectableInput
                {...commonSelectableInputProps}
                associationType="keywords"
                headerIndex='6'
                key={`keywords-${beat.id}`}
              />
          </td> 
          <td className="beat-row__data">
              <SelectableInput
                {...commonSelectableInputProps}
                associationType="features"
                headerIndex='7'
                key={`features-${beat.id}`}
              />
          </td>
        </>
      )}
      {!(isMobileOrTablet() && mode === 'lock') && (
        <td className='beat-row__data beat-row__duration'>
          <div className="beat-row__duration-content">
            <span className="beat-row__duration-text">
              {formatTime(beat.duration)}
            </span>
          </div>
        </td>
      )}
      <td className="beat-row__data beat-row__menu">
      <IconButton
        className={`icon-button--menu interactive-button ${isMobileOrTablet() ? 'icon-button--menu--mobile' : ''}`}
        onClick={(e) => handleMenuButtonClick(e, beat)}
        ariaLabel="Open menu"
      >
        <IoEllipsisHorizontal fontSize={24} />
      </IconButton>
      </td>
      {activeContextMenu === (beat.uniqueKey || `${beat.id}-${beats.indexOf(beat)}`) && (
        <ContextMenu
          beat={beat}
          position={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}
          setActiveContextMenu={setActiveContextMenu}
          items={contextMenuItems}
        />
      )}
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Return true if props are equal (skip re-render), false if different (re-render)
  
  // Always re-render if mode changes or if this beat is selected/deselected
  if (prevProps.mode !== nextProps.mode) return false;
  if (prevProps.isOffline !== nextProps.isOffline) return false;
  
  const wasSelected = prevProps.selectedBeats.some(b => 
    (b.uniqueKey && prevProps.beat.uniqueKey && b.uniqueKey === prevProps.beat.uniqueKey) ||
    (b.id === prevProps.beat.id)
  );
  const isSelected = nextProps.selectedBeats.some(b => 
    (b.uniqueKey && nextProps.beat.uniqueKey && b.uniqueKey === nextProps.beat.uniqueKey) ||
    (b.id === nextProps.beat.id)
  );
  if (wasSelected !== isSelected) return false;
  
  // Re-render if this beat is/was the current beat (regardless of playing state)
  // This ensures the playing style is properly added/removed
  const wasCurrent = prevProps.currentBeat?.id === prevProps.beat.id;
  const isCurrent = nextProps.currentBeat?.id === nextProps.beat.id;
  if (wasCurrent !== isCurrent) return false;
  
  // Also re-render if playing state changed while being current beat
  if (isCurrent && prevProps.isPlaying !== nextProps.isPlaying) return false;
  
  // Re-render if beat data changed
  if (prevProps.beat.title !== nextProps.beat.title) return false;
  if (prevProps.beat.bpm !== nextProps.beat.bpm) return false;
  if (prevProps.beat.tierlist !== nextProps.beat.tierlist) return false;
  if (prevProps.beat.duration !== nextProps.beat.duration) return false;
  
  // Re-render if searchText changes (affects highlighting)
  if (prevProps.searchText !== nextProps.searchText) return false;
  
  // Re-render if context menu is active for this beat
  const wasContextMenuActive = prevProps.activeContextMenu === (prevProps.beat.uniqueKey || `${prevProps.beat.id}-${prevProps.beats.indexOf(prevProps.beat)}`);
  const isContextMenuActive = nextProps.activeContextMenu === (nextProps.beat.uniqueKey || `${nextProps.beat.id}-${nextProps.beats.indexOf(nextProps.beat)}`);
  if (wasContextMenuActive !== isContextMenuActive) return false;
  
  // Re-render if beat associations changed (genres, moods, keywords, features)
  // Use shallow comparison instead of expensive JSON.stringify
  const prevGenres = prevProps.beat.genres || [];
  const nextGenres = nextProps.beat.genres || [];
  if (prevGenres.length !== nextGenres.length) return false;
  
  const prevMoods = prevProps.beat.moods || [];
  const nextMoods = nextProps.beat.moods || [];
  if (prevMoods.length !== nextMoods.length) return false;
  
  const prevKeywords = prevProps.beat.keywords || [];
  const nextKeywords = nextProps.beat.keywords || [];
  if (prevKeywords.length !== nextKeywords.length) return false;
  
  const prevFeatures = prevProps.beat.features || [];
  const nextFeatures = nextProps.beat.features || [];
  if (prevFeatures.length !== nextFeatures.length) return false;
  
  // If all checks pass, props are equal - skip re-render
  return true;
});

export default BeatRow;