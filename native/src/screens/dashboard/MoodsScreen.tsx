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
import { getMoods, createMood, deleteMood, Mood } from '../../services/moodService';
import { SearchBar, Input, Button } from '../../components';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

const MoodsScreen: React.FC = () => {
  const [moods, setMoods] = useState<Mood[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMoodName, setNewMoodName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchMoods = async () => {
    try {
      const data = await getMoods();
      setMoods(data);
    } catch (error) {
      console.error('Failed to fetch moods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMoods();
  }, []);

  const filteredMoods = moods.filter(mood =>
    mood.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMood = async () => {
    if (!newMoodName.trim()) {
      Alert.alert('Error', 'Please enter a mood name');
      return;
    }

    setIsAdding(true);
    try {
      await createMood(newMoodName.trim());
      setNewMoodName('');
      setShowAddForm(false);
      fetchMoods();
      Toast.show({
        type: 'success',
        text1: 'Mood Added',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Add Mood',
        text2: error.message,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMood = (mood: Mood) => {
    Alert.alert(
      'Delete Mood',
      `Are you sure you want to delete "${mood.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMood(mood.id);
              fetchMoods();
              Toast.show({ type: 'success', text1: 'Mood Deleted' });
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Delete Failed', text2: error.message });
            }
          },
        },
      ]
    );
  };

  const renderMoodItem = useCallback(({ item }: { item: Mood }) => (
    <View style={styles.item}>
      <Text style={styles.itemName}>{item.name}</Text>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteMood(item)}>
        <Icon name="trash-outline" size={18} color={colors.warning} />
      </TouchableOpacity>
    </View>
  ), []);

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
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search moods..." />
      </View>

      {showAddForm ? (
        <View style={styles.addForm}>
          <Input value={newMoodName} onChangeText={setNewMoodName} placeholder="Enter mood name" />
          <View style={styles.addButtons}>
            <Button title="Cancel" onPress={() => { setShowAddForm(false); setNewMoodName(''); }} variant="secondary" size="small" />
            <Button title="Add" onPress={handleAddMood} loading={isAdding} size="small" />
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(true)}>
          <Icon name="add" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>Add Mood</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.countText}>{filteredMoods.length} moods</Text>

      <FlatList
        data={filteredMoods}
        renderItem={renderMoodItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No moods found</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  addButtonText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  addForm: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.grayDark, marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: borderRadius.sm },
  addButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  countText: { fontSize: fontSize.sm, color: colors.grayDefault, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.grayDark, borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.sm },
  itemName: { fontSize: fontSize.md, color: colors.white },
  deleteButton: { padding: spacing.xs },
  emptyText: { fontSize: fontSize.md, color: colors.grayDefault, textAlign: 'center', paddingVertical: spacing.xxxl },
});

export default MoodsScreen;
