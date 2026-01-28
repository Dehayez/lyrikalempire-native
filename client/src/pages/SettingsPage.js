import React, { useState } from 'react';
import { Button, PageContainer } from '../components';
import { IoRefreshOutline, IoTrashOutline } from "react-icons/io5";

import './SettingsPage.scss';

const defaultSettings = {
  defaultView: 'queue',
  shuffleOnStart: false,
  repeatMode: 'Disabled Repeat',
  showWaveform: false,
  openFullPlayer: false,
  leftPanelPinned: false,
  rightPanelPinned: false,
};

const storageMap = {
  defaultView: 'lastView',
  shuffleOnStart: 'shuffle',
  repeatMode: 'repeat',
  showWaveform: 'waveform',
  openFullPlayer: 'isFullPage',
  leftPanelPinned: 'isLeftPanelVisible',
  rightPanelPinned: 'isRightPanelVisible',
};

const readSetting = (key, fallback) => {
  const stored = localStorage.getItem(key);
  if (stored === null || stored === undefined) return fallback;
  try {
    return JSON.parse(stored);
  } catch (error) {
    return stored;
  }
};

const emitSettingsUpdate = (key, value) => {
  window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { key, value } }));
};

const SettingsPage = () => {
  const [settings, setSettings] = useState(() => ({
    defaultView: readSetting(storageMap.defaultView, defaultSettings.defaultView),
    shuffleOnStart: Boolean(readSetting(storageMap.shuffleOnStart, defaultSettings.shuffleOnStart)),
    repeatMode: readSetting(storageMap.repeatMode, defaultSettings.repeatMode),
    showWaveform: Boolean(readSetting(storageMap.showWaveform, defaultSettings.showWaveform)),
    openFullPlayer: Boolean(readSetting(storageMap.openFullPlayer, defaultSettings.openFullPlayer)),
    leftPanelPinned: Boolean(readSetting(storageMap.leftPanelPinned, defaultSettings.leftPanelPinned)),
    rightPanelPinned: Boolean(readSetting(storageMap.rightPanelPinned, defaultSettings.rightPanelPinned)),
  }));

  const updateSetting = (key, value) => {
    const storageKey = storageMap[key];
    setSettings((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem(storageKey, JSON.stringify(value));
    emitSettingsUpdate(key, value);
  };

  const handleResetDefaults = () => {
    setSettings(defaultSettings);
    Object.entries(storageMap).forEach(([settingKey, storageKey]) => {
      localStorage.setItem(storageKey, JSON.stringify(defaultSettings[settingKey]));
      emitSettingsUpdate(settingKey, defaultSettings[settingKey]);
    });
  };

  const handleClearHistory = () => {
    localStorage.removeItem('playedBeatsHistory');
  };

  return (
    <PageContainer
      title="Settings"
      subtitle="Personalize playback, layout, and saved preferences."
    >
      <div className="settings-page">
        <section className="settings-page__card">
          <div className="settings-page__card-header">
            <div>
              <h2 className="settings-page__card-title">Playback</h2>
              <p className="settings-page__card-subtitle">Tune how audio starts and repeats.</p>
            </div>
          </div>

          <div className="settings-page__rows">
            <div className="settings-page__row">
              <div className="settings-page__row-text">
                <p className="settings-page__label">Shuffle on startup</p>
                <p className="settings-page__description">Start in shuffle mode when the app loads.</p>
              </div>
              <label className="settings-page__toggle">
                <input
                  type="checkbox"
                  checked={settings.shuffleOnStart}
                  onChange={(event) => updateSetting('shuffleOnStart', event.target.checked)}
                  aria-label="Shuffle on startup"
                />
              </label>
            </div>

            <div className="settings-page__row">
              <div className="settings-page__row-text">
                <p className="settings-page__label">Repeat mode</p>
                <p className="settings-page__description">Choose the default repeat behavior.</p>
              </div>
              <div className="settings-page__select">
                <select
                  value={settings.repeatMode}
                  onChange={(event) => updateSetting('repeatMode', event.target.value)}
                >
                  <option value="Disabled Repeat">Disabled</option>
                  <option value="Repeat">Repeat all</option>
                  <option value="Repeat One">Repeat one</option>
                </select>
              </div>
            </div>

            <div className="settings-page__row">
              <div className="settings-page__row-text">
                <p className="settings-page__label">Waveform view</p>
                <p className="settings-page__description">Show the waveform visualizer by default.</p>
              </div>
              <label className="settings-page__toggle">
                <input
                  type="checkbox"
                  checked={settings.showWaveform}
                  onChange={(event) => updateSetting('showWaveform', event.target.checked)}
                  aria-label="Waveform view"
                />
              </label>
            </div>

            <div className="settings-page__row">
              <div className="settings-page__row-text">
                <p className="settings-page__label">Full player by default</p>
                <p className="settings-page__description">Open the full-page player when you start playback.</p>
              </div>
              <label className="settings-page__toggle">
                <input
                  type="checkbox"
                  checked={settings.openFullPlayer}
                  onChange={(event) => updateSetting('openFullPlayer', event.target.checked)}
                  aria-label="Full player by default"
                />
              </label>
            </div>
          </div>
        </section>

        <section className="settings-page__card">
          <div className="settings-page__card-header">
            <div>
              <h2 className="settings-page__card-title">Layout</h2>
              <p className="settings-page__card-subtitle">Choose your default panels and view.</p>
            </div>
          </div>

          <div className="settings-page__rows">
            <div className="settings-page__row">
              <div className="settings-page__row-text">
                <p className="settings-page__label">Right panel view</p>
                <p className="settings-page__description">Pick the first panel tab you see.</p>
              </div>
              <div className="settings-page__select">
                <select
                  value={settings.defaultView}
                  onChange={(event) => updateSetting('defaultView', event.target.value)}
                >
                  <option value="queue">Queue</option>
                  <option value="history">History</option>
                </select>
              </div>
            </div>

            <div className="settings-page__row settings-page__row--stacked">
              <div className="settings-page__row-text">
                <p className="settings-page__label">Pinned side panels</p>
                <p className="settings-page__description">Keep panels visible on load.</p>
              </div>
              <div className="settings-page__toggle-group">
                <label className="settings-page__toggle">
                  <input
                    type="checkbox"
                    checked={settings.leftPanelPinned}
                    onChange={(event) => updateSetting('leftPanelPinned', event.target.checked)}
                    aria-label="Left panel pinned"
                  />
                  <span className="settings-page__toggle-text">Left panel</span>
                </label>
                <label className="settings-page__toggle">
                  <input
                    type="checkbox"
                    checked={settings.rightPanelPinned}
                    onChange={(event) => updateSetting('rightPanelPinned', event.target.checked)}
                    aria-label="Right panel pinned"
                  />
                  <span className="settings-page__toggle-text">Right panel</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-page__card settings-page__card--compact">
          <div className="settings-page__card-header">
            <div>
              <h2 className="settings-page__card-title">Data</h2>
              <p className="settings-page__card-subtitle">Clear saved state when you need a fresh start.</p>
            </div>
          </div>

          <div className="settings-page__actions">
            <Button variant="outline" onClick={handleResetDefaults}>
              Reset defaults <IoRefreshOutline />
            </Button>
            <Button variant="warning" onClick={handleClearHistory}>
              Clear play history <IoTrashOutline />
            </Button>
          </div>
          <p className="settings-page__note">Startup settings apply after a refresh.</p>
        </section>
      </div>
    </PageContainer>
  );
};

export default SettingsPage;
