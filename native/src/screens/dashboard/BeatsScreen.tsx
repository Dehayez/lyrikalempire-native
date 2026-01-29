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
import { useBeat, useUser } from '../../contexts';
import { deleteBeat, Beat } from '../../services/beatService';
import { SearchBar } from '../../components';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

const BeatsScreen: React.FC = () => {
  const { allBeats, setRefreshBeats } = useBeat();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBeats = allBeats.filter(beat =>
    beat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteBeat = (beat: Beat) => {
    Alert.alert(
      'Delete Beat',
      `Are you sure you want to delete "${beat.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBeat(beat.id, user.id);
              setRefreshBeats(prev => !prev);
              Toast.show({
                type: 'success',
                text1: 'Beat Deleted',
                text2: `"${beat.title}" has been deleted.`,
              });
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: error.message || 'Failed to delete beat',
              });
            }
          },
        },
      ]
    );
  };

  const renderBeatItem = useCallback(({ item }: { item: Beat }) => (
    <View style={styles.beatItem}>
      <View style={styles.beatInfo}>
        <Text style={styles.beatTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.beatMeta}>
          {item.bpm && <Text style={styles.metaText}>{item.bpm} BPM</Text>}
          {item.duration && (
            <Text style={styles.metaText}>
              {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, '0')}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteBeat(item)}
      >
        <Icon name="trash-outline" size={20} color={colors.warning} />
      </TouchableOpacity>
    </View>
  ), [user.id]);

  const keyExtractor = useCallback((item: Beat) => item.id.toString(), []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search beats..."
        />
      </View>

      <View style={styles.countContainer}>
        <Text style={styles.countText}>{filteredBeats.length} beats</Text>
      </View>

      <FlatList
        data={filteredBeats}
        renderItem={renderBeatItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No beats found</Text>
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
  beatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayDark,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  beatInfo: {
    flex: 1,
  },
  beatTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  beatMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.grayDefault,
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

export default BeatsScreen;
