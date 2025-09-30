# Audio Debug Logging Guide

## Overview
Comprehensive debug logging has been added throughout the audio player system to help diagnose why some tracks won't play. All debug logs use emoji prefixes for easy identification in the console.

## How to Use

1. **Open Browser DevTools** (F12 or Cmd+Option+I on Mac)
2. **Go to Console tab**
3. **Filter by emoji or keywords**:
   - Filter by `[LOAD DEBUG]` to see audio loading issues
   - Filter by `[PLAYBACK DEBUG]` to see playback events
   - Filter by `[CORE DEBUG]` to see low-level audio control
   - Filter by `[PLAYER DEBUG]` to see high-level player actions
   - Filter by `❌` to see only errors
   - Filter by `⚠️` to see warnings

## Debug Log Categories

### 1. Audio Source Loading (`useAudioState.js` & `useAudioPlayerState.js`)
**Prefix**: `[LOAD DEBUG]` / `[AUDIO SRC DEBUG]`

Tracks the entire process of loading an audio file:

- 🎵 **Starting to load audio**: Initial load attempt with beat details
- 💾 **Cache check**: Whether audio is cached
- ✅ **Using cached audio**: Successfully retrieved from cache
- ⚠️ **Cache check passed but failed to get URL**: Cache issue
- 🔗 **Fetching signed URL**: Getting URL from server
- ✅ **Got signed URL**: Successfully received URL
- 🦘 **Safari detected**: Using direct URL (Safari-specific)
- 🌐 **Non-Safari browser**: Downloading and caching
- ✅ **Audio preloaded**: Blob URL created
- ✅ **Audio loading complete**: Process finished
- ❌ **Error loading audio**: Critical failure with details
- 🔄 **Scheduling retry**: Retry attempt scheduled
- ❌ **Max retries reached**: Giving up after max attempts

### 2. Beat Changes (`AudioPlayer.js`)
**Prefix**: `[BEAT CHANGE DEBUG]`

Tracks when the current beat changes:

- 🔄 **Beat changed**: New beat selected with ID and title

### 3. Playback Events (`AudioPlayer.js`)
**Prefix**: `[PLAYBACK DEBUG]`

Tracks all HTML5 audio events:

- ▶️ **Play event fired**: Audio started playing
- ⏸️ **Pause event fired**: Audio paused
- ✅ **canplay event fired**: Audio ready to play with full state info
- 🏁 **Ended event fired**: Track finished
- 🔄 **loadstart event fired**: Audio loading started
- 📊 **loadedmetadata event fired**: Duration and metadata loaded
- 📊 **loadeddata event fired**: First frame loaded
- ⏳ **waiting event fired**: Buffering
- ⚠️ **stalled event fired**: Network stalled
- 🔍 **suspend event fired**: Browser suspended loading
- 🦘 **Safari: Manually triggering play**: Safari-specific autoplay

### 4. Audio Core Control (`useAudioCore.js`)
**Prefix**: `[CORE DEBUG]`

Tracks low-level audio control operations:

- ▶️ **play() called**: Detailed audio element state
  - Ready state (HAVE_NOTHING, HAVE_METADATA, etc.)
  - Network state (NETWORK_EMPTY, NETWORK_IDLE, etc.)
  - Current time, duration, paused state
- ✅ **Play succeeded**: Audio started successfully
- ❌ **Play failed**: Error details
  - `NotAllowedError`: Autoplay blocked by browser
  - `NotSupportedError`: Format not supported or source unavailable
  - `AbortError`: Play interrupted
- ⚠️ **Audio not ready yet**: Ready state too low
- 🔍 **Audio is already playing**: Skipping duplicate call
- ⏸️ **pause() called**: Pause attempt
- ✅ **Pause succeeded**: Successfully paused
- 🔍 **Audio is already paused**: Skipping duplicate call

### 5. High-Level Player Actions (`useAudioPlayer.js`)
**Prefix**: `[PLAYER DEBUG]`

Tracks user-initiated actions:

- 🎵 **handlePlay called**: Play/pause toggle with beat info
- ⚠️ **No beat provided**: Clearing player
- 🦘 **Safari: Using immediate state updates**: Safari optimization
- ▶️ **Same beat, toggling play/pause**: Same track toggle
- 🔄 **Different beat, changing track**: New track selected
- ⏭️ **handleNext**: Moving to next track with index info
- ⏮️ **handlePrev**: Moving to previous track
- ⚠️ **No beats in playlist**: Empty playlist

### 6. Autoplay Logic (`useAudioSync.js`)
**Prefix**: `[AUTOPLAY DEBUG]`

Tracks automatic playback when audio is ready:

- 🎯 **handleCanPlay triggered**: Audio can play, checking conditions
- 🎯 **handleLoadedData triggered**: Audio data loaded, checking conditions
- ⚠️ **Event not for current beat**: Ignoring stale event
- 🎯 **Checking autoplay conditions**: Verifying all conditions
- ✅ **All conditions met, calling audioCore.play()**: Triggering play
- ⚠️ **Autoplay blocked by conditions**: Shows which condition failed:
  - `hasValidSrc`: Must have valid audio source
  - `isPaused`: Audio must be paused (not already playing)
  - `isCurrentSessionMaster`: This tab must be the master session
