import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import TrackPlayer, {
  Event,
  State,
  useProgress,
  useTrackPlayerEvents,
  RepeatMode,
  Capability,
} from 'react-native-track-player';
import { Beat, getSignedUrl } from '../services/beatService';
import { useUser } from './UserContext';

interface AudioContextType {
  currentBeat: Beat | null;
  isPlaying: boolean;
  queue: Beat[];
  shuffledQueue: Beat[];
  isShuffle: boolean;
  repeatMode: 'off' | 'track' | 'queue';
  volume: number;
  progress: number;
  duration: number;
  isReady: boolean;
  play: (beat: Beat) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (beats: Beat | Beat[]) => void;
  clearQueue: () => void;
  playQueue: (beats: Beat[], startIndex?: number) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [currentBeat, setCurrentBeat] = useState<Beat | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [queue, setQueue] = useState<Beat[]>([]);
  const [shuffledQueue, setShuffledQueue] = useState<Beat[]>([]);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'track' | 'queue'>('off');
  const [volume, setVolumeState] = useState(1);
  const { user } = useUser();
  const setupDone = useRef(false);

  const { position, duration } = useProgress(200);

  // Initialize TrackPlayer once
  useEffect(() => {
    if (setupDone.current) return;
    
    const setupPlayer = async () => {
      try {
        await TrackPlayer.setupPlayer({
          waitForBuffer: true,
        });
        await TrackPlayer.updateOptions({
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.Stop,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
          ],
        });
        setupDone.current = true;
        setIsReady(true);
      } catch (error: any) {
        // Player might already be initialized
        if (error?.code === 'player_already_initialized') {
          setupDone.current = true;
          setIsReady(true);
        } else {
          console.log('TrackPlayer setup error:', error);
        }
      }
    };

    setupPlayer();

    return () => {
      // Don't reset on unmount - causes issues
    };
  }, []);

  // Track playback state changes
  useTrackPlayerEvents([Event.PlaybackState], async event => {
    if (event.state === State.Playing) {
      setIsPlaying(true);
    } else if (event.state === State.Paused || event.state === State.Stopped || event.state === State.None) {
      setIsPlaying(false);
    }
  });

  // Track changes
  useTrackPlayerEvents([Event.PlaybackTrackChanged], async event => {
    if (event.nextTrack !== null && event.nextTrack !== undefined) {
      const activeQueue = isShuffle ? shuffledQueue : queue;
      const nextBeat = activeQueue[event.nextTrack];
      if (nextBeat) {
        setCurrentBeat(nextBeat);
      }
    }
  });

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const beatToTrack = async (beat: Beat) => {
    const url = await getSignedUrl(user.id, beat.audio);
    return {
      id: beat.id.toString(),
      url,
      title: beat.title,
      artist: 'Unknown Artist',
      duration: beat.duration,
    };
  };

  const play = async (beat: Beat): Promise<void> => {
    if (!isReady) return;
    try {
      await TrackPlayer.reset();
      const track = await beatToTrack(beat);
      await TrackPlayer.add(track);
      await TrackPlayer.play();
      setCurrentBeat(beat);
      setQueue([beat]);
    } catch (error) {
      console.error('Error playing beat:', error);
    }
  };

  const pause = async (): Promise<void> => {
    await TrackPlayer.pause();
  };

  const resume = async (): Promise<void> => {
    await TrackPlayer.play();
  };

  const stop = async (): Promise<void> => {
    await TrackPlayer.stop();
    await TrackPlayer.reset();
    setCurrentBeat(null);
    setIsPlaying(false);
  };

  const next = async (): Promise<void> => {
    try {
      await TrackPlayer.skipToNext();
    } catch (error) {
      // No next track
      if (repeatMode === 'queue') {
        await TrackPlayer.skip(0);
        await TrackPlayer.play();
      }
    }
  };

  const previous = async (): Promise<void> => {
    try {
      const currentPosition = await TrackPlayer.getProgress();
      if (currentPosition.position > 3) {
        await TrackPlayer.seekTo(0);
      } else {
        await TrackPlayer.skipToPrevious();
      }
    } catch (error) {
      await TrackPlayer.seekTo(0);
    }
  };

  const seekTo = async (positionSeconds: number): Promise<void> => {
    await TrackPlayer.seekTo(positionSeconds);
  };

  const setVolume = async (vol: number): Promise<void> => {
    await TrackPlayer.setVolume(vol);
    setVolumeState(vol);
  };

  const toggleShuffle = (): void => {
    if (!isShuffle) {
      setShuffledQueue(shuffleArray(queue));
    }
    setIsShuffle(!isShuffle);
  };

  const toggleRepeat = (): void => {
    const modes: ('off' | 'track' | 'queue')[] = ['off', 'track', 'queue'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);

    // Update TrackPlayer repeat mode
    switch (nextMode) {
      case 'off':
        TrackPlayer.setRepeatMode(RepeatMode.Off);
        break;
      case 'track':
        TrackPlayer.setRepeatMode(RepeatMode.Track);
        break;
      case 'queue':
        TrackPlayer.setRepeatMode(RepeatMode.Queue);
        break;
    }
  };

  const addToQueue = (beats: Beat | Beat[]): void => {
    const beatsArray = Array.isArray(beats) ? beats : [beats];
    setQueue(prev => [...prev, ...beatsArray]);
    if (isShuffle) {
      setShuffledQueue(prev => [...prev, ...shuffleArray(beatsArray)]);
    }
  };

  const clearQueue = (): void => {
    setQueue([]);
    setShuffledQueue([]);
  };

  const playQueue = async (beats: Beat[], startIndex = 0): Promise<void> => {
    if (!isReady || beats.length === 0) return;
    if (startIndex < 0 || startIndex >= beats.length) {
      startIndex = 0;
    }
    
    try {
      await TrackPlayer.reset();
      setQueue(beats);

      // Get the beat the user selected
      const selectedBeat = beats[startIndex];
      
      let activeQueue: Beat[];
      let trackIndex: number;
      
      if (isShuffle) {
        // Create shuffled queue with selected beat first
        const otherBeats = beats.filter((_, i) => i !== startIndex);
        const shuffledRest = shuffleArray(otherBeats);
        activeQueue = [selectedBeat, ...shuffledRest];
        setShuffledQueue(activeQueue);
        trackIndex = 0; // Selected beat is always first in shuffle
      } else {
        activeQueue = beats;
        trackIndex = startIndex;
      }

      const tracks = await Promise.all(activeQueue.map(beatToTrack));
      await TrackPlayer.add(tracks);
      
      if (trackIndex > 0) {
        await TrackPlayer.skip(trackIndex);
      }
      
      await TrackPlayer.play();
      setCurrentBeat(selectedBeat);
    } catch (error) {
      console.error('Error playing queue:', error);
    }
  };

  return (
    <AudioContext.Provider
      value={{
        currentBeat,
        isPlaying,
        queue,
        shuffledQueue,
        isShuffle,
        repeatMode,
        volume,
        progress: position,
        duration,
        isReady,
        play,
        pause,
        resume,
        stop,
        next,
        previous,
        seekTo,
        setVolume,
        toggleShuffle,
        toggleRepeat,
        addToQueue,
        clearQueue,
        playQueue,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};
