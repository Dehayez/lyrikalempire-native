import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { getGenres, createGenre, deleteGenre, Genre } from '../../services/genreService';
import { SearchBar, Input, Button } from '../../components';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

const GenresScreen: React.FC = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newGenreName, setNewGenreName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchGenres = async () => {
    try {
      const data = await getGenres();
      setGenres(data);
    } catch (error) {
      console.error('Failed to fetch genres:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  const filteredGenres = genres.filter(genre =>
    genre.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddGenre = async () => {
    if (!newGenreName.trim()) {
      Alert.alert('Error', 'Please enter a genre name');
      return;
    }

    setIsAdding(true);
    try {
      await createGenre(newGenreName.trim());
      setNewGenreName('');
      setShowAddForm(false);
      fetchGenres();
      Toast.show({
        type: 'success',
        text1: 'Genre Added',
        text2: `"${newGenreName}" has been created.`,
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Add Genre',
        text2: error.message || 'Something went wrong',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteGenre = (genre: Genre) => {
    Alert.alert(
      'Delete Genre',
      `Are you sure you want to delete "${genre.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGenre(genre.id);
              fetchGenres();
              Toast.show({
                type: 'success',
                text1: 'Genre Deleted',
              });
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: error.message,
              });
            }
          },
        },
      ]
    );
  };

  const renderGenreItem = useCallback(({ item }: { item: Genre }) => (
    <View style={styles.genreItem}>
      <Text style={styles.genreName}>{item.name}</Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteGenre(item)}
      >
        <Icon name="trash-outline" size={18} color={colors.warning} />
      </TouchableOpacity>
    </View>
  ), []);

  const keyExtractor = useCallback((item: Genre) => item.id.toString(), []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search genres..."
        />
      </View>

      {showAddForm ? (
        <View style={styles.addForm}>
          <Input
            value={newGenreName}
            onChangeText={setNewGenreName}
            placeholder="Enter genre name"
            style={styles.addInput}
          />
          <View style={styles.addButtons}>
            <Button
              title="Cancel"
              onPress={() => {
                setShowAddForm(false);
                setNewGenreName('');
              }}
              variant="secondary"
              size="small"
            />
            <Button
              title="Add"
              onPress={handleAddGenre}
              loading={isAdding}
              size="small"
            />
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(true)}
        >
          <Icon name="add" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>Add Genre</Text>
        </TouchableOpacity>
      )}

      <View style={styles.countContainer}>
        <Text style={styles.countText}>{filteredGenres.length} genres</Text>
      </View>

      <FlatList
        data={filteredGenres}
        renderItem={renderGenreItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No genres found</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  addButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  addForm: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.grayDark,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.sm,
  },
  addInput: {
    marginBottom: spacing.sm,
  },
  addButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  countContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  countText: {
    fontSize: fontSize.sm,
    color: colors.grayDefault,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  genreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.grayDark,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  genreName: {
    fontSize: fontSize.md,
    color: colors.white,
  },
  deleteButton: {
    padding: spacing.xs,
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

export default GenresScreen;
