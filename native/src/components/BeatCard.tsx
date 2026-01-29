import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { Beat } from '../services/beatService';

interface BeatCardProps {
  beat: Beat;
  index: number;
  totalCount: number;
  onPress: () => void;
  onPlayPress: () => void;
  isPlaying?: boolean;
  isCurrentBeat?: boolean;
}

const BeatCard: React.FC<BeatCardProps> = ({
  beat,
  index,
  totalCount,
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
      onPress={onPlayPress}
      activeOpacity={0.7}
    >
      {/* Track Number */}
      <Text style={[styles.trackNumber, isCurrentBeat && styles.textActive]}>
        {totalCount - index}
      </Text>

      {/* Title */}
      <Text 
        style={[styles.title, isCurrentBeat && styles.textActive]} 
        numberOfLines={1}
      >
        {beat.title}
      </Text>

      {/* Duration */}
      <Text style={[styles.duration, isCurrentBeat && styles.textActive]}>
        {beat.duration ? formatDuration(beat.duration) : '--:--'}
      </Text>

      {/* More Button */}
      <TouchableOpacity style={styles.moreButton} onPress={onPress}>
        <Icon name="ellipsis-horizontal" size={18} color={colors.grayDefault} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayDark,
  },
  containerActive: {
    backgroundColor: 'rgba(255, 204, 68, 0.1)',
  },
  trackNumber: {
    width: 40,
    color: colors.grayDefault,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  title: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    paddingHorizontal: spacing.sm,
  },
  duration: {
    width: 50,
    color: colors.grayDefault,
    fontSize: fontSize.sm,
    textAlign: 'right',
  },
  moreButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  textActive: {
    color: colors.primary,
  },
});

export default BeatCard;
