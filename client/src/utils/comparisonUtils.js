// Fast comparison utilities for React.memo and performance optimization

/**
 * Fast shallow comparison for arrays
 * More efficient than JSON.stringify for simple arrays
 */
export const shallowCompareArrays = (arr1, arr2) => {
  if (arr1 === arr2) return true;
  if (!arr1 || !arr2) return false;
  if (arr1.length !== arr2.length) return false;
  
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  
  return true;
};

/**
 * Compare arrays of objects by ID only (fast for large arrays)
 * Better than JSON.stringify for beat associations
 */
export const compareArraysByIds = (arr1, arr2, idKey = 'id') => {
  if (arr1 === arr2) return true;
  if (!arr1 || !arr2) return false;
  if (arr1.length !== arr2.length) return false;
  
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i]?.[idKey] !== arr2[i]?.[idKey]) return false;
  }
  
  return true;
};

/**
 * Fast hash function for objects (better than JSON.stringify)
 * Use for quick equality checks
 */
export const fastHash = (obj) => {
  if (!obj) return '';
  
  if (Array.isArray(obj)) {
    return obj.map(item => item?.id || item).join(',');
  }
  
  if (typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .map(key => `${key}:${obj[key]}`)
      .join('|');
  }
  
  return String(obj);
};

/**
 * Deep comparison with early exit (more efficient)
 */
export const deepCompare = (obj1, obj2, maxDepth = 3, currentDepth = 0) => {
  if (obj1 === obj2) return true;
  if (currentDepth >= maxDepth) return JSON.stringify(obj1) === JSON.stringify(obj2);
  
  if (typeof obj1 !== typeof obj2) return false;
  if (obj1 === null || obj2 === null) return false;
  
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((item, index) => 
      deepCompare(item, obj2[index], maxDepth, currentDepth + 1)
    );
  }
  
  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => 
      deepCompare(obj1[key], obj2[key], maxDepth, currentDepth + 1)
    );
  }
  
  return obj1 === obj2;
};

/**
 * Optimized comparison for beat associations
 * Specifically designed for genres, moods, keywords, features arrays
 */
export const compareBeatAssociations = (prevAssoc, nextAssoc) => {
  if (prevAssoc === nextAssoc) return true;
  if (!prevAssoc || !nextAssoc) return false;
  if (prevAssoc.length !== nextAssoc.length) return false;
  
  // Compare by ID only (faster than full object comparison)
  const prevIds = prevAssoc.map(a => a.genre_id || a.mood_id || a.keyword_id || a.feature_id).sort().join(',');
  const nextIds = nextAssoc.map(a => a.genre_id || a.mood_id || a.keyword_id || a.feature_id).sort().join(',');
  
  return prevIds === nextIds;
};

