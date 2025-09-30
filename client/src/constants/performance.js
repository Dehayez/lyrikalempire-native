// Performance-related constants for virtual scrolling and caching

export const VIRTUAL_SCROLL = {
  INITIAL_VISIBLE_COUNT: 30,
  BUFFER_SIZE: 15, // Rows to render above/below viewport
  ROW_HEIGHT: 60, // Default row height in pixels
  SCROLL_THROTTLE_MS: 16, // ~60fps
  UPDATE_THRESHOLD: 5, // Minimum rows change before update
};

export const CACHE = {
  BEATS_KEY: 'cached_beats',
  TIMESTAMP_KEY: 'beats_cache_timestamp',
  VERSION: 'v1',
  TTL: 1000 * 60 * 60 * 24, // 24 hours
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
};

export const PERFORMANCE_THRESHOLDS = {
  SLOW_RENDER_MS: 100,
  SLOW_API_MS: 2000,
  HIGH_MEMORY_MB: 500,
};

export const RENDER_BATCH = {
  SIZE: 50, // Beats per batch
  DELAY_MS: 100, // Delay between batches
};

