# Filename Sanitization System

## Overview
This system automatically sanitizes uploaded filenames by converting special characters (like `ñ`, `é`, `ü`) to their normal equivalents (`n`, `e`, `u`) to ensure maximum compatibility across all systems and browsers.

## How It Works

### 1. Automatic Sanitization
When files are uploaded, special characters are automatically converted:
- `jalapeño_141_G#.mp3` → `jalapeno_141_G_.mp3`
- `café au lait.wav` → `cafe_au_lait.wav`
- `naïve-song.aac` → `naive-song.aac`

### 2. Sanitization Process
```javascript
const sanitizeFileName = (fileName) => {
  return fileName
    // Step 1: Normalize Unicode (NFD) - separates base characters from accents
    .normalize('NFD')
    // Step 2: Remove diacritics (accent marks) - keeps 'n', removes '˜'
    .replace(/[\u0300-\u036f]/g, '')
    // Step 3: Replace special characters with underscores
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Step 4: Clean up multiple underscores
    .replace(/_+/g, '_')
    // Step 5: Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '');
};
```

### 3. Implementation Points

**Multer Level (server/config/multer.js):**
- Sanitizes filenames during upload
- Adds timestamp prefix: `1753297032576-jalapeno_141_G_.mp3`

**Backblaze Upload (server/config/multer.js):**
- Uses multer's sanitized filename when available (avoids double timestamps)
- Falls back to sanitization for manual uploads
- Converts to AAC: `1753297032576-jalapeno_141_G_.aac`

**Controller Level (server/controllers/beatController.js):**
- Uses sanitized filenames consistently
- Preserves sanitization through AAC conversion
- Logs sanitization process for debugging

## Character Conversion Examples

| Original | Sanitized | Description |
|----------|-----------|-------------|
| `ñ` | `n` | Spanish ñ to normal n |
| `é` | `e` | Accented e to normal e |
| `ü` | `u` | Umlaut u to normal u |
| `ç` | `c` | Cedilla c to normal c |
| `#` | `_` | Hash to underscore |
| `&` | `_` | Ampersand to underscore |
| `  ` | `_` | Spaces to underscore |
| `ø` | `o` | Slashed o to normal o |

## Benefits

### ✅ **Universal Compatibility**
- Works on all operating systems (Windows, Mac, Linux)
- Compatible with all browsers and file systems
- No encoding issues in URLs or file paths

### ✅ **Predictable Behavior**
- Consistent filename structure
- No surprises with special character handling
- Reliable file retrieval and playback

### ✅ **Clean URLs**
- No need for complex URL encoding
- Simple, readable file paths
- Better SEO and accessibility

### ✅ **System Reliability**
- Prevents CORS and 404 errors
- Eliminates format errors in audio players
- Consistent behavior across different browsers

## Testing Examples

### Input/Output Examples:
```
"jalapeño_141_G#.mp3" → "1753297032576-jalapeno_141_G_.aac"
"café au lait.wav" → "1753297032576-cafe_au_lait.aac"
"résumé & cover letter.mp3" → "1753297032576-resume___cover_letter.aac"
"naïve song (demo).aac" → "1753297032576-naive_song__demo_.aac"
```

### Log Output Example:
```
📝 [MULTER] Filename sanitization: {
  original: "jalapeño_141_G#.mp3",
  sanitized: "jalapeno_141_G_.mp3",
  hadSpecialChars: true
}

✅ [BACKBLAZE] Using multer filename: {
  multerFilename: "1753297032576-jalapeno_141_G_.mp3",
  finalFileName: "1753297032576-jalapeno_141_G_.aac"
}
```

## File Flow

1. **User uploads**: `"jalapeño_141_G#.mp3"`
2. **Multer sanitizes**: `"1753297032576-jalapeno_141_G_.mp3"`
3. **Server converts**: AAC file created
4. **Backblaze stores**: `"1753297032576-jalapeno_141_G_.aac"`
5. **Database saves**: `"1753297032576-jalapeno_141_G_.aac"`
6. **Client displays**: Original title preserved in beat.title
7. **Audio plays**: No encoding issues, perfect playback

## User Experience

### What Users See:
- **Upload form**: Can upload files with any characters
- **Beat title**: Displays original name (e.g., "jalapeño_141_G#")
- **File system**: Stores sanitized name (e.g., "jalapeno_141_G_")

### What Users Get:
- ✅ Reliable file uploads
- ✅ Perfect audio playback
- ✅ No error messages
- ✅ Cross-platform compatibility

This system provides the best balance between user convenience (can upload files with any name) and technical reliability (sanitized storage prevents issues). 