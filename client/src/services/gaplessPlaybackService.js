import audioCacheService from './audioCacheService';
import { audioBufferService } from './audioBufferService';

class GaplessPlaybackService {
  constructor() {
    this._audioContext = null; // Lazy initialization
    this.currentSource = null;
    this.nextSource = null;
    this.currentBuffer = null;
    this.nextBuffer = null;
    this.crossfadeDuration = 0.5; // seconds
    this.preloadThreshold = 0.85; // Start preloading when current track is at 85%
    this.isTransitioning = false;
    this.onTrackEnd = null;
  }

  // Lazy getter for AudioContext - only created when needed
  get audioContext() {
    if (!this._audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this._audioContext = new AudioContextClass();
      }
    }
    return this._audioContext;
  }

  async loadAudioBuffer(url) {
    try {
      // TEMPORARILY DISABLED - Skip cache checking for debugging
      // Fetch and decode directly
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
      
      /*
      // Check cache first
      const cachedAudio = await audioCacheService.getFromCache(url);
      if (cachedAudio) {
        const arrayBuffer = await cachedAudio.blob.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
      }

      // Fetch and decode if not cached
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
      */
    } catch (error) {
      console.error('Error loading audio buffer:', error);
      throw error;
    }
  }

  async preloadNext(nextTrackUrl) {
    if (!nextTrackUrl || this.nextBuffer) return;
    
    try {
      this.nextBuffer = await this.loadAudioBuffer(nextTrackUrl);
      // Create and connect next source but keep it silent
      this.nextSource = this.audioContext.createBufferSource();
      this.nextSource.buffer = this.nextBuffer;
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0;
      this.nextSource.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
    } catch (error) {
      // Silently fail - preloading is optional
    }
  }

  async play(url, startTime = 0) {
    try {
      if (!this.currentBuffer) {
        this.currentBuffer = await this.loadAudioBuffer(url);
      }

      if (this.currentSource) {
        this.currentSource.stop();
      }

      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = this.currentBuffer;
      
      const gainNode = this.audioContext.createGain();
      this.currentSource.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Set up track end handling
      this.currentSource.onended = () => {
        if (!this.isTransitioning && this.onTrackEnd) {
          this.onTrackEnd();
        }
      };

      this.currentSource.start(0, startTime);
      return true;
    } catch (error) {
      console.error('Error playing audio:', error);
      return false;
    }
  }

  async transitionToNext() {
    if (!this.nextBuffer || !this.nextSource || this.isTransitioning) return false;
    
    this.isTransitioning = true;
    const now = this.audioContext.currentTime;

    // Fade out current track
    const currentGain = this.audioContext.createGain();
    this.currentSource.disconnect();
    this.currentSource.connect(currentGain);
    currentGain.connect(this.audioContext.destination);
    currentGain.gain.setValueAtTime(1, now);
    currentGain.gain.linearRampToValueAtTime(0, now + this.crossfadeDuration);

    // Fade in next track
    const nextGain = this.audioContext.createGain();
    this.nextSource.disconnect();
    this.nextSource.connect(nextGain);
    nextGain.connect(this.audioContext.destination);
    nextGain.gain.setValueAtTime(0, now);
    nextGain.gain.linearRampToValueAtTime(1, now + this.crossfadeDuration);

    // Clean up after crossfade
    setTimeout(() => {
      this.currentSource.stop();
      this.currentBuffer = this.nextBuffer;
      this.currentSource = this.nextSource;
      this.nextBuffer = null;
      this.nextSource = null;
      this.isTransitioning = false;
    }, this.crossfadeDuration * 1000);

    return true;
  }

  setVolume(volume) {
    if (this.currentSource) {
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume;
      this.currentSource.disconnect();
      this.currentSource.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
    }
  }

  stop() {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    if (this.nextSource) {
      this.nextSource.stop();
      this.nextSource = null;
    }
  }

  cleanup() {
    this.stop();
    this.currentBuffer = null;
    this.nextBuffer = null;
    this.isTransitioning = false;
    
    // Close AudioContext to free resources
    if (this._audioContext) {
      this._audioContext.close().catch(() => {});
      this._audioContext = null;
    }
  }
}

export const gaplessPlaybackService = new GaplessPlaybackService();