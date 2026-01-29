import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useBeat, useAudio } from '../../contexts';
import { BeatCard } from '../../components';
import { AudioPlayer } from '../../components/AudioPlayer';
import { Beat } from '../../services/beatService';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

interface FilterButtonProps {
  label: string;
  onPress: () => void;
  isActive?: boolean;
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, onPress, isActive }) => (
  <TouchableOpacity 
    style={[styles.filterButton, isActive && styles.filterButtonActive]} 
    onPress={onPress}
  >
    <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
      {label}
    </Text>
    <Icon 
      name="chevron-down" 
      size={14} 
      color={isActive ? colors.black : colors.white} 
    />
  </TouchableOpacity>
);

const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { beats, isLoadingFresh, setRefreshBeats, loadedFromCache } = useBeat();
  const { currentBeat, isPlaying, pause, resume, playQueue } = useAudio();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Bottom padding for list content
  const bottomPadding = spacing.xl;

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
    if (refreshing) return;
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
      index={index}
      onPress={() => {}}
      onPlayPress={() => handlePlayBeat(item, index)}
      isPlaying={isPlaying}
      isCurrentBeat={currentBeat?.id === item.id}
    />
  ), [currentBeat, isPlaying, handlePlayBeat]);

  const keyExtractor = useCallback((item: Beat) => item.id.toString(), []);

  const ListHeaderComponent = () => (
    <View style={styles.tableHeader}>
      <Text style={styles.headerNumber}>#</Text>
      <Text style={styles.headerTitle}>Title</Text>
      <Icon name="time-outline" size={16} color={colors.grayDefault} />
      <View style={styles.headerSpacer} />
    </View>
  );

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      {isLoadingFresh && !loadedFromCache ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <>
          <Text style={styles.emptyTitle}>No Tracks Found</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>All Tracks</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => setShowSearch(!showSearch)}
          >
            <Icon name="search" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar (conditional) */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={18} color={colors.grayDefault} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tracks..."
              placeholderTextColor={colors.grayDefault}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={18} color={colors.grayDefault} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScrollView}
      >
        <FilterButton label="Tierlist" onPress={() => {}} />
        <FilterButton label="Genres" onPress={() => {}} />
        <FilterButton label="Moods" onPress={() => {}} />
        <FilterButton label="Keywords" onPress={() => {}} />
      </ScrollView>

      {/* Beat List */}
      <View style={styles.listWrapper}>
        <FlatList
          data={filteredBeats}
          renderItem={renderBeatItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={ListFooterComponent}
          stickyHeaderIndices={[0]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      </View>

      {/* Audio Player - positioned at bottom */}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerButton: {
    padding: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayDark,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.md,
  },
  filtersScrollView: {
    flexGrow: 0,
  },
  filtersContainer: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayDark,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterButtonTextActive: {
    color: colors.black,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayDark,
    backgroundColor: colors.black,
  },
  headerNumber: {
    width: 40,
    color: colors.grayDefault,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  headerTitle: {
    flex: 1,
    color: colors.grayDefault,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.sm,
  },
  headerSpacer: {
    width: 50 + spacing.sm + spacing.sm, // Duration + more button space
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
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
