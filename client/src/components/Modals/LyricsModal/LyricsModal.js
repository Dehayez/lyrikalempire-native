import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ResizableBox } from 'react-resizable';
import Draggable from 'react-draggable';
import Modal from 'react-modal';
import { IoCloseSharp, IoExpand, IoContract } from 'react-icons/io5';

import { isAuthPage, isMobileOrTablet } from '../../../utils';
import { useLocalStorageSync } from '../../../hooks';
import {
  getAssociationsByBeatId,
  addAssociationsToBeat,
} from '../../../services/beatService';
import {
  getLyricsById,
  updateLyricsById,
  createLyrics,
} from '../../../services/lyricsService';

import { IconButton } from '../../Buttons';
import { FormTextarea } from '../../Inputs';
import useOs from '../../../hooks/useOs';

import './LyricsModal.scss';

const MODAL_STYLE = {
  overlay: {
    backgroundColor: 'transparent',
    zIndex: 10,
    pointerEvents: 'none',
  },
  content: {
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    height: '100%',
    width: '100%',
    margin: 'auto',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
};

const LYRICS_SAVE_DEBOUNCE_MS = 1200;
const LYRICS_POLL_INTERVAL_MS = 2000;

const LyricsModal = ({ beatId, title, beat, lyricsModal, setLyricsModal }) => {
  const location = useLocation();
  const isAuthRoute = useMemo(() => isAuthPage(location.pathname), [location.pathname]);
  const isMobile = useMemo(() => isMobileOrTablet(), []);
  const os = useOs();

  const draggableRef = useRef(null);
  const modalRef = useRef(null);
  const lyricsRetryCount = useRef(0);
  const rhymesListRef = useRef(null);
  const pendingRhymesScrollPosition = useRef({ left: null, top: null });
  const prevRhymesCount = useRef(0);
  const saveTimeoutRef = useRef(null);
  const pendingLyricsRef = useRef('');
  const lastSyncedLyricsRef = useRef('');
  const currentLyricsRef = useRef('');
  const scheduleLyricsSaveRef = useRef(null);
  const isSavingRef = useRef(false);
  const isDirtyRef = useRef(false);

  const [lyrics, setLyrics] = useState('');
  const [lyricsId, setLyricsId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState(() => {
    return JSON.parse(localStorage.getItem('dimensions')) || { width: 400, height: 300 };
  });
  const [position, setPosition] = useState(() => {
    return JSON.parse(localStorage.getItem('modalPosition')) || { x: 0, y: 0 };
  });
  const [preFullscreenState, setPreFullscreenState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [rhymes, setRhymes] = useState([]);
  const [isRhymesLoading, setIsRhymesLoading] = useState(false);
  const [rhymeLimit, setRhymeLimit] = useState(24);
  const [isMorePending, setIsMorePending] = useState(false);

  const handleCancel = useCallback(() => setLyricsModal(false), [setLyricsModal]);

  useLocalStorageSync({ dimensions, position });

  useEffect(() => {
    currentLyricsRef.current = lyrics;
  }, [lyrics]);

  useEffect(() => {
    if (!beatId) return;

    const fetchLyrics = async () => {
      setIsLoading(true);
      try {
        // Use lyrics from beat prop if available, otherwise fallback to API
        if (beat && beat.lyrics && beat.lyrics.length > 0) {
          const lyricsAssoc = beat.lyrics[0];
          if (lyricsAssoc?.lyrics_id) {
            const [lyricData] = await getLyricsById(lyricsAssoc.lyrics_id);
            const nextLyrics = lyricData?.lyrics || '';
            setLyrics(nextLyrics);
            setLyricsId(lyricsAssoc.lyrics_id);
            pendingLyricsRef.current = nextLyrics;
            lastSyncedLyricsRef.current = nextLyrics;
            isDirtyRef.current = false;
            lyricsRetryCount.current = 0; // Reset retry counter on success
          } else {
            setLyrics('');
            setLyricsId(null);
            pendingLyricsRef.current = '';
            lastSyncedLyricsRef.current = '';
            isDirtyRef.current = false;
          }
        } else {
          // Fallback to API call if beat prop doesn't have lyrics
          const [assoc] = await getAssociationsByBeatId(beatId, 'lyrics');
          if (assoc?.lyrics_id) {
            const [lyricData] = await getLyricsById(assoc.lyrics_id);
            const nextLyrics = lyricData?.lyrics || '';
            setLyrics(nextLyrics);
            setLyricsId(assoc.lyrics_id);
            pendingLyricsRef.current = nextLyrics;
            lastSyncedLyricsRef.current = nextLyrics;
            isDirtyRef.current = false;
            lyricsRetryCount.current = 0; // Reset retry counter on success
          } else {
            setLyrics('');
            setLyricsId(null);
            pendingLyricsRef.current = '';
            lastSyncedLyricsRef.current = '';
            isDirtyRef.current = false;
          }
        }
      } catch (err) {
        // Retry logic for lyrics fetching
        if (lyricsRetryCount.current < 3) {
          lyricsRetryCount.current += 1;
          setTimeout(fetchLyrics, 2000 * lyricsRetryCount.current); // Exponential backoff
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchLyrics();
  }, [beatId, beat]);

  useEffect(() => {
    if (lyricsModal) return undefined;

    setSelectedWord('');
    setRhymes([]);
    setIsRhymesLoading(false);

    return undefined;
  }, [lyricsModal]);

  const performLyricsSave = useCallback((lyricsToSave) => {
    if (!beatId || lyricsToSave === null || typeof lyricsToSave === 'undefined') return;

    isSavingRef.current = true;

    const saveRequest = lyricsId
      ? updateLyricsById(lyricsId, lyricsToSave)
      : createLyrics(lyricsToSave).then((newId) => {
          setLyricsId(newId);
          return addAssociationsToBeat(beatId, 'lyrics', newId);
        });

    saveRequest
      .then(() => {
        lastSyncedLyricsRef.current = lyricsToSave;
        if (pendingLyricsRef.current === lyricsToSave) {
          isDirtyRef.current = false;
        }
      })
      .catch((err) => {
        console.error('Failed to update/create lyrics:', err);
      })
      .finally(() => {
        isSavingRef.current = false;
        if (pendingLyricsRef.current !== lyricsToSave && scheduleLyricsSaveRef.current) {
          scheduleLyricsSaveRef.current(pendingLyricsRef.current);
        }
      });
  }, [beatId, lyricsId]);

  const scheduleLyricsSave = useCallback((lyricsToSave) => {
    if (!beatId) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    pendingLyricsRef.current = lyricsToSave;

    if (isSavingRef.current) return;

    saveTimeoutRef.current = setTimeout(() => {
      performLyricsSave(pendingLyricsRef.current);
    }, LYRICS_SAVE_DEBOUNCE_MS);
  }, [beatId, performLyricsSave]);

  useEffect(() => {
    scheduleLyricsSaveRef.current = scheduleLyricsSave;
  }, [scheduleLyricsSave]);

  const flushLyricsSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (!isDirtyRef.current || isSavingRef.current) return;

    performLyricsSave(pendingLyricsRef.current);
  }, [performLyricsSave]);

  const handleLyricsChange = useCallback((e) => {
    const newLyrics = e.target.value;
    setLyrics(newLyrics);
    isDirtyRef.current = true;
    scheduleLyricsSave(newLyrics);
  }, [scheduleLyricsSave]);

  useEffect(() => {
    if (lyricsModal) return undefined;

    flushLyricsSave();
    return undefined;
  }, [lyricsModal, flushLyricsSave]);

  useEffect(() => {
    if (!lyricsModal || !lyricsId) return undefined;

    const pollLyrics = () => {
      if (isDirtyRef.current || isSavingRef.current) return;

      getLyricsById(lyricsId)
        .then(([lyricData]) => {
          const nextLyrics = lyricData?.lyrics || '';
          if (nextLyrics !== lastSyncedLyricsRef.current) {
            if (nextLyrics !== currentLyricsRef.current) {
              setLyrics(nextLyrics);
            }
            lastSyncedLyricsRef.current = nextLyrics;
            pendingLyricsRef.current = nextLyrics;
          }
        })
        .catch(() => {});
    };

    const intervalId = setInterval(pollLyrics, LYRICS_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [lyricsModal, lyricsId]);

  const getSelectedWord = useCallback((textarea) => {
    if (!textarea) return '';

    const { selectionStart, selectionEnd, value } = textarea;
    if (selectionStart === selectionEnd) return '';

    const selectedText = value.slice(selectionStart, selectionEnd);
    const words = selectedText.match(/[A-Za-z']+/g);

    if (!words || !words.length) return '';

    const phrase = words.slice(-3).join(' ').toLowerCase();
    return phrase;
  }, []);

  const handleSelectionChange = useCallback((event) => {
    const nextWord = getSelectedWord(event.target);
    if (nextWord !== selectedWord) {
      setRhymeLimit(24);
      setIsMorePending(false);
      pendingRhymesScrollPosition.current = { left: null, top: null };
    }
    setSelectedWord((prev) => (prev === nextWord ? prev : nextWord));
  }, [getSelectedWord, selectedWord]);

  useEffect(() => {
    if (!selectedWord) {
      setRhymes([]);
      setIsRhymesLoading(false);
      setIsMorePending(false);
      pendingRhymesScrollPosition.current = { left: null, top: null };
      return undefined;
    }

    const controller = new AbortController();
    setIsRhymesLoading(true);
    const hasMultipleWords = selectedWord.trim().includes(' ');
    const fallbackWord = selectedWord.trim().split(' ').slice(-1)[0];
    const fetchRhymes = (query) => {
      return fetch(`https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(query)}&max=${rhymeLimit}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch rhymes');
          }
          return response.json();
        });
    };

    fetchRhymes(selectedWord)
      .then((data) => {
        if (hasMultipleWords && (!Array.isArray(data) || !data.length) && fallbackWord) {
          return fetchRhymes(fallbackWord);
        }
        return data;
      })
      .then((data) => {
        const nextRhymes = Array.isArray(data)
          ? data
              .slice()
              .sort((a, b) => (b.score || 0) - (a.score || 0))
              .map((item) => item.word)
              .filter(Boolean)
          : [];
        setRhymes(nextRhymes);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setRhymes([]);
        }
      })
      .finally(() => {
        setIsRhymesLoading(false);
      });

    return () => controller.abort();
  }, [selectedWord, rhymeLimit]);

  useEffect(() => {
    if (!rhymes.length) return;
    if (!rhymesListRef.current) return;

    const { left, top } = pendingRhymesScrollPosition.current || {};
    if (left === null && top === null) return;

    if (typeof left === 'number') {
      rhymesListRef.current.scrollLeft = left;
    }
    if (typeof top === 'number') {
      rhymesListRef.current.scrollTop = top;
    }
    pendingRhymesScrollPosition.current = { left: null, top: null };
  }, [rhymes.length]);

  useEffect(() => {
    if (!isMorePending) {
      prevRhymesCount.current = rhymes.length;
      return;
    }
    if (rhymes.length > prevRhymesCount.current) {
      setIsMorePending(false);
    }
    prevRhymesCount.current = rhymes.length;
  }, [isMorePending, rhymes.length]);

  useEffect(() => {
    if (!isMobile || !lyricsModal) return undefined;
    const root = document.documentElement;
    const visualViewport = window.visualViewport;
    const updateKeyboardOffset = () => {
      let offset = 0;
      if (visualViewport) {
        const heightDelta = window.innerHeight - visualViewport.height - visualViewport.offsetTop;
        offset = Math.max(0, Math.round(heightDelta));
      }
      root.style.setProperty('--keyboard-offset', `${offset}px`);
    };

    updateKeyboardOffset();

    if (!visualViewport) {
      return () => {
        root.style.setProperty('--keyboard-offset', '0px');
      };
    }

    visualViewport.addEventListener('resize', updateKeyboardOffset);
    visualViewport.addEventListener('scroll', updateKeyboardOffset);
    window.addEventListener('orientationchange', updateKeyboardOffset);

    return () => {
      visualViewport.removeEventListener('resize', updateKeyboardOffset);
      visualViewport.removeEventListener('scroll', updateKeyboardOffset);
      window.removeEventListener('orientationchange', updateKeyboardOffset);
      root.style.setProperty('--keyboard-offset', '0px');
    };
  }, [isMobile, lyricsModal]);

  const handleLoadMoreRhymes = useCallback(() => {
    if (rhymesListRef.current) {
      pendingRhymesScrollPosition.current = {
        left: rhymesListRef.current.scrollLeft,
        top: rhymesListRef.current.scrollTop,
      };
    }
    setIsMorePending(true);
    setRhymeLimit((prev) => prev + 24);
  }, []);

  const shouldShowMoreButton = rhymes.length >= rhymeLimit || isRhymesLoading || isMorePending;

  const handleFullscreenToggle = useCallback(() => {
    if (isFullscreen) {
      // Exit fullscreen - restore to previous dimensions
      setDimensions(preFullscreenState?.dimensions || { width: 400, height: 300 });
      setPosition(preFullscreenState?.position || { x: 0, y: 0 });
      setIsFullscreen(false);
      setPreFullscreenState(null);
    } else {
      // Enter fullscreen - save current state
      setPreFullscreenState({
        dimensions: { ...dimensions },
        position: { ...position }
      });
      setIsFullscreen(true);
    }
  }, [isFullscreen, preFullscreenState, dimensions, position]);

  const handleResize = useCallback((event, { size }) => {
    if (!isFullscreen) {
      setDimensions({ width: size.width, height: size.height });
    }
  }, [isFullscreen]);

  const handleDrag = useCallback((event, data) => {
    if (!isFullscreen) {
      setPosition({ x: data.x, y: data.y });
    }
  }, [isFullscreen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      const isMac = os === 'mac';
      const isCmdF = isMac && event.metaKey && event.key.toLowerCase() === 'f';
      const isCtrlF = !isMac && event.ctrlKey && event.key.toLowerCase() === 'f';
      if (event.key === 'Escape' && isFullscreen) {
        handleFullscreenToggle();
      } else if (isCmdF || isCtrlF) {
        event.preventDefault();
        handleFullscreenToggle();
      }
    };

    if (lyricsModal) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [lyricsModal, isFullscreen, handleFullscreenToggle, os]);

  if (isAuthRoute) return null;

  const modalContent = (
    <div className="modal-content" ref={modalRef}>
    {!isMobile && (
      <IconButton 
        className="modal__fullscreen-button" 
        onClick={handleFullscreenToggle}
        text={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        shortcutText={os === 'mac' ? '⌘F' : 'Ctrl+F'}
        tooltipPosition="left"
      >
        {isFullscreen ? <IoContract /> : <IoExpand />}
      </IconButton>
      
    )}
      <IconButton 
        className="modal__close-button" 
        onClick={handleCancel}
        text="Close"
        shortcutText="Esc"
        tooltipPosition="left"
      >
        <IoCloseSharp />
      </IconButton>
      <h2 className="modal__title">{title}</h2>
      {isLoading ? (
        <div className="lyrics-modal__loading">Loading lyrics...</div>
      ) : (
        <div className="lyrics-modal__body">
          <div className="lyrics-modal__editor">
            <FormTextarea
              id="lyrics-modal__textarea"
              value={lyrics}
              onChange={handleLyricsChange}
              onSelect={handleSelectionChange}
              onMouseUp={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              onTouchEnd={handleSelectionChange}
            />
          </div>
          {isMobile && selectedWord && (
            <div className="lyrics-modal__rhymes-bar" aria-live="polite">
              <div className="lyrics-modal__rhymes-header">
                <span className="lyrics-modal__rhymes-title">Rhymes</span>
                <span className="lyrics-modal__rhymes-word">{selectedWord}</span>
              </div>
              <div
                className="lyrics-modal__rhymes-list lyrics-modal__rhymes-list--mobile"
                ref={rhymesListRef}
              >
                {rhymes.length ? (
                  <>
                    {rhymes.map((rhyme) => (
                      <span className="lyrics-modal__rhymes-item" key={rhyme}>
                        {rhyme}
                      </span>
                    ))}
                    {shouldShowMoreButton && (
                      <button
                        className="lyrics-modal__rhymes-item lyrics-modal__rhymes-item--more"
                        type="button"
                        onClick={handleLoadMoreRhymes}
                        disabled={isRhymesLoading}
                        aria-busy={isRhymesLoading}
                      >
                        <span className="lyrics-modal__rhymes-more-text">More</span>
                        <span className="lyrics-modal__rhymes-more-text lyrics-modal__rhymes-more-text--loading">
                          Loading...
                        </span>
                      </button>
                    )}
                  </>
                ) : isRhymesLoading ? (
                  <span className="lyrics-modal__rhymes-item lyrics-modal__rhymes-item--loading">
                    Loading...
                  </span>
                ) : (
                  <span className="lyrics-modal__rhymes-item lyrics-modal__rhymes-item--empty">
                    No rhymes found
                  </span>
                )}
              </div>
            </div>
          )}
          {!isMobile && selectedWord && (
            <aside className="lyrics-modal__rhymes-panel" aria-live="polite">
              <div className="lyrics-modal__rhymes-header">
                <span className="lyrics-modal__rhymes-title">Rhymes</span>
                <span className="lyrics-modal__rhymes-word">
                  {selectedWord}
                </span>
              </div>
              <div
                className="lyrics-modal__rhymes-list lyrics-modal__rhymes-list--desktop"
                ref={rhymesListRef}
              >
                {rhymes.length ? (
                  <>
                    {rhymes.map((rhyme) => (
                      <span className="lyrics-modal__rhymes-item" key={rhyme}>
                        {rhyme}
                      </span>
                    ))}
                    {shouldShowMoreButton && (
                      <button
                        className="lyrics-modal__rhymes-item lyrics-modal__rhymes-item--more"
                        type="button"
                        onClick={handleLoadMoreRhymes}
                        disabled={isRhymesLoading}
                        aria-busy={isRhymesLoading}
                      >
                        <span className="lyrics-modal__rhymes-more-text">More</span>
                        <span className="lyrics-modal__rhymes-more-text lyrics-modal__rhymes-more-text--loading">
                          Loading...
                        </span>
                      </button>
                    )}
                  </>
                ) : isRhymesLoading ? (
                  <span className="lyrics-modal__rhymes-item lyrics-modal__rhymes-item--loading">
                    Loading...
                  </span>
                ) : (
                  <span className="lyrics-modal__rhymes-item lyrics-modal__rhymes-item--empty">
                    No rhymes found
                  </span>
                )}
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Modal
      className={`lyrics-modal ${isFullscreen ? 'lyrics-modal--fullscreen' : ''}`}
      isOpen={lyricsModal}
      onRequestClose={handleCancel}
      style={MODAL_STYLE}
      shouldCloseOnOverlayClick={false}
    >
      {isMobile ? (
        <div className="modal modal--mobile">
          {modalContent}
        </div>
      ) : (
        <Draggable 
          handle=".modal__title" 
          nodeRef={draggableRef}
          position={isFullscreen ? { x: 0, y: 0 } : position}
          onDrag={handleDrag}
          disabled={isFullscreen}
        >
          <div ref={draggableRef} className="modal">
            {isFullscreen ? (
              <div className="modal-content-fullscreen">
                {modalContent}
              </div>
            ) : (
              <ResizableBox
                width={dimensions.width}
                height={dimensions.height}
                onResize={handleResize}
                minConstraints={[300, 200]}
                maxConstraints={[window.innerWidth - 100, window.innerHeight - 100]}
              >
                {modalContent}
              </ResizableBox>
            )}
          </div>
        </Draggable>
      )}
    </Modal>
  );
};

export default LyricsModal;