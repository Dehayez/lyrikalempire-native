// Professional cache manager with versioning and size limits

const CACHE_VERSION = 'v1'; // Increment when data structure changes
const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB limit

class CacheManager {
  constructor(namespace) {
    this.namespace = namespace;
  }

  _getKey(key) {
    return `${this.namespace}_${CACHE_VERSION}_${key}`;
  }

  _getTimestampKey(key) {
    return `${this._getKey(key)}_timestamp`;
  }

  set(key, data, ttl = null) {
    try {
      const cacheKey = this._getKey(key);
      const timestampKey = this._getTimestampKey(key);
      const dataString = JSON.stringify(data);

      // Check size limit
      if (dataString.length > MAX_CACHE_SIZE) {
        console.warn(`Cache data exceeds ${MAX_CACHE_SIZE / 1024 / 1024}MB limit`);
        return false;
      }

      localStorage.setItem(cacheKey, dataString);
      localStorage.setItem(timestampKey, Date.now().toString());

      if (ttl) {
        localStorage.setItem(`${cacheKey}_ttl`, ttl.toString());
      }

      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        this._clearOldCache();
        // Retry once after clearing
        try {
          localStorage.setItem(this._getKey(key), JSON.stringify(data));
          return true;
        } catch (retryError) {
          console.error('Cache storage failed after cleanup:', retryError);
          return false;
        }
      }
      console.error('Failed to set cache:', error);
      return false;
    }
  }

  get(key) {
    try {
      const cacheKey = this._getKey(key);
      const timestampKey = this._getTimestampKey(key);
      const ttlKey = `${cacheKey}_ttl`;

      const data = localStorage.getItem(cacheKey);
      const timestamp = localStorage.getItem(timestampKey);
      const ttl = localStorage.getItem(ttlKey);

      if (!data || !timestamp) {
        return null;
      }

      // Check TTL if set
      if (ttl) {
        const age = Date.now() - parseInt(timestamp, 10);
        if (age > parseInt(ttl, 10)) {
          this.remove(key);
          return null;
        }
      }

      return {
        data: JSON.parse(data),
        timestamp: parseInt(timestamp, 10),
        age: Date.now() - parseInt(timestamp, 10)
      };
    } catch (error) {
      console.error('Failed to get cache:', error);
      return null;
    }
  }

  remove(key) {
    try {
      const cacheKey = this._getKey(key);
      const timestampKey = this._getTimestampKey(key);
      const ttlKey = `${cacheKey}_ttl`;

      localStorage.removeItem(cacheKey);
      localStorage.removeItem(timestampKey);
      localStorage.removeItem(ttlKey);
    } catch (error) {
      console.error('Failed to remove cache:', error);
    }
  }

  clear() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.namespace)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  _clearOldCache() {
    // Remove old version caches
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.namespace) && !key.includes(CACHE_VERSION)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  getSize(key) {
    const data = localStorage.getItem(this._getKey(key));
    return data ? data.length : 0;
  }

  getSizeInKB(key) {
    return (this.getSize(key) / 1024).toFixed(2);
  }
}

export default CacheManager;

