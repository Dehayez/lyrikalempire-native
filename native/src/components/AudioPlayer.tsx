import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAudio } from '../contexts';
import { colors, spacing, fontSize, fontWeight } from '../theme';

export const AudioPlayer: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    currentBeat,
    isPlaying,
    pause,
    resume,
    next,
    previous,
  } = useAudio();

  if (!currentBeat) return null;

  return (
    <View style={styles.container}>
      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {currentBeat.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          Dehayez
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={previous} style={styles.controlButton}>
          <Icon name="play-skip-back" size={22} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isPlaying ? pause : resume}
          style={styles.controlButton}
        >
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={26}
            color={colors.white}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={next} style={styles.controlButton}>
          <Icon name="play-skip-forward" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.blackDark,
    borderTopWidth: 1,
    borderTopColor: colors.grayDark,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  trackInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  trackTitle: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  trackArtist: {
    color: colors.grayDefault,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  controlButton: {
    padding: spacing.xs,
  },
});

export default AudioPlayer;