- ⚠️ **Not autoplaying because**: Shows why autoplay didn't trigger:
  - `hasBeat`: Must have a current beat
  - `isPlaying`: isPlaying state must be true

### 7. State Changes (`AudioPlayer.js`)
**Prefix**: `[STATE DEBUG]`

Tracks critical state changes:

- 🎮 **isPlaying changed**: Shows when play/pause state changes with full context

### 8. Player Sync (`audioPlayerUtils.js`)
**Prefix**: `[SYNC DEBUG]`

Tracks synchronization between multiple player displays:

- 🔍 **No main audio element found**: Missing audio element

### 9. Error Recovery (`AudioPlayer.js`)
**Prefix**: `[ERROR RECOVERY DEBUG]`

Tracks error handling and recovery:

- ⚠️ **Audio error detected**: Error caught
- 🔄 **Error recovery temporarily disabled**: Debugging mode
- ❌ **Audio error (recovery disabled)**: Error details

## Common Scenarios & What to Look For

### Scenario 1: Track Won't Load At All
Look for:
1. ❌ `[LOAD DEBUG] Error loading audio` - Check error details
2. 🔗 `[AUDIO SRC DEBUG] Fetching signed URL` - Did it succeed?
3. ❌ `[AUDIO SRC DEBUG] Network error` - Network issues
4. ❌ `Max retries reached` - Gave up trying

### Scenario 2: Track Loads But Won't Play
Look for:
1. ✅ `[AUDIO SRC DEBUG] Audio preloaded` - Loading succeeded
2. 🎯 `[AUTOPLAY DEBUG] handleCanPlay triggered` - Check all conditions
3. **⚠️ `[AUTOPLAY DEBUG] Event not for current beat, skipping`** - **MOST COMMON ISSUE!**
   - The audio loaded but events are being ignored
   - Check 🔍 `[EVENT CHECK DEBUG]` to see if `matches: false`
   - This happens with files that have spaces or special characters in names
   - **FIXED**: URL decoding issue resolved
4. ⚠️ `[AUTOPLAY DEBUG] Autoplay blocked by conditions` - See which condition failed:
   - If `isPlaying: false` - The play button state is wrong
   - If `isCurrentSessionMaster: false` - Wrong tab is trying to play
   - If `hasValidSrc: false` - Audio source is invalid
5. 🎮 `[STATE DEBUG] isPlaying changed` - Track when isPlaying becomes true/false
6. ❌ `[CORE DEBUG] Play failed` - If play() was called but failed

### Scenario 3: Track Plays Then Stops
Look for:
1. ⏳ `[PLAYBACK DEBUG] waiting event` - Buffering issues
2. ⚠️ `[PLAYBACK DEBUG] stalled event` - Network problems
3. ❌ `[AUDIO DEBUG] Audio error event` - Playback error
4. Check `networkState` - Should be 2 (LOADING) or 1 (IDLE)

### Scenario 4: Safari-Specific Issues
Look for:
1. 🦘 `[LOAD DEBUG] Safari detected` - Safari path taken
2. 🦘 `[PLAYBACK DEBUG] Safari: Manually triggering play` - Autoplay workaround
3. Check if direct signed URL is being used (Safari uses direct URLs, not blobs)

### Scenario 5: Cache Issues
Look for:
1. 💾 `[LOAD DEBUG] Cache check` - Is it cached?
2. ⚠️ `Cache check passed but failed to get cached URL` - Cache corruption
3. 🔄 `[AUDIO SRC DEBUG] Falling back to cached audio` - Fallback triggered

## Audio Element States Reference

### Ready States
- `0` - **HAVE_NOTHING**: No data available
- `1` - **HAVE_METADATA**: Metadata loaded (duration, dimensions)
- `2` - **HAVE_CURRENT_DATA**: Data for current position available
- `3` - **HAVE_FUTURE_DATA**: Data for current + future positions
- `4` - **HAVE_ENOUGH_DATA**: Enough data to play through

### Network States
- `0` - **NETWORK_EMPTY**: Not initialized
- `1` - **NETWORK_IDLE**: Selected resource but not using network
- `2` - **NETWORK_LOADING**: Actively loading
- `3` - **NETWORK_NO_SOURCE**: No suitable source found

### Error Codes
- `1` - **MEDIA_ERR_ABORTED**: User aborted the fetch
- `2` - **MEDIA_ERR_NETWORK**: Network error occurred
- `3` - **MEDIA_ERR_DECODE**: Decoding error
- `4` - **MEDIA_ERR_SRC_NOT_SUPPORTED**: Source format not supported

## Tips for Debugging

1. **Use Console Filters**: Chrome DevTools lets you filter console output
2. **Watch the Timeline**: Logs are in chronological order - see the sequence
3. **Check Ready State**: Audio must be ready state >= 1 to play
4. **Network Tab**: Check if audio file is actually being fetched
5. **CORS Issues**: Look for CORS errors in console
6. **Clear Cache**: Try clearing browser cache if seeing cache issues

