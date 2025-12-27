/**
 * Lightweight mobile audio preloader using standard HTML5 Audio
 * Avoids Web Audio API which has issues on iOS
 */
class MobileAudioPreloader {
  constructor() {
    this.preloadAudio = null;
    this.preloadedUrl = null;
    this.isPreloading = false;
  }

  /**
   * Preload the next track using a hidden audio element
   * @param {string} url - The audio URL to preload
   */
  preload(url) {
    if (!url || this.preloadedUrl === url || this.isPreloading) {
      return;
    }

    this.isPreloading = true;
    this.cleanup();

    try {
      this.preloadAudio = new Audio();
      this.preloadAudio.preload = 'auto';
      this.preloadAudio.muted = true;
      this.preloadAudio.setAttribute('playsinline', 'true');
      this.preloadAudio.setAttribute('webkit-playsinline', 'true');
      
      // Set CORS for cross-origin audio (Backblaze B2)
      this.preloadAudio.crossOrigin = 'anonymous';

      this.preloadAudio.oncanplaythrough = () => {
        this.preloadedUrl = url;
        this.isPreloading = false;
      };

      this.preloadAudio.onerror = () => {
        this.isPreloading = false;
        this.preloadedUrl = null;
      };

      this.preloadAudio.src = url;
      this.preloadAudio.load();
    } catch (error) {
      this.isPreloading = false;
      this.preloadedUrl = null;
    }
  }

  /**
   * Check if a URL is already preloaded
   * @param {string} url - The URL to check
   * @returns {boolean}
   */
  isPreloaded(url) {
    return this.preloadedUrl === url;
  }

  /**
   * Get the preloaded audio element if the URL matches
   * @param {string} url - The URL to get
   * @returns {HTMLAudioElement|null}
   */
  getPreloadedAudio(url) {
    if (this.preloadedUrl === url && this.preloadAudio) {
      return this.preloadAudio;
    }
    return null;
  }

  /**
   * Cleanup the preloaded audio
   */
  cleanup() {
    if (this.preloadAudio) {
      this.preloadAudio.src = '';
      this.preloadAudio.load();
      this.preloadAudio = null;
    }
    this.preloadedUrl = null;
    this.isPreloading = false;
  }
}

export const mobileAudioPreloader = new MobileAudioPreloader();

