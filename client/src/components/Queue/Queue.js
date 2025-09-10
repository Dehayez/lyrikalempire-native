import React, { useState, useEffect } from 'react';
import { IoAddSharp, IoListSharp, IoEllipsisHorizontal, IoRemoveCircleOutline } from "react-icons/io5";

import { usePlaylist } from '../../contexts';
import { addBeatsToPlaylist } from '../../services';

import { ContextMenu } from '../ContextMenu';
import { isMobileOrTablet } from '../../utils';
import './Queue.scss';

const Queue = ({ queue, setQueue, currentBeat, onBeatClick, isShuffleEnabled, customQueue, setCustomQueue, addToCustomQueue }) => {
  const { playlists } = usePlaylist();
  const [activeContextMenu, setActiveContextMenu] = useState(null);
  const [contextMenuX, setContextMenuX] = useState(0);
  const [contextMenuY, setContextMenuY] = useState(0);

  useEffect(() => {
    const toggleScroll = (disable) => document.body.classList.toggle('no-scroll', disable);
    const hideContextMenu = () => setActiveContextMenu(null);

    const manageContextMenuVisibility = (show) => {
      window[`${show ? 'add' : 'remove'}EventListener`]('click', hideContextMenu);
      toggleScroll(show);
    };

    manageContextMenuVisibility(!!activeContextMenu);

    return () => manageContextMenuVisibility(false);
  }, [activeContextMenu]);

  const handleRightClick = (e, beat, index) => {
    e.preventDefault();
    const contextMenuWidth = 200;
    const contextMenuHeight = 150;
    let adjustedX = e.clientX;
    let adjustedY = e.clientY;
  
    if (adjustedX + contextMenuWidth > window.innerWidth) {
      adjustedX = window.innerWidth - contextMenuWidth;
    }
    if (adjustedY + contextMenuHeight > window.innerHeight) {
      adjustedY = window.innerHeight - contextMenuHeight;
    }
  
    setActiveContextMenu(`${beat.id}-${index}`);
    setContextMenuX(adjustedX);
    setContextMenuY(adjustedY);
  };

  const handleMenuButtonClick = (e, beat, index) => {
    e.stopPropagation();
    const button = e.currentTarget;
  
    const buttonRect = button.getBoundingClientRect();
    const contextMenuWidth = 200;
    const adjustedX = buttonRect.right - contextMenuWidth;
    const adjustedY = buttonRect.top + buttonRect.height;
  
    setActiveContextMenu(`${beat.id}-${index}`);
    setContextMenuX(adjustedX);
    setContextMenuY(adjustedY);
  };

  const handleBeatClick = (beat) => {
    if (onBeatClick) {
      onBeatClick(beat);
    }
  };

  const handleRemoveFromQueueClick = (beat) => {
    setQueue(currentQueue => currentQueue.filter(item => item.id !== beat.id));
  };

  const handleAddToCustomQueueClick = (beat) => {
    addToCustomQueue(beat);
  };

  const handleRemoveFromCustomQueueClick = (index) => {
    setCustomQueue(currentCustomQueue => [
      ...currentCustomQueue.slice(0, index),
      ...currentCustomQueue.slice(index + 1)
    ]);
  };

  const getNextItemForShuffle = () => {
    if (queue.length > 0) {
      return queue.map((item, index) => ({
        ...item,
        uniqueKey: item.uniqueKey || `non-shuffle-${item.id}-${index}`
      }));
    }
    return [];
  };

  const handleAddBeatToPlaylist = async (playlistId, beatIds) => {
    try {
      await addBeatsToPlaylist(playlistId, beatIds);
    } catch (error) {
      console.error('Error adding beats to playlist:', error);
    }
  };

  return (
    <div className="queue">
      {currentBeat && (
        <div className='queue__section'> 
          <h3 className="queue__subtitle">Now Playing</h3>
          <ul className="queue__list">
          <li
            className={`queue__list-item queue__list-item--playing`}
            key={currentBeat.id}
            onContextMenu={(e) => handleRightClick(e, currentBeat, 0)}
            onClick={(e) => {
              handleBeatClick(currentBeat);
              if (isMobileOrTablet()) {
                handleBeatClick(currentBeat);
              }
            }}
            onMouseEnter={(e) => {
              if (!isMobileOrTablet()) {
                e.currentTarget.querySelectorAll('.interactive-button').forEach(button => {
                  button.style.opacity = 1;
                });
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobileOrTablet()) {
                e.currentTarget.querySelectorAll('.interactive-button').forEach(button => {
                  button.style.opacity = 0;
                });
              }
            }}
          >
            {currentBeat.title}
            <button 
              className={`icon-button icon-button--menu interactive-button ${isMobileOrTablet() ? 'icon-button--menu--mobile' : ''}`} 
              onClick={(e) => handleMenuButtonClick(e, currentBeat, 0)}
            >
              <IoEllipsisHorizontal fontSize={24} />
            </button>

            {activeContextMenu === `${currentBeat.id}-0` && (
              <ContextMenu
                beat={currentBeat}
                position={{ top: contextMenuY, left: contextMenuX }}
                setActiveContextMenu={setActiveContextMenu}
                items={[
                  {
                    icon: IoAddSharp,
                    iconClass: 'add-playlist',
                    text: 'Add to playlist',
                    buttonClass: 'add-playlist',
                    subItems: playlists.map(playlist => ({
                      text: playlist.title,
                      onClick: () => {
                        handleAddBeatToPlaylist(playlist.id, currentBeat.id);
                      },
                    })),
                  },
                  {
                    icon: IoListSharp,
                    iconClass: 'add-queue',
                    text: 'Add to queue',
                    buttonClass: 'add-queue',
                    onClick: () => handleAddToCustomQueueClick(currentBeat),
                  },
                ]}
              />
            )}
          </li>
          </ul>
        </div>
      )}

      {customQueue.length > 0 && (
        <div className='queue__section'>
          <h3 className="queue__subtitle">Next in Queue</h3>
          <ul className='queue__list'>
          {customQueue.map((beat, index) => (
              <li
                className={`queue__list-item ${currentBeat && beat.id === currentBeat.id ? 'queue__list-item--playing' : ''}`}
                key={beat.id ? `custom-${beat.id}-${index}` : `custom-index-${index}`}
                onContextMenu={(e) => handleRightClick(e, beat, index)}
                onClick={(e) => {
                  handleBeatClick(beat);
                  if (isMobileOrTablet()) {
                    handleBeatClick(beat);
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isMobileOrTablet()) {
                    e.currentTarget.querySelectorAll('.interactive-button').forEach(button => {
                      button.style.opacity = 1;
                    });
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobileOrTablet()) {
                    e.currentTarget.querySelectorAll('.interactive-button').forEach(button => {
                      button.style.opacity = 0;
                    });
                  }
                }}
              >
                {beat.title}
                <button 
                  className={`icon-button icon-button--menu interactive-button ${isMobileOrTablet() ? 'icon-button--menu--mobile' : ''}`} 
                  onClick={(e) => handleMenuButtonClick(e, beat, index)}
                >
                  <IoEllipsisHorizontal fontSize={24} />
                </button>

                {activeContextMenu === `${beat.id}-${index}` && (
                  <ContextMenu
                    beat={beat}
                    position={{ top: contextMenuY, left: contextMenuX }}
                    setActiveContextMenu={setActiveContextMenu}
                    items={[
                      {
                        icon: IoAddSharp,
                        iconClass: 'add-playlist',
                        text: 'Add to playlist',
                        buttonClass: 'add-playlist',
                        subItems: playlists.map(playlist => ({
                          text: playlist.title,
                          onClick: () => {
                            handleAddBeatToPlaylist(playlist.id, beat.id);
                          },
                        })),
                      },
                      {
                        icon: IoListSharp,
                        iconClass: 'add-queue',
                        text: 'Add to queue',
                        buttonClass: 'add-queue',
                        onClick: () => handleAddToCustomQueueClick(beat),
                      },
                      {
                        icon: IoRemoveCircleOutline,
                        iconClass: 'remove-queue',
                        text: 'Remove from queue',
                        buttonClass: 'remove-queue',
                        onClick: () => handleRemoveFromCustomQueueClick(index),
                      },
                    ]}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {queue.length > 0 && (
        <div className='queue__section'>
          <h3 className="queue__subtitle">Up Next</h3>
          <ul className="queue__list">
          {(isShuffleEnabled ? getNextItemForShuffle() : queue.map((item, index) => ({
            ...item,
            uniqueKey: `non-shuffle-${item.id}-${index}`
          }))).filter(beat => !currentBeat || beat.id !== currentBeat.id).map((beat, index) => (
            <li
              className={`queue__list-item ${currentBeat && beat.id === currentBeat.id ? 'queue__list-item--playing' : ''}`}
              key={beat.uniqueKey}
              onContextMenu={(e) => handleRightClick(e, beat, index)}
              onClick={(e) => {
                handleBeatClick(beat);
                if (isMobileOrTablet()) {
                  handleBeatClick(beat);
                }
              }}
              onMouseEnter={(e) => {
                if (!isMobileOrTablet()) {
                  e.currentTarget.querySelectorAll('.interactive-button').forEach(button => {
                    button.style.opacity = 1;
                  });
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobileOrTablet()) {
                  e.currentTarget.querySelectorAll('.interactive-button').forEach(button => {
                    button.style.opacity = 0;
                  });
                }
              }}
            >
            {beat.title}
            <button 
              className={`icon-button icon-button--menu interactive-button ${isMobileOrTablet() ? 'icon-button--menu--mobile' : ''}`} 
              onClick={(e) => handleMenuButtonClick(e, beat, index)}
            >
              <IoEllipsisHorizontal fontSize={24} />
            </button>

            {activeContextMenu === `${beat.id}-${index}` && (
              <ContextMenu
                beat={beat}
                position={{ top: contextMenuY, left: contextMenuX }}
                setActiveContextMenu={setActiveContextMenu}
                items={[
                  {
                    icon: IoAddSharp,
                    iconClass: 'add-playlist',
                    text: 'Add to playlist',
                    buttonClass: 'add-playlist',
                    subItems: playlists.map(playlist => ({
                      text: playlist.title,
                      onClick: () => {
                        handleAddBeatToPlaylist(playlist.id, beat.id);
                      },
                    })),
                  },
                  {
                    icon: IoListSharp,
                    iconClass: 'add-queue',
                    text: 'Add to queue',
                    buttonClass: 'add-queue',
                    onClick: () => handleAddToCustomQueueClick(beat),
                  },
                  {
                    icon: IoRemoveCircleOutline,
                    iconClass: 'remove-queue',
                    text: 'Remove from queue',
                    buttonClass: 'remove-queue',
                    onClick: () => handleRemoveFromQueueClick(beat),
                  },
                ]}
              />
            )}
            </li>
          ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Queue;