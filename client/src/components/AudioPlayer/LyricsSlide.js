import React, { useState, useEffect, useCallback } from 'react';
import { getAssociationsByBeatId } from '../../services/beatService';
import { getLyricsById } from '../../services/lyricsService';
import { FormTextarea } from '../Inputs';
import './LyricsSlide.scss';

const LyricsSlide = ({ currentBeat, onUpdateBeat }) => {
  const [lyrics, setLyrics] = useState('');
  const [lyricsId, setLyricsId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLyrics = useCallback(async () => {
    if (!currentBeat?.id) return;

    setIsLoading(true);
    try {
      // Use lyrics from beat prop if available, otherwise fallback to API
      if (currentBeat.lyrics && currentBeat.lyrics.length > 0) {
        const lyricsAssoc = currentBeat.lyrics[0];
        if (lyricsAssoc?.lyrics_id) {
          const [lyricData] = await getLyricsById(lyricsAssoc.lyrics_id);
          setLyrics(lyricData?.lyrics || '');
          setLyricsId(lyricsAssoc.lyrics_id);
        } else {
          setLyrics('');
          setLyricsId(null);
        }
      } else {
        // Fallback to API call if beat prop doesn't have lyrics
        const [assoc] = await getAssociationsByBeatId(currentBeat.id, 'lyrics');
        if (assoc?.lyrics_id) {
          const [lyricData] = await getLyricsById(assoc.lyrics_id);
          setLyrics(lyricData?.lyrics || '');
          setLyricsId(assoc.lyrics_id);
        } else {
          setLyrics('');
          setLyricsId(null);
        }
      }
    } catch (error) {
      console.warn('Could not fetch lyrics:', error);
      setLyrics('');
      setLyricsId(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentBeat?.id, currentBeat?.lyrics]);

  useEffect(() => {
    fetchLyrics();
  }, [fetchLyrics]);

  const handleLyricsChange = async (e) => {
    const newLyrics = e.target.value;
    setLyrics(newLyrics);

    // Update lyrics in the beat object
    if (onUpdateBeat && currentBeat) {
      onUpdateBeat(currentBeat.id, { lyrics: newLyrics });
    }
  };

  return (
    <div className="audio-player__full-page-lyrics-content">
      {isLoading ? (
        <div className="audio-player__full-page-lyrics-loading">Loading lyrics...</div>
      ) : (
        <FormTextarea 
          id="lyrics-slide__textarea" 
          value={lyrics} 
          onChange={handleLyricsChange}
          placeholder="Enter lyrics here..."
        />
      )}
    </div>
  );
};

export default LyricsSlide; 