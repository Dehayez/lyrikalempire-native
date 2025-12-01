const B2 = require('backblaze-b2');

class B2AuthorizationCache {
  constructor() {
    this.b2 = new B2({
      applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
      applicationKey: process.env.B2_APPLICATION_KEY,
    });
    this.authorizationData = null;
    this.expiresAt = null;
    this.authorizing = false;
    this.authorizePromise = null;
  }

  async authorize() {
    const now = Date.now();
    
    if (this.authorizationData && this.expiresAt && now < this.expiresAt) {
      return this.authorizationData;
    }

    if (this.authorizing && this.authorizePromise) {
      return this.authorizePromise;
    }

    this.authorizing = true;
    this.authorizePromise = this.b2.authorize()
      .then((data) => {
        this.authorizationData = data;
        this.expiresAt = now + (23 * 60 * 60 * 1000);
        this.authorizing = false;
        this.authorizePromise = null;
        return data;
      })
      .catch((error) => {
        this.authorizing = false;
        this.authorizePromise = null;
        throw error;
      });

    return this.authorizePromise;
  }

  getB2Instance() {
    return this.b2;
  }

  clearCache() {
    this.authorizationData = null;
    this.expiresAt = null;
  }
}

const b2Cache = new B2AuthorizationCache();

module.exports = b2Cache;