## Files Modified

- `/client/src/utils/audioPlayerUtils.js` - Player sync logs
- `/client/src/hooks/audioPlayer/useAudioState.js` - Audio state loading logs
- `/client/src/hooks/audioPlayer/useAudioPlayer.js` - High-level player action logs
- `/client/src/hooks/audioPlayer/useAudioCore.js` - Core audio control logs
- `/client/src/hooks/audioPlayer/useAudioPlayerState.js` - Audio source loading logs
- `/client/src/components/AudioPlayer/AudioPlayer.js` - Playback event logs

## Example Console Output Flow

When a track is successfully loaded and played:

```
🎵 [AUDIO SRC DEBUG] Loading audio source for: { beatId: 123, beatTitle: "Test Track", audioFile: "test.mp3" }
💾 [LOAD DEBUG] Cache check: { isCached: false }
🔗 [AUDIO SRC DEBUG] Fetching signed URL from server...
✅ [AUDIO SRC DEBUG] Got signed URL: https://...
🦘 [AUDIO SRC DEBUG] Safari detected, using signed URL directly
🔄 [BEAT CHANGE DEBUG] Beat changed: { beatId: 123, beatTitle: "Test Track" }
🔄 [PLAYBACK DEBUG] loadstart event fired: { beatId: 123, src: "https://..." }
📊 [PLAYBACK DEBUG] loadedmetadata event fired: { duration: 180, readyState: 1 }
✅ [PLAYBACK DEBUG] canplay event fired: { readyState: 4, paused: true }
🎵 [PLAYER DEBUG] handlePlay called: { beatId: 123, play: true }
▶️ [CORE DEBUG] play() called: { paused: true, readyState: 4 }
✅ [CORE DEBUG] Play succeeded
▶️ [PLAYBACK DEBUG] Play event fired: { beatId: 123 }
```

## Next Steps

If you identify a pattern of failures:

1. **Copy the relevant console logs**
2. **Note the browser and OS**
3. **Check if it's specific to certain file types**
4. **Look for patterns in the error codes**
5. **Use the logs to narrow down which component is failing**

Remember: The logs show the complete flow from clicking a track to actually hearing audio. Any break in this chain will be visible in the console.

## Known Issues (Fixed)

### Bug #1: URL Encoding Mismatch in Event Matching

**Symptoms**: Tracks with spaces in filenames (e.g., "Thrust in Loyalty") load successfully but never play.

**What happens**:
1. Audio loads: ✅
2. `isPlaying` is set to `true`: ✅
3. `handleCanPlay` fires but shows: ⚠️ **Event not for current beat, skipping**
4. Audio never plays

**Root cause**: The `isEventForCurrentBeat()` check was comparing:
- URL-encoded audio src: `Thrust%20in%20Loyalty` (spaces = `%20`)
- Raw filename: `Thrust in Loyalty 112.aac` (actual spaces)

The string comparison failed, so the player thought the event was for the wrong track.

**Fix**: Added `decodeURIComponent()` to decode the URL before comparing in `useAudioSync.js`.

**How to verify**: Look for 🔍 `[EVENT CHECK DEBUG]` logs showing `matches: true` or `false`.

---

### Bug #2: Improperly Encoded Special Characters in URLs

**Symptoms**: Tracks with commas or semicolons in filenames (e.g., "Dancy, dancy") fail to load with error code 4.

**What happens**:
1. Audio loads: ✅
2. Browser receives URL with unencoded comma: `Dancy,%20dancy.aac` 
3. Browser rejects invalid URL
4. Error: ❌ **MEDIA_ERR_SRC_NOT_SUPPORTED - Format error**

**Root cause**: The server returns signed URLs with special characters (`,` `;`) that aren't properly URL-encoded. Commas should be `%2C`, semicolons should be `%3B`.

**Fix**: Added `fixUrlEncoding()` function in `useAudioPlayerState.js` that:
1. Detects unencoded special characters (`,` `;`) in the URL
2. Selectively encodes ONLY those characters (`,` → `%2C`, `;` → `%3B`)
3. Preserves already-encoded characters like spaces (`%20`)

**IMPORTANT**: We use targeted `.replace()` instead of `encodeURIComponent()` to avoid double-encoding already-encoded characters (e.g., `%20` → `%2520`).

**How to verify**: Look for 🔧 `[URL FIX DEBUG]` logs showing the before/after encoding.

**Example**:
```
Original:  Dancy,%20dancy.aac
Fixed:     Dancy%2C%20dancy.aac
NOT:       Dancy%2C%2520dancy.aac  ← This would be double-encoded and break authentication!
```

---

### Summary

Both bugs involved URL encoding issues but in different ways:
- **Bug #1**: URLs were encoded but we needed to decode them for comparison
- **Bug #2**: URLs weren't encoded properly and we needed to encode them for the browser

These fixes handle filenames with:
- Spaces: `My Track.aac`
- Commas: `Dancy, dancy.aac`
- Semicolons: `Track; Version 2.aac`
- Other special characters
