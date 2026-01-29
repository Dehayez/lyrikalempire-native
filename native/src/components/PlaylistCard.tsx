import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { Playlist } from '../services/playlistService';

interface PlaylistCardProps {
  playlist: Playlist;
  onPress: () => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Icon name="list" size={28} color={colors.primary} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {playlist.title}
        </Text>
        {playlist.description && (
          <Text style={styles.description} numberOfLines={1}>
            {playlist.description}
          </Text>
        )}
        <Text style={styles.count}>
          {playlist.beat_count || 0} {playlist.beat_count === 1 ? 'beat' : 'beats'}
        </Text>
      </View>

      <Icon name="chevron-forward" size={20} color={colors.grayDefault} />
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
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
    marginBottom: spacing.xs / 2,
  },
  description: {
    color: colors.grayDefault,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs / 2,
  },
  count: {
    color: colors.grayLight,
    fontSize: fontSize.xs,
  },
});

export default PlaylistCard;
