import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from './components';
import { IoPersonSharp, IoSpeedometer } from "react-icons/io5";
import classNames from 'classnames';

import { isMobileOrTablet, getInitialState, isAuthPage } from './utils';
import { useSort, useDragAndDrop, useLocalStorageSync, useAudioPlayer, usePanels, useAudioCache } from './hooks';
import { useBeat, useUser, useWebSocket } from './contexts';
import ProtectedRoute from './routes/ProtectedRoute';
import { updateBeat as updateBeatService } from './services/beatService';

import { DashboardPage, BeatsPage, PlaylistsPage, GenresPage, MoodsPage, KeywordsPage, FeaturesPage, LoginPage, RegisterPage, ConfirmEmailPage, RequestPasswordResetPage, ResetPasswordPage, ProfilePage, SettingsPage } from './pages';
import { Header, BeatList, AddBeatForm, AddBeatButton, AudioPlayer, Footer, Queue, Playlists, RightSidePanel, LeftSidePanel, History, PlaylistDetail, LyricsModal, IconButton, PlayingIndicator, Intro } from './components';
import NotFound from './components/NotFound';

import './App.scss';

// Lazy load performance panel only for allowed users
const PerformancePanel = lazy(() => import('./components/PerformancePanel/PerformancePanel'));


function App() {
  const location = useLocation();
  const isAuthRoute = isAuthPage(location.pathname);
  const { beats, setBeats, setGlobalBeats, setRefreshBeats, currentBeats } = useBeat();
  const navigate = useNavigate();
  const { user } = useUser();
  const { username } = user;
  const isPerfAllowed = Number(user?.id) === 39;
  const { emitBeatChange } = useWebSocket();
  const { isDraggingOver, droppedFiles, clearDroppedFiles } = useDragAndDrop(setRefreshBeats, user.id);
  const { preloadQueue, checkBeatsCacheStatus, markBeatAsCached, isBeatCachedSync } = useAudioCache();

  // Core state
  const [viewState, setViewState] = useState(() => getInitialState('lastView', 'queue'));
  const [currentBeat, setCurrentBeat] = useState(() => getInitialState('currentBeat', null));
  const [selectedBeat, setSelectedBeat] = useState(() => getInitialState('selectedBeat', null));
  const { sortedItems: sortedBeats, sortConfig } = useSort(beats);
  const [queue, setQueue] = useState([]);
  const [shuffledQueue, setShuffledQueue] = useState([]);
  const [customQueue, setCustomQueue] = useState(() => getInitialState('customQueue', []));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [shuffle, setShuffle] = useState(() => getInitialState('shuffle', false));
  const [repeat, setRepeat] = useState(() => getInitialState('repeat', 'Disabled Repeat'));
  const [lyricsModal, setLyricsModal] = useState(getInitialState('lyricsModal', false));
  const [isScrolledBottom, setIsScrolledBottom] = useState(false);
  const [scrollOpacityBottom, setScrollOpacityBottom] = useState(0);
  const [sessionProps, setSessionProps] = useState({
    masterSession: null,
    currentSessionId: null,
    isCurrentSessionMaster: false
  });
  
  // Performance panel state (only for allowed users)
  const [isPerformancePanelOpen, setIsPerformancePanelOpen] = useState(false);
  const [isThrottlingEnabled, setIsThrottlingEnabled] = useState(false);
  const [networkThrottlePreset, setNetworkThrottlePreset] = useState('Custom');
  const [networkThrottleConfig, setNetworkThrottleConfig] = useState({
    latency: 100,
    downloadSpeed: 1024 * 1024,
    uploadSpeed: 512 * 1024,
    packetLoss: 0,
  });



  // Initialize cache status for beats
  useEffect(() => {
    if (beats && beats.length > 0) {
      checkBeatsCacheStatus(beats);
    }
  }, [beats, checkBeatsCacheStatus]);

  // Preload beats around current beat for better user experience
  useEffect(() => {
    if (currentBeat && queue.length > 0) {
      const currentIndex = queue.findIndex(beat => beat.id === currentBeat.id);
      if (currentIndex !== -1) {
        // Preload current beat and next 2 beats
        preloadQueue(queue, currentIndex, 3);
      }
    }
  }, [currentBeat, queue, preloadQueue]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (updateBeatTimeoutRef.current) {
        clearTimeout(updateBeatTimeoutRef.current);
      }
    };
  }, []);

  const {
    isLeftPanelVisible,
    isRightPanelVisible,
    isLeftDivVisible,
    isRightDivVisible,
    handleMouseEnterLeft,
    handleMouseLeaveLeft,
    handleMouseEnterRight,
    handleMouseLeaveRight,
    toggleSidePanel,
    closeSidePanel,
    setPanelState,
  } = usePanels();
  
  useLocalStorageSync({
    shuffle,
    repeat,
    currentBeat,
    selectedBeat,
    isLeftPanelVisible,
    isRightPanelVisible,
    viewState,
    customQueue,
    sortConfig,
    lyricsModal,
  });

  useEffect(() => {
    const handleSettingsUpdate = (event) => {
      const { key, value } = event.detail || {};
      if (!key) return;

      if (key === 'defaultView') {
        setViewState(value);
      }
      if (key === 'shuffleOnStart') {
        setShuffle(Boolean(value));
      }
      if (key === 'repeatMode') {
        setRepeat(value);
      }
      if (key === 'leftPanelPinned') {
        setPanelState('left', Boolean(value));
      }
      if (key === 'rightPanelPinned') {
        setPanelState('right', Boolean(value));
      }
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, [setPanelState, setViewState, setShuffle, setRepeat]);

  // Performance panel service refs (lazy loaded)
  const networkThrottleServiceRef = useRef(null);

  // Auto-apply throttling setting on load (only for allowed user)
  useEffect(() => {
    if (!isPerfAllowed) return;
    
    // Lazy load the network throttle service only when needed
    const loadAndApplyThrottle = async () => {
      if (isThrottlingEnabled && !networkThrottleServiceRef.current) {
        const { default: service } = await import('./services/networkThrottleService');
        networkThrottleServiceRef.current = service;
      }
      
      if (networkThrottleServiceRef.current) {
        if (isThrottlingEnabled) {
          networkThrottleServiceRef.current.enable(networkThrottleConfig);
        } else {
          networkThrottleServiceRef.current.disable();
        }
      }
    };
    
    loadAndApplyThrottle();
    
    return () => {
      if (networkThrottleServiceRef.current) {
        networkThrottleServiceRef.current.disable();
      }
    };
  }, [isPerfAllowed, isThrottlingEnabled, networkThrottleConfig]);

  // Define logQueue and updateHistory before handlePlayWrapper since they're dependencies
  const logQueue = useCallback((beats, shuffle, currentBeat, forceShuffle = false) => {
    let queue = [...beats];
    
    if (shuffle) {
      // If we don't have a shuffled queue yet, or if forceShuffle is true, create one
      if (shuffledQueue.length === 0 || forceShuffle) {
        const newShuffledQueue = [...beats];
        for (let i = newShuffledQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newShuffledQueue[i], newShuffledQueue[j]] = [newShuffledQueue[j], newShuffledQueue[i]];
        }
        setShuffledQueue(newShuffledQueue);
        queue = newShuffledQueue;
      } else {
        // Use existing shuffled queue
        queue = [...shuffledQueue];
      }
    } else {
      // Clear shuffled queue when shuffle is disabled
      if (shuffledQueue.length > 0) {
        setShuffledQueue([]);
      }
    }
    
    if (currentBeat) {
      const currentBeatIndex = queue.findIndex(beat => beat.id === currentBeat.id);
  
      if (currentBeatIndex >= 0) {
        // Get tracks after the current one (upcoming tracks)
        const upcomingTracks = queue.slice(currentBeatIndex + 1);
        // Get tracks before the current one (to be played later)
        const previousTracks = queue.slice(0, currentBeatIndex);
        // Combine: upcoming tracks first, then previous tracks
        queue = [...upcomingTracks, ...previousTracks];
      }
    }
    setQueue(queue);
  }, [shuffledQueue]);

  const updateHistory = useCallback((playedBeat) => {
    const history = getInitialState('playedBeatsHistory', []);
    const updatedHistory = [playedBeat, ...history].slice(0, 100);
    localStorage.setItem('playedBeatsHistory', JSON.stringify(updatedHistory));
  }, []);
  
  // Use a ref for handlePlay to avoid circular dependency issues
  const handlePlayRef = useRef(null);
  
  const handlePlayWrapper = useCallback((beat, play, beats, shouldUpdateQueue = false) => {
    if (shouldUpdateQueue) {
      logQueue(beats, shuffle, beat);
    }
    
    // Use ref to get the latest handlePlay function
    if (handlePlayRef.current) {
      handlePlayRef.current(beat, play, beats, setSelectedBeat, setBeats, currentBeat, setCurrentBeat, setIsPlaying);
    }
    updateHistory(beat);
    if (window.electron) {
      window.electron.setActivity(beat.title);
    }
    // Broadcast beat change to other tabs if it's a new beat
    if (emitBeatChange && beat.id !== currentBeat?.id) {
      emitBeatChange({
        beatId: beat.id,
        timestamp: Date.now(),
        beat: beat
      });
    }
  }, [shuffle, setSelectedBeat, setBeats, currentBeat, setCurrentBeat, setIsPlaying, emitBeatChange, logQueue, updateHistory]);

  const handlePrevWrapper = useCallback(() => {
    if (!currentBeats.length) return;
    
    // Use shuffled queue if shuffle is enabled, otherwise use regular queue
    const currentQueue = shuffle && shuffledQueue.length > 0 ? shuffledQueue : currentBeats;
    const currentIndex = currentQueue.findIndex(beat => beat.id === currentBeat.id);
    const prevIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : currentQueue.length - 1;
    const prevBeat = currentQueue[prevIndex];
    
    handlePlayWrapper(prevBeat, true, currentBeats, true);
    
    if (repeat === 'Repeat One') {
      setRepeat('Repeat');
    }
  }, [currentBeats, shuffle, shuffledQueue, currentBeat, repeat, handlePlayWrapper]);

  const handleNextWrapper = useCallback(() => {
    if (customQueue.length > 0) {
      const nextCustomBeat = customQueue[0];
      handlePlayWrapper(nextCustomBeat, true, currentBeats, true);
      setCustomQueue(customQueue.slice(1));
    } else {
      // Use shuffled queue if shuffle is enabled, otherwise use regular queue
      const currentQueue = shuffle && shuffledQueue.length > 0 ? shuffledQueue : currentBeats;
      const currentIndex = currentQueue.findIndex(beat => beat.id === currentBeat.id);
      const nextIndex = currentIndex + 1 < currentQueue.length ? currentIndex + 1 : 0;
      const nextBeat = currentQueue[nextIndex];
      handlePlayWrapper(nextBeat, true, currentBeats, true);
    }
    if (repeat === 'Repeat One') {
      setRepeat('Repeat');
    }
  }, [customQueue, currentBeats, shuffle, shuffledQueue, currentBeat, repeat, handlePlayWrapper]);

  const {
    handlePlay,
    handlePrev,
    handleNext,
    pause,
  } = useAudioPlayer({
    currentBeat,
    setCurrentBeat,
    isPlaying,
    setIsPlaying,
    onNext: handleNextWrapper,
    onPrev: handlePrevWrapper,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
  });

  // Update the handlePlay ref so handlePlayWrapper always has the latest function
  handlePlayRef.current = handlePlay;
  
  const updateBeatTimeoutRef = useRef(null);
  
  const handleUpdateBeat = (id, newData) => {
    // Update function to apply to both beats and allBeats
    const updateFn = currentBeats =>
      currentBeats.map(beat => beat.id === id ? { ...beat, ...newData } : beat);
    
    // Update both states for UI responsiveness
    setBeats(updateFn);
    setGlobalBeats(updateFn);
    
    // Always update currentBeat if it matches the updated beat for display purposes
    if (currentBeat && currentBeat.id === id) {
      setCurrentBeat(prevBeat => ({ ...prevBeat, ...newData }));
    }
    
    // Clear any existing timeout
    if (updateBeatTimeoutRef.current) {
      clearTimeout(updateBeatTimeoutRef.current);
    }
    
    // Delay the API update to prevent audio restart
    updateBeatTimeoutRef.current = setTimeout(async () => {
      try {
        // Get the latest beat data after state updates
        const beatToUpdate = beats.find(beat => beat.id === id);
        if (beatToUpdate) {
          // Apply the new data
          const updatedBeatData = { ...beatToUpdate, ...newData };
          // Make the API call to the service
          await updateBeatService(id, updatedBeatData);
        }
      } catch (error) {
        console.error('Error updating beat:', error);
      }
    }, 1000); // 1 second delay
  };

  const onUpdate = (id, field, value) => {
    const updateFn = prevBeats =>
      prevBeats.map(beat =>
        beat.id === id ? { ...beat, [field]: value } : beat
      );
    setBeats(updateFn);
    setGlobalBeats(updateFn);
  };

  const addToCustomQueue = (beatOrBeats) => {
    setCustomQueue((prevQueue) => [
      ...prevQueue,
      ...(Array.isArray(beatOrBeats) ? beatOrBeats : [beatOrBeats]),
    ]);
  };

  const handleBeatClick = useCallback((beat) => {
    // Immediately stop current audio if switching to a different beat
    if (currentBeat && currentBeat.id !== beat.id) {
      pause();
    }
    
    setCurrentBeat(beat);
    setIsPlaying(true);
    
    // Broadcast beat change to other tabs
    if (emitBeatChange) {
      emitBeatChange({
        beatId: beat.id,
        timestamp: Date.now(),
        beat: beat
      });
    }
  }, [currentBeat, pause, setCurrentBeat, setIsPlaying, emitBeatChange]);

  const toggleView = (view) => {
    setViewState(view);
    localStorage.setItem('lastView', view);
  };

  const handleSessionUpdate = useCallback((props) => {
    setSessionProps(props);
  }, [sessionProps]);

  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelector('.app').classList.remove('app--hidden');
    }, 400); 
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentBeat && isPlaying) {
      document.title = `${currentBeat.title} - Lyrikal Empire`;
    } else {
      document.title = 'Lyrikal Empire';
    }
  }, [currentBeat, isPlaying]);

  useEffect(() => {
    if (currentBeat && window.electron) {
      window.electron.setActivity(currentBeat.title);
    } else if (window.electron) {
      window.electron.setActivity();
    }
    
    // Update queue when currentBeat changes (but don't reshuffle if shuffle is enabled)
    if (currentBeat && currentBeats.length > 0) {
      logQueue(currentBeats, shuffle, currentBeat, false);
    }
  }, [currentBeat, currentBeats]);

  useEffect(() => {
    if (queue.length === 0 && currentBeat && currentBeats && currentBeats.length > 0) {
      logQueue(currentBeats, shuffle, currentBeat);
    }
  }, [queue.length, currentBeat, currentBeats, shuffle]);

  // Handle shuffle toggle - create new shuffled queue when shuffle is enabled
  useEffect(() => {
    if (shuffle && currentBeats.length > 0) {
      // Create new shuffled queue when shuffle is enabled
      logQueue(currentBeats, shuffle, currentBeat, true);
    } else if (!shuffle && shuffledQueue.length > 0) {
      // Clear shuffled queue and use regular queue when shuffle is disabled
      setShuffledQueue([]);
      if (currentBeat && currentBeats.length > 0) {
        logQueue(currentBeats, shuffle, currentBeat, false);
      }
    }
  }, [shuffle]);

  return (
      <div className={classNames('app', {
        'app--mobile': isMobileOrTablet(),
        'app--hidden': true,
        'app--lyrics-modal-open': lyricsModal
      })}>
        {isDraggingOver && (
          <div className='app__overlay'>
            Drop files to upload
          </div>
        )}
        <Toaster />
        {!isAuthRoute && <Intro />}
        {currentBeat && (
          <LyricsModal 
            beatId={currentBeat.id} 
            title={currentBeat.title} 
            beat={currentBeat}
            lyricsModal={lyricsModal}
            setLyricsModal={setLyricsModal}
          />
        )}
       {!isMobileOrTablet() && (
          <Header 
            isLeftPanelVisible={isLeftPanelVisible} 
            isRightPanelVisible={isRightPanelVisible} 
            toggleSidePanel={toggleSidePanel}
            handleMouseEnterLeft={handleMouseEnterLeft} 
            handleMouseLeaveLeft={handleMouseLeaveLeft} 
            handleMouseEnterRight={handleMouseEnterRight}
            handleMouseLeaveRight={handleMouseLeaveRight}
            isLeftDivVisible={isLeftDivVisible}
            isRightDivVisible={isRightDivVisible}
            isAuthPage={isAuthRoute}
            closeSidePanel={closeSidePanel}
          />
        )}
        <div className="container">
          <div className='container__content'>
            <div className={classNames('container__content__left', {
              'container__content__left--mobile': isMobileOrTablet() && isLeftPanelVisible,
              'container__content__left--pinned': isLeftPanelVisible
            })}>
              {!isAuthRoute && (isLeftPanelVisible || isLeftDivVisible) ? (
                <LeftSidePanel
                  isDivVisible={isLeftPanelVisible || isLeftDivVisible}
                  className={isLeftPanelVisible ? 'left-side-panel--pinned' : (isLeftDivVisible ? 'left-side-panel--hover' : '')}
                  {...(isLeftDivVisible && !isLeftPanelVisible && { handleMouseEnter: handleMouseEnterLeft, handleMouseLeave: handleMouseLeaveLeft })}
                >
                  <Playlists isPlaying={isPlaying} closeSidePanel={closeSidePanel} toggleSidePanel={toggleSidePanel} />
                </LeftSidePanel>
              ) : null}
            </div>
            <div className={classNames('container__content__middle', {
              'container__content__middle--mobile': isMobileOrTablet(),
              'container__content__middle--hide': isMobileOrTablet() && (isRightPanelVisible || isLeftPanelVisible)
            })}>
            <Routes>
              <Route path="/" element={
                <ProtectedRoute element={
                  <>
                    <BeatList 
                      onPlay={handlePlayWrapper} 
                      selectedBeat={selectedBeat} 
                      isPlaying={isPlaying} 
                      currentBeat={currentBeat} 
                      addToCustomQueue={addToCustomQueue}
                      onBeatClick={handleBeatClick} 
                      onUpdateBeat={handleUpdateBeat}
                      onUpdate={onUpdate}
                      isBeatCachedSync={isBeatCachedSync}
                      setIsScrolledBottom={setIsScrolledBottom}
                      setScrollOpacityBottom={setScrollOpacityBottom}
                    />
                    <AddBeatButton setIsOpen={setIsOpen} />
                  </>
                } />
              } />
              <Route path="/playlists/:id" element={
                <ProtectedRoute element={
                  <PlaylistDetail
                    onPlay={handlePlayWrapper} 
                    selectedBeat={selectedBeat} 
                    isPlaying={isPlaying} 
                    currentBeat={currentBeat} 
                    sortedBeats={sortedBeats} 
                    addToCustomQueue={addToCustomQueue}
                    onBeatClick={handleBeatClick}  
                    onUpdate={onUpdate}
                    isBeatCachedSync={isBeatCachedSync}
                  />
                } />
              } />
              <Route path="/dashboard" element={<ProtectedRoute element={<DashboardPage />} />} />
              <Route path="/dashboard/beats" element={<ProtectedRoute element={<BeatsPage />} />} />
              <Route path="/dashboard/playlists" element={<ProtectedRoute element={<PlaylistsPage />} />} />
              <Route path="/dashboard/genres" element={<ProtectedRoute element={<GenresPage />} />} />
              <Route path="/dashboard/moods" element={<ProtectedRoute element={<MoodsPage />} />} />
              <Route path="/dashboard/keywords" element={<ProtectedRoute element={<KeywordsPage />} />} />
              <Route path="/dashboard/features" element={<ProtectedRoute element={<FeaturesPage />} />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<ProtectedRoute element={<SettingsPage />} />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/confirm-email" element={<ConfirmEmailPage />} />
              <Route path="/request-password-reset" element={<RequestPasswordResetPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </div>
            <div className={classNames('container__content__right', {
              'container__content__right--mobile': isMobileOrTablet() && isRightPanelVisible,
              'container__content__right--pinned': isRightPanelVisible
            })}>
              {!isAuthRoute && (isRightPanelVisible || isRightDivVisible) ? (
                <RightSidePanel
                  isDivVisible={isRightPanelVisible || isRightDivVisible}
                  className={isRightPanelVisible ? 'right-side-panel--pinned' : (isRightDivVisible ? 'right-side-panel--hover' : '')}
                  {...(isRightDivVisible && !isRightPanelVisible && { handleMouseEnter: handleMouseEnterRight, handleMouseLeave: handleMouseLeaveRight })}
                >
                <div>
                  <div className='view-toggle-container'>
                    <div className='view-toggle-container__left'>
                                      <h3 onClick={() => toggleView("queue")} className={classNames('view-toggle-container__title', {
                  'view-toggle-container__title--active': viewState === "queue"
                })}>Queue</h3>
                <h3 onClick={() => toggleView("history")} className={classNames('view-toggle-container__title', {
                  'view-toggle-container__title--active': viewState === "history"
                })}>History</h3>
                    </div>
                    <div className='view-toggle-container__right'>
                       <IconButton
                          className='beat-list__action-button--profile'
                          onClick={() => {
                            toggleSidePanel('right');
                            navigate('/profile');
                          }}
                          text={username}
                          tooltipPosition='left'
                          ariaLabel={`Go to ${username}'s Profile`}
                        >
                          <IoPersonSharp />
                        </IconButton>
                        {isPerfAllowed && (
                          <IconButton
                            className='beat-list__action-button--profile'
                            onClick={() => setIsPerformancePanelOpen((v) => !v)}
                            text={'Performance'}
                            tooltipPosition='left'
                            ariaLabel={'Open performance monitoring panel'}
                          >
                            <IoSpeedometer />
                          </IconButton>
                        )}
                    </div>
                  </div>
                  {viewState === "queue" ? (
                    <Queue 
                      queue={queue} 
                      setQueue={setQueue}
                      currentBeat={currentBeat} 
                      onBeatClick={handleBeatClick} 
                      isShuffleEnabled={shuffle}
                      customQueue={customQueue}
                      setCustomQueue={setCustomQueue}
                      addToCustomQueue={addToCustomQueue}
                    />
                  ) : (
                    <History
                      currentBeat={currentBeat} 
                      onBeatClick={handleBeatClick}  
                      addToCustomQueue={addToCustomQueue}
                    />
                  )}
                </div>
                </RightSidePanel>
              ) : null}
            </div>
          </div>
          {isOpen && (
            <AddBeatForm 
              isOpen={isOpen} 
              setIsOpen={setIsOpen} 
              droppedFiles={droppedFiles} 
              clearDroppedFiles={clearDroppedFiles} 
            />
          )}
          {/* Performance Testing Panel - only for user id 39, lazy loaded */}
          {isPerfAllowed && isPerformancePanelOpen && (
            <Suspense fallback={null}>
              <PerformancePanel
                isOpen={isPerformancePanelOpen}
                onClose={() => setIsPerformancePanelOpen(false)}
                networkConfig={networkThrottleConfig}
                onUpdateNetworkConfig={setNetworkThrottleConfig}
                selectedPreset={networkThrottlePreset}
                onChangePreset={setNetworkThrottlePreset}
                isThrottlingEnabled={isThrottlingEnabled}
                onToggleThrottling={setIsThrottlingEnabled}
              />
            </Suspense>
          )}
        </div>
        {!isAuthRoute &&
          <AudioPlayer 
            currentBeat={currentBeat} 
            setCurrentBeat={setCurrentBeat} 
            isPlaying={isPlaying} 
            setIsPlaying={setIsPlaying} 
            onNext={handleNextWrapper} 
            onPrev={handlePrevWrapper} 
            volume={volume} 
            setVolume={setVolume} 
            shuffle={shuffle} 
            setShuffle={setShuffle} 
            repeat={repeat} 
            setRepeat={setRepeat}
            lyricsModal={lyricsModal}
            setLyricsModal={setLyricsModal}
            onUpdateBeat={handleUpdateBeat}
            markBeatAsCached={markBeatAsCached}
            onSessionUpdate={handleSessionUpdate}
            addToCustomQueue={addToCustomQueue}
            isScrolledBottom={isScrolledBottom}
            scrollOpacityBottom={scrollOpacityBottom}
          />
        }
       {!isAuthRoute && isMobileOrTablet() && (
          <Footer 
            isLeftPanelVisible={isLeftPanelVisible} 
            isRightPanelVisible={isRightPanelVisible} 
            toggleSidePanel={toggleSidePanel}
            handleMouseEnterLeft={handleMouseEnterLeft} 
            handleMouseLeaveLeft={handleMouseLeaveLeft} 
            handleMouseEnterRight={handleMouseEnterRight}
            handleMouseLeaveRight={handleMouseLeaveRight}
            isLeftDivVisible={isLeftDivVisible}
            isRightDivVisible={isRightDivVisible}
            isAuthPage={isAuthRoute}
            closeSidePanel={closeSidePanel}
            lyricsModal={lyricsModal}
          />
        )}
        {/* Playing Indicator - only shows on desktop */}
        {!isAuthRoute && (
          <PlayingIndicator
            masterSession={sessionProps.masterSession}
            currentSessionId={sessionProps.currentSessionId}
            isCurrentSessionMaster={sessionProps.isCurrentSessionMaster}
            isPlaying={isPlaying}
            currentBeat={currentBeat}
            sessionName={sessionProps.sessionName}
          />
        )}
      </div>
  );
}

export default App;