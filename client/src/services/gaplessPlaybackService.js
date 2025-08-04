import audioCacheService from './audioCacheService';
import { audioBufferService } from './audioBufferService';

class GaplessPlaybackService {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.currentSource = null;
    this.nextSource = null;
    this.currentBuffer = null;
    this.nextBuffer = null;
    this.crossfadeDuration = 0.5; // seconds
    this.preloadThreshold = 0.85; // Start preloading when current track is at 85%
    this.isTransitioning = false;
    this.onTrackEnd = null;
  }

  async loadAudioBuffer(url) {
    try {
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
    } catch (error) {
      console.error('Error loading audio buffer:', error);
      throw error;
    }
  }

  async preloadNext(nextTrackUrl) {
    if (!nextTrackUrl || this.nextBuffer) return;

    console.log('🎵 [GAPLESS] Starting preload for next track:', nextTrackUrl);
    
    try {
      this.nextBuffer = await this.loadAudioBuffer(nextTrackUrl);
      // Create and connect next source but keep it silent
      this.nextSource = this.audioContext.createBufferSource();
      this.nextSource.buffer = this.nextBuffer;
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0;
      this.nextSource.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      console.log('✅ [GAPLESS] Successfully preloaded next track');
    } catch (error) {
      console.error('❌ [GAPLESS] Error preloading next track:', error);
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
        console.log('🎵 [GAPLESS] Track ended in gapless service');
        if (!this.isTransitioning && this.onTrackEnd) {
          console.log('🎵 [GAPLESS] Calling onTrackEnd');
          this.onTrackEnd();
        } else {
          console.log('🎵 [GAPLESS] Skipping onTrackEnd - transitioning or no handler');
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

    console.log('🔄 [GAPLESS] Starting gapless transition to next track');
    
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

    console.log(`🔄 [GAPLESS] Crossfading for ${this.crossfadeDuration}s`);

    // Clean up after crossfade
    setTimeout(() => {
      this.currentSource.stop();
      this.currentBuffer = this.nextBuffer;
      this.currentSource = this.nextSource;
      this.nextBuffer = null;
      this.nextSource = null;
      this.isTransitioning = false;
      console.log('✅ [GAPLESS] Gapless transition completed');
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
  }
}

export const gaplessPlaybackService = new GaplessPlaybackService();