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
import FilterModal, { FilterOption } from '../../components/FilterModal';
import { Beat } from '../../services/beatService';
import { getGenres, Genre } from '../../services/genreService';
import { getMoods, Mood } from '../../services/moodService';
import { getKeywords, Keyword } from '../../services/keywordService';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

type FilterType = 'tierlist' | 'genres' | 'moods' | 'keywords';

interface FilterButtonProps {
  label: string;
  onPress: () => void;
  isActive?: boolean;
  count?: number;
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, onPress, isActive, count }) => (
  <TouchableOpacity 
    style={[styles.filterButton, isActive && styles.filterButtonActive]} 
    onPress={onPress}
  >
    <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
      {label}
      {count && count > 0 ? ` (${count})` : ''}
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
  
  // Filter state
  const [activeFilterType, setActiveFilterType] = useState<FilterType | null>(null);
  const [selectedTierlists, setSelectedTierlists] = useState<(string | number)[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<(string | number)[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<(string | number)[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<(string | number)[]>([]);
  
  // All available genres, moods, keywords from database
  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const [allMoods, setAllMoods] = useState<Mood[]>([]);
  const [allKeywords, setAllKeywords] = useState<Keyword[]>([]);
  
  // Bottom padding for list content
  const bottomPadding = spacing.xl;

  useEffect(() => {
    if (!isLoadingFresh && refreshing) {
      setRefreshing(false);
    }
  }, [isLoadingFresh]);

  // Fetch all genres, moods, and keywords from database
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [genresData, moodsData, keywordsData] = await Promise.all([
          getGenres(),
          getMoods(),
          getKeywords(),
        ]);
        setAllGenres(genresData);
        setAllMoods(moodsData);
        setAllKeywords(keywordsData);
      } catch (error) {
        console.error('Error fetching filter data:', error);
      }
    };
    fetchFilterData();
  }, []);

  // Calculate filter options from beats
  const tierlistOptions = useMemo((): FilterOption[] => {
    const counts: Record<string, number> = {};
    let noTierlistCount = 0;
    
    beats.forEach(beat => {
      if (beat.tierlist) {
        counts[beat.tierlist] = (counts[beat.tierlist] || 0) + 1;
      } else {
        noTierlistCount++;
      }
    });
    
    // Sort by tier order: M, G, S, A, B, C, D, E, F + No tierlist
    const tierOrder = ['M', 'G', 'S', 'A', 'B', 'C', 'D', 'E', 'F'];
    const options: FilterOption[] = tierOrder
      .filter(tier => counts[tier])
      .map(tier => ({ id: tier, name: tier, count: counts[tier] }));
    
    // Add "No tierlist" option if there are beats without tierlist
    if (noTierlistCount > 0) {
      options.push({ id: 'none', name: 'No tierlist', count: noTierlistCount });
    }
    
    return options;
  }, [beats]);

  const genreOptions = useMemo((): FilterOption[] => {
    // Calculate counts from beats
    const counts: Record<number, number> = {};
    beats.forEach(beat => {
      beat.genres?.forEach(genre => {
        const genreId = genre.genre_id;
        counts[genreId] = (counts[genreId] || 0) + 1;
      });
    });
    
    // Return all genres from database with their counts
    return allGenres
      .map(genre => ({ 
        id: genre.id, 
        name: genre.name, 
        count: counts[genre.id] || 0 
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [beats, allGenres]);

  const moodOptions = useMemo((): FilterOption[] => {
    // Calculate counts from beats
    const counts: Record<number, number> = {};
    beats.forEach(beat => {
      beat.moods?.forEach(mood => {
        const moodId = mood.mood_id;
        counts[moodId] = (counts[moodId] || 0) + 1;
      });
    });
    
    // Return all moods from database with their counts
    return allMoods
      .map(mood => ({ 
        id: mood.id, 
        name: mood.name, 
        count: counts[mood.id] || 0 
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [beats, allMoods]);

  const keywordOptions = useMemo((): FilterOption[] => {
    // Calculate counts from beats
    const counts: Record<number, number> = {};
    beats.forEach(beat => {
      beat.keywords?.forEach(keyword => {
        const keywordId = keyword.keyword_id;
        counts[keywordId] = (counts[keywordId] || 0) + 1;
      });
    });
    
    // Return all keywords from database with their counts
    return allKeywords
      .map(keyword => ({ 
        id: keyword.id, 
        name: keyword.name, 
        count: counts[keyword.id] || 0 
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [beats, allKeywords]);

  // Filter beats based on selected filters
  const filteredBeats = useMemo(() => {
    let result = beats;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(beat =>
        beat.title.toLowerCase().includes(query) ||
        beat.bpm?.toString().includes(query)
      );
    }

    // Apply tierlist filter
    if (selectedTierlists.length > 0) {
      result = result.filter(beat => {
        if (selectedTierlists.includes('none')) {
          // Include beats with no tierlist
          if (!beat.tierlist) return true;
        }
        return beat.tierlist && selectedTierlists.includes(beat.tierlist);
      });
    }

    // Apply genre filter
    if (selectedGenres.length > 0) {
      result = result.filter(beat =>
        beat.genres?.some(g => selectedGenres.includes(g.genre_id))
      );
    }

    // Apply mood filter
    if (selectedMoods.length > 0) {
      result = result.filter(beat =>
        beat.moods?.some(m => selectedMoods.includes(m.mood_id))
      );
    }

    // Apply keyword filter
    if (selectedKeywords.length > 0) {
      result = result.filter(beat =>
        beat.keywords?.some(k => selectedKeywords.includes(k.keyword_id))
      );
    }

    return result;
  }, [beats, searchQuery, selectedTierlists, selectedGenres, selectedMoods, selectedKeywords]);

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

  const getFilterModalProps = () => {
    switch (activeFilterType) {
      case 'tierlist':
        return {
          title: 'Tierlist',
          options: tierlistOptions,
          selectedIds: selectedTierlists,
          onSelect: setSelectedTierlists,
        };
      case 'genres':
        return {
          title: 'Genres',
          options: genreOptions,
          selectedIds: selectedGenres,
          onSelect: setSelectedGenres,
        };
      case 'moods':
        return {
          title: 'Moods',
          options: moodOptions,
          selectedIds: selectedMoods,
          onSelect: setSelectedMoods,
        };
      case 'keywords':
        return {
          title: 'Keywords',
          options: keywordOptions,
          selectedIds: selectedKeywords,
          onSelect: setSelectedKeywords,
        };
      default:
        return {
          title: '',
          options: [],
          selectedIds: [],
          onSelect: () => {},
        };
    }
  };

  const renderBeatItem = useCallback(({ item, index }: { item: Beat; index: number }) => (
    <BeatCard
      beat={item}
      index={index}
      totalCount={filteredBeats.length}
      onPress={() => {}}
      onPlayPress={() => handlePlayBeat(item, index)}
      isPlaying={isPlaying}
      isCurrentBeat={currentBeat?.id === item.id}
    />
  ), [currentBeat, isPlaying, handlePlayBeat, filteredBeats]);

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
            {searchQuery || selectedTierlists.length > 0 || selectedGenres.length > 0 || selectedMoods.length > 0 || selectedKeywords.length > 0
              ? 'Try adjusting your filters' 
              : 'Add some beats to get started'}
          </Text>
        </>
      )}
    </View>
  );

  const ListFooterComponent = () => <View style={{ height: bottomPadding }} />;

  const filterModalProps = getFilterModalProps();

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
        <FilterButton 
          label="Tierlist" 
          onPress={() => setActiveFilterType('tierlist')} 
          isActive={selectedTierlists.length > 0}
          count={selectedTierlists.length}
        />
        <FilterButton 
          label="Genres" 
          onPress={() => setActiveFilterType('genres')} 
          isActive={selectedGenres.length > 0}
          count={selectedGenres.length}
        />
        <FilterButton 
          label="Moods" 
          onPress={() => setActiveFilterType('moods')} 
          isActive={selectedMoods.length > 0}
          count={selectedMoods.length}
        />
        <FilterButton 
          label="Keywords" 
          onPress={() => setActiveFilterType('keywords')} 
          isActive={selectedKeywords.length > 0}
          count={selectedKeywords.length}
        />
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

      {/* Filter Modal */}
      <FilterModal
        visible={activeFilterType !== null}
        title={filterModalProps.title}
        options={filterModalProps.options}
        selectedIds={filterModalProps.selectedIds}
        onSelect={filterModalProps.onSelect}
        onClose={() => setActiveFilterType(null)}
      />
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
    width: 50 + spacing.sm + spacing.sm,
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
