// Store original methods ONCE at module load (before any interception)
const ORIGINAL_FETCH = window.fetch;
const ORIGINAL_XHR_OPEN = XMLHttpRequest.prototype.open;
const ORIGINAL_XHR_SEND = XMLHttpRequest.prototype.send;

class NetworkThrottleService {
  constructor() {
    this.isEnabled = false;
    this.latency = 0;
    this.downloadSpeed = Infinity;
    this.uploadSpeed = Infinity;
    this.originalFetch = ORIGINAL_FETCH;
    this.originalXHROpen = ORIGINAL_XHR_OPEN;
    this.originalXHRSend = ORIGINAL_XHR_SEND;
    this.isIntercepted = false;
  }

  // Enable network throttling
  enable(config = {}) {
    const {
      latency = 100, // ms
      downloadSpeed = 1024 * 1024, // 1MB/s
      uploadSpeed = 512 * 1024, // 512KB/s
      packetLoss = 0 // 0-1 percentage
    } = config;

    this.isEnabled = true;
    this.latency = latency;
    this.downloadSpeed = downloadSpeed;
    this.uploadSpeed = uploadSpeed;
    this.packetLoss = packetLoss;

    // Only intercept if not already intercepted
    if (!this.isIntercepted) {
      this.interceptFetch();
      this.interceptXHR();
      this.isIntercepted = true;
    }

    console.log(`[Network Throttle] Enabled - Latency: ${latency}ms, Download: ${this.formatSpeed(downloadSpeed)}, Upload: ${this.formatSpeed(uploadSpeed)}`);
  }

  // Disable network throttling
  disable() {
    this.isEnabled = false;
    
    // Restore original methods using module-level originals
    if (this.isIntercepted) {
      window.fetch = ORIGINAL_FETCH;
      XMLHttpRequest.prototype.open = ORIGINAL_XHR_OPEN;
      XMLHttpRequest.prototype.send = ORIGINAL_XHR_SEND;
      this.isIntercepted = false;
    }
  }

  // Intercept fetch requests
  interceptFetch() {
    const service = this;
    
    window.fetch = async function(...args) {
      if (!service.isEnabled) {
        return ORIGINAL_FETCH.apply(window, args);
      }

      // Pre-send: latency + upload throttling
      try {
        const [, init] = args;
        let uploadBytes = 0;
        const body = init?.body;
        if (body) {
          if (body instanceof Blob) uploadBytes = body.size;
          else if (typeof body === 'string') uploadBytes = body.length;
          else if (body instanceof ArrayBuffer) uploadBytes = body.byteLength;
          else if (ArrayBuffer.isView?.(body)) uploadBytes = body.byteLength;
        }
        const uploadDelayMs = (uploadBytes / service.uploadSpeed) * 1000;
        const preSendDelay = Math.max(0, service.latency + (isFinite(uploadDelayMs) ? uploadDelayMs : 0));
        if (preSendDelay > 0) await service.delay(preSendDelay);
      } catch (_) {
        // Fallback: latency only if upload size unknown
        await service.delay(service.latency);
      }

      // Simulate packet loss before sending
      if (Math.random() < service.packetLoss) {
        throw new Error('Network Error: Packet Loss Simulated');
      }

      try {
        const response = await ORIGINAL_FETCH.apply(window, args);

        // Simulate download speed throttling for streaming bodies
        if (response.body && isFinite(service.downloadSpeed)) {
          const reader = response.body.getReader();
          const chunks = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            const chunkSize = value.length;
            const delayTime = (chunkSize / service.downloadSpeed) * 1000;
            if (delayTime > 0) await service.delay(delayTime);
          }
          const blob = new Blob(chunks);
          return new Response(blob, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }

        // Non-streaming: approximate using Content-Length
        const contentLengthHeader = response.headers?.get?.('content-length');
        const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
        if (contentLength > 0 && isFinite(service.downloadSpeed)) {
          const downloadDelayMs = (contentLength / service.downloadSpeed) * 1000;
          if (downloadDelayMs > 0) await service.delay(downloadDelayMs);
        }
        return response;
      } catch (error) {
        console.error('[Network Throttle] Fetch error:', error);
        throw error;
      }
    };
  }

  // Intercept XMLHttpRequest
  interceptXHR() {
    const service = this;

    XMLHttpRequest.prototype.open = function(...args) {
      this._throttleConfig = {
        startTime: performance.now(),
        url: args[1]
      };
      return ORIGINAL_XHR_OPEN.apply(this, args);
    };

    XMLHttpRequest.prototype.send = function(data) {
      if (!service.isEnabled) {
        return ORIGINAL_XHR_SEND.call(this, data);
      }

      const xhr = this;

      // Packet loss: abort instead of mutating read-only props
      if (Math.random() < service.packetLoss) {
        setTimeout(() => {
          try { xhr.abort(); } catch (_) {}
        }, service.latency);
        return;
      }

      // Compute upload size for delay
      let uploadBytes = 0;
      try {
        if (data) {
          if (data instanceof Blob) uploadBytes = data.size;
          else if (typeof data === 'string') uploadBytes = data.length;
          else if (data instanceof ArrayBuffer) uploadBytes = data.byteLength;
          else if (ArrayBuffer.isView?.(data)) uploadBytes = data.byteLength;
        }
      } catch (_) {}

      const uploadDelayMs = (uploadBytes / service.uploadSpeed) * 1000;
      const preSendDelay = Math.max(0, service.latency + (isFinite(uploadDelayMs) ? uploadDelayMs : 0));

      setTimeout(() => {
        ORIGINAL_XHR_SEND.call(xhr, data);
      }, preSendDelay);
    };
  }

  // Utility method to add delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Format speed for display
  formatSpeed(bytesPerSecond) {
    if (bytesPerSecond >= 1024 * 1024) {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)}MB/s`;
    } else if (bytesPerSecond >= 1024) {
      return `${(bytesPerSecond / 1024).toFixed(1)}KB/s`;
    } else {
      return `${bytesPerSecond.toFixed(0)}B/s`;
    }
  }

  // Get current status
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      latency: this.latency,
      downloadSpeed: this.downloadSpeed,
      uploadSpeed: this.uploadSpeed,
      packetLoss: this.packetLoss
    };
  }

  // Preset configurations
  static getPresets() {
    return {
      'Fast 3G': {
        latency: 100,
        downloadSpeed: 1.5 * 1024 * 1024, // 1.5MB/s
        uploadSpeed: 750 * 1024, // 750KB/s
        packetLoss: 0.01
      },
      'Slow 3G': {
        latency: 300,
        downloadSpeed: 780 * 1024, // 780KB/s
        uploadSpeed: 330 * 1024, // 330KB/s
        packetLoss: 0.02
      },
      '2G': {
        latency: 500,
        downloadSpeed: 250 * 1024, // 250KB/s
        uploadSpeed: 50 * 1024, // 50KB/s
        packetLoss: 0.05
      },
      'Dial-up': {
        latency: 1000,
        downloadSpeed: 56 * 1024, // 56KB/s
        uploadSpeed: 33 * 1024, // 33KB/s
        packetLoss: 0.1
      }
    };
  }

  // Instance helper to access presets from the singleton
  getPresets() {
    return NetworkThrottleService.getPresets();
  }
}

// Create singleton instance
const networkThrottleService = new NetworkThrottleService();

export default networkThrottleService; 