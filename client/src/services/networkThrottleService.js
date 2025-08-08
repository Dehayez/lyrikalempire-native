class NetworkThrottleService {
  constructor() {
    this.isEnabled = false;
    this.latency = 0;
    this.downloadSpeed = Infinity;
    this.uploadSpeed = Infinity;
    this.originalFetch = window.fetch;
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
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

    this.interceptFetch();
    this.interceptXHR();

    console.log(`[Network Throttle] Enabled - Latency: ${latency}ms, Download: ${this.formatSpeed(downloadSpeed)}, Upload: ${this.formatSpeed(uploadSpeed)}`);
  }

  // Disable network throttling
  disable() {
    this.isEnabled = false;
    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXHROpen;
    XMLHttpRequest.prototype.send = this.originalXHRSend;
    console.log('[Network Throttle] Disabled');
  }

  // Intercept fetch requests
  interceptFetch() {
    window.fetch = async (...args) => {
      if (!this.isEnabled) {
        return this.originalFetch.apply(this, args);
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
        const uploadDelayMs = (uploadBytes / this.uploadSpeed) * 1000;
        const preSendDelay = Math.max(0, this.latency + (isFinite(uploadDelayMs) ? uploadDelayMs : 0));
        if (preSendDelay > 0) await this.delay(preSendDelay);
      } catch (_) {
        // Fallback: latency only if upload size unknown
        await this.delay(this.latency);
      }

      // Simulate packet loss before sending
      if (Math.random() < this.packetLoss) {
        throw new Error('Network Error: Packet Loss Simulated');
      }

      try {
        const response = await this.originalFetch.apply(this, args);

        // Simulate download speed throttling for streaming bodies
        if (response.body && isFinite(this.downloadSpeed)) {
          const reader = response.body.getReader();
          const chunks = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            const chunkSize = value.length;
            const delayTime = (chunkSize / this.downloadSpeed) * 1000;
            if (delayTime > 0) await this.delay(delayTime);
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
        if (contentLength > 0 && isFinite(this.downloadSpeed)) {
          const downloadDelayMs = (contentLength / this.downloadSpeed) * 1000;
          if (downloadDelayMs > 0) await this.delay(downloadDelayMs);
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
    const originalOpen = this.originalXHROpen;
    const originalSend = this.originalXHRSend;

    XMLHttpRequest.prototype.open = function(...args) {
      this._throttleConfig = {
        startTime: performance.now(),
        url: args[1]
      };
      return originalOpen.apply(this, args);
    };

    XMLHttpRequest.prototype.send = function(data) {
      if (!service.isEnabled) {
        return originalSend.call(this, data);
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
        originalSend.call(xhr, data);
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