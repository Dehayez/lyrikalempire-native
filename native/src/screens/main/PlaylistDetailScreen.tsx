import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { getBeatsByPlaylistId, getPlaylistById } from '../../services/playlistService';
import { useAudio } from '../../contexts';
import { BeatCard, Button } from '../../components';
import { Beat } from '../../services/beatService';
import { Playlist } from '../../services/playlistService';
import { colors, spacing, fontSize, fontWeight } from '../../theme';
import { RootStackParamList } from '../../navigation/types';

type PlaylistDetailRouteProp = RouteProp<RootStackParamList, 'PlaylistDetail'>;

const PlaylistDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<PlaylistDetailRouteProp>();
  const { id } = route.params;
  const { currentBeat, isPlaying, pause, resume, playQueue } = useAudio();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const bottomPadding = 60 + insets.bottom + 20;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [playlistData, beatsData] = await Promise.all([
          getPlaylistById(id),
          getBeatsByPlaylistId(id),
        ]);
        setPlaylist(playlistData);
        setBeats(beatsData);
      } catch (error) {
        console.error('Error fetching playlist:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handlePlayBeat = useCallback((beat: Beat, index: number) => {
    if (currentBeat?.id === beat.id) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      playQueue(beats, index);
    }
  }, [currentBeat, isPlaying, pause, resume, playQueue, beats]);

  const handlePlayAll = () => {
    if (beats.length > 0) {
      playQueue(beats, 0);
    }
  };

  const renderBeatItem = useCallback(({ item, index }: { item: Beat; index: number }) => (
    <BeatCard
      beat={item}
      index={index}
      totalCount={beats.length}
      onPress={() => {}}
      onPlayPress={() => handlePlayBeat(item, index)}
      isPlaying={isPlaying}
      isCurrentBeat={currentBeat?.id === item.id}
    />
  ), [currentBeat, isPlaying, handlePlayBeat, beats]);

  const keyExtractor = useCallback((item: Beat) => item.id.toString(), []);

  const ListHeaderComponent = () => (
    <View style={styles.headerContent}>
      {playlist && (
        <>
          <Text style={styles.playlistTitle}>{playlist.title}</Text>
          {playlist.description && (
            <Text style={styles.playlistDescription}>{playlist.description}</Text>
          )}
          <Text style={styles.beatCount}>
            {beats.length} {beats.length === 1 ? 'beat' : 'beats'}
          </Text>
          {beats.length > 0 && (
            <Button
              title="Play All"
              onPress={handlePlayAll}
              style={styles.playAllButton}
            />
          )}
        </>
      )}
    </View>
  );

  const ListFooterComponent = () => <View style={{ height: bottomPadding }} />;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={beats}
        renderItem={renderBeatItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Beats</Text>
            <Text style={styles.emptySubtitle}>Add beats to this playlist</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayDark,
  },
  playlistTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  playlistDescription: {
    fontSize: fontSize.md,
    color: colors.grayDefault,
    marginBottom: spacing.sm,
  },
  beatCount: {
    fontSize: fontSize.sm,
    color: colors.grayLight,
    marginBottom: spacing.md,
  },
  playAllButton: {
    alignSelf: 'flex-start',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.grayDefault,
  },
});

export default PlaylistDetailScreen;
