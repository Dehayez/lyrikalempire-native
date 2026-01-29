import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAudio } from '../contexts';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

export const AudioPlayer: React.FC = () => {
  const {
    currentBeat,
    isPlaying,
    progress,
    duration,
    isShuffle,
    repeatMode,
    pause,
    resume,
    next,
    previous,
    seekTo,
    toggleShuffle,
    toggleRepeat,
  } = useAudio();

  if (!currentBeat) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = (value: number) => {
    seekTo(value);
  };

  const getRepeatIcon = (): string => {
    switch (repeatMode) {
      case 'track':
        return 'repeat';
      case 'queue':
        return 'repeat';
      default:
        return 'repeat';
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 1}
          value={progress}
          onSlidingComplete={handleSliderChange}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.grayMid}
          thumbTintColor={colors.primary}
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(progress)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Track info */}
      <View style={styles.trackInfo}>
        <View style={styles.trackImage}>
          <Icon name="musical-notes" size={24} color={colors.primary} />
        </View>
        <View style={styles.trackDetails}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentBeat.title}
          </Text>
          {currentBeat.bpm && (
            <Text style={styles.trackMeta}>{currentBeat.bpm} BPM</Text>
          )}
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={toggleShuffle} style={styles.controlButton}>
          <Icon
            name="shuffle"
            size={22}
            color={isShuffle ? colors.primary : colors.grayDefault}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={previous} style={styles.controlButton}>
          <Icon name="play-skip-back" size={28} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isPlaying ? pause : resume}
          style={styles.playButton}
        >
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color={colors.black}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={next} style={styles.controlButton}>
          <Icon name="play-skip-forward" size={28} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleRepeat} style={styles.controlButton}>
          <Icon
            name={getRepeatIcon()}
            size={22}
            color={repeatMode !== 'off' ? colors.primary : colors.grayDefault}
          />
          {repeatMode === 'track' && (
            <View style={styles.repeatBadge}>
              <Text style={styles.repeatBadgeText}>1</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.blackDark,
    borderTopWidth: 1,
    borderTopColor: colors.grayDark,
    paddingBottom: spacing.lg,
  },
  progressContainer: {
    paddingHorizontal: spacing.md,
  },
  slider: {
    width: '100%',
    height: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  timeText: {
    color: colors.grayDefault,
    fontSize: fontSize.xs,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  trackImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  trackMeta: {
    color: colors.grayDefault,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  controlButton: {
    padding: spacing.sm,
    position: 'relative',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBadgeText: {
    color: colors.black,
    fontSize: 8,
    fontWeight: fontWeight.bold,
  },
});

export default AudioPlayer;
