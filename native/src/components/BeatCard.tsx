import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { Beat } from '../services/beatService';

interface BeatCardProps {
  beat: Beat;
  onPress: () => void;
  onPlayPress: () => void;
  isPlaying?: boolean;
  isCurrentBeat?: boolean;
}

const BeatCard: React.FC<BeatCardProps> = ({
  beat,
  onPress,
  onPlayPress,
  isPlaying = false,
  isCurrentBeat = false,
}) => {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, isCurrentBeat && styles.containerActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <TouchableOpacity style={styles.playButton} onPress={onPlayPress}>
        <Icon
          name={isPlaying && isCurrentBeat ? 'pause' : 'play'}
          size={24}
          color={colors.primary}
        />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {beat.title}
        </Text>
        <View style={styles.metadata}>
          {beat.bpm && (
            <Text style={styles.metaText}>{beat.bpm} BPM</Text>
          )}
          {beat.duration && (
            <Text style={styles.metaText}>{formatDuration(beat.duration)}</Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.moreButton}>
        <Icon name="ellipsis-horizontal" size={20} color={colors.grayDefault} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayDark,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  containerActive: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  metadata: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaText: {
    color: colors.grayDefault,
    fontSize: fontSize.sm,
  },
  moreButton: {
    padding: spacing.sm,
  },
});

export default BeatCard;
