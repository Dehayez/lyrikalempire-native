import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { usePlaylist } from '../../contexts';
import { deletePlaylist, Playlist } from '../../services/playlistService';
import { SearchBar } from '../../components';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

const PlaylistsManageScreen: React.FC = () => {
  const { playlists, refreshPlaylists } = usePlaylist();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeletePlaylist = (playlist: Playlist) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlaylist(playlist.id);
              refreshPlaylists();
              Toast.show({
                type: 'success',
                text1: 'Playlist Deleted',
                text2: `"${playlist.title}" has been deleted.`,
              });
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: error.message || 'Failed to delete playlist',
              });
            }
          },
        },
      ]
    );
  };

  const renderPlaylistItem = useCallback(({ item }: { item: Playlist }) => (
    <View style={styles.playlistItem}>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistTitle} numberOfLines={1}>{item.title}</Text>
        {item.description && (
          <Text style={styles.playlistDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        <Text style={styles.beatCount}>
          {item.beat_count || 0} {item.beat_count === 1 ? 'beat' : 'beats'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeletePlaylist(item)}
      >
        <Icon name="trash-outline" size={20} color={colors.warning} />
      </TouchableOpacity>
    </View>
  ), []);

  const keyExtractor = useCallback((item: Playlist) => item.id.toString(), []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search playlists..."
        />
      </View>

      <View style={styles.countContainer}>
        <Text style={styles.countText}>{filteredPlaylists.length} playlists</Text>
      </View>

      <FlatList
        data={filteredPlaylists}
        renderItem={renderPlaylistItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No playlists found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  countContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  countText: {
    fontSize: fontSize.sm,
    color: colors.grayDefault,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayDark,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs / 2,
  },
  playlistDescription: {
    fontSize: fontSize.sm,
    color: colors.grayDefault,
    marginBottom: spacing.xs / 2,
  },
  beatCount: {
    fontSize: fontSize.xs,
    color: colors.grayLight,
  },
  deleteButton: {
    padding: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.grayDefault,
  },
});

export default PlaylistsManageScreen;
