import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBeat, useAudio } from '../../contexts';
import { BeatCard, SearchBar } from '../../components';
import { AudioPlayer } from '../../components/AudioPlayer';
import { Beat } from '../../services/beatService';
import { colors, spacing, fontSize, fontWeight } from '../../theme';

const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { beats, isLoadingFresh, setRefreshBeats, loadedFromCache } = useBeat();
  const { currentBeat, isPlaying, pause, resume, playQueue } = useAudio();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Calculate bottom padding: tab bar height (60) + safe area bottom + extra space
  const bottomPadding = 60 + insets.bottom + 20;

  // Clear refreshing when loading completes
  useEffect(() => {
    if (!isLoadingFresh && refreshing) {
      setRefreshing(false);
    }
  }, [isLoadingFresh]);

  const filteredBeats = useMemo(() => {
    if (!searchQuery.trim()) return beats;
    const query = searchQuery.toLowerCase();
    return beats.filter(beat =>
      beat.title.toLowerCase().includes(query) ||
      beat.bpm?.toString().includes(query)
    );
  }, [beats, searchQuery]);

  const handleRefresh = useCallback(() => {
    if (refreshing) return; // Prevent multiple refreshes
    setRefreshing(true);
    setRefreshBeats(prev => !prev);
  }, [refreshing, setRefreshBeats]);

  const handlePlayBeat = useCallback((beat: Beat, index: number) => {
    if (currentBeat?.id === beat.id) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      playQueue(filteredBeats, index);
    }
  }, [currentBeat, isPlaying, pause, resume, playQueue, filteredBeats]);

  const renderBeatItem = useCallback(({ item, index }: { item: Beat; index: number }) => (
    <BeatCard
      beat={item}
      onPress={() => {}}
      onPlayPress={() => handlePlayBeat(item, index)}
      isPlaying={isPlaying}
      isCurrentBeat={currentBeat?.id === item.id}
    />
  ), [currentBeat, isPlaying, handlePlayBeat]);

  const keyExtractor = useCallback((item: Beat) => item.id.toString(), []);

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      {isLoadingFresh && !loadedFromCache ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <>
          <Text style={styles.emptyTitle}>No Beats Found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try a different search term' : 'Add some beats to get started'}
          </Text>
        </>
      )}
    </View>
  );

  const ListFooterComponent = () => <View style={{ height: bottomPadding }} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Beats</Text>
        {isLoadingFresh && loadedFromCache && (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loadingIndicator} />
        )}
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search beats..."
        />
      </View>

      <FlatList
        data={filteredBeats}
        renderItem={renderBeatItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      {currentBeat && <AudioPlayer />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  loadingIndicator: {
    marginLeft: spacing.md,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
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

export default HomeScreen;
