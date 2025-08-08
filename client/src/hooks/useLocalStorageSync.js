import { useEffect } from 'react';

const useLocalStorageEffect = (key, value) => {
  useEffect(() => {
    if (value !== undefined) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);
};

export const useLocalStorageSync = ({
  shuffle, repeat, currentBeat, selectedBeat, isLeftPanelVisible,
  isRightPanelVisible, viewState, customQueue, sortConfig,
  mode, searchText, urlKey, currentPage,
  volume, currentTime, selectedItems, isDropdownOpen, lyricsModal, dimensions,
  waveform, isFullPage, position, activeSlideIndex,
  // Performance/testing settings
  isPerformancePanelOpen, isThrottlingEnabled, networkThrottleConfig, networkThrottlePreset
}) => {
  useLocalStorageEffect('shuffle', shuffle);
  useLocalStorageEffect('repeat', repeat);
  useLocalStorageEffect('currentBeat', currentBeat);
  useLocalStorageEffect('selectedBeat', selectedBeat);
  useLocalStorageEffect('isLeftPanelVisible', isLeftPanelVisible);
  useLocalStorageEffect('isRightPanelVisible', isRightPanelVisible);
  useLocalStorageEffect('lastView', viewState);
  useLocalStorageEffect('customQueue', customQueue);
  useLocalStorageEffect('sortConfig', sortConfig);
  useLocalStorageEffect('mode', mode);
  useLocalStorageEffect('searchText', searchText);
  useLocalStorageEffect(urlKey, currentPage);
  useLocalStorageEffect('volume', volume);
  useLocalStorageEffect('currentTime', currentTime);
  useLocalStorageEffect('selectedItems', selectedItems);
  useLocalStorageEffect('isDropdownOpen', isDropdownOpen);
  useLocalStorageEffect('lyricsModal', lyricsModal);
  useLocalStorageEffect('dimensions', dimensions);
  useLocalStorageEffect('waveform', waveform);
  useLocalStorageEffect('isFullPage', isFullPage);
  useLocalStorageEffect('modalPosition', position);
  useLocalStorageEffect('activeSlideIndex', activeSlideIndex);
  // Performance/testing settings
  useLocalStorageEffect('isPerformancePanelOpen', isPerformancePanelOpen);
  useLocalStorageEffect('isThrottlingEnabled', isThrottlingEnabled);
  useLocalStorageEffect('networkThrottleConfig', networkThrottleConfig);
  useLocalStorageEffect('networkThrottlePreset', networkThrottlePreset);
};