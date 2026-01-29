import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useBeat, usePlaylist } from '../../contexts';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { DashboardStackParamList } from '../../navigation/types';

type DashboardNavigationProp = NativeStackNavigationProp<DashboardStackParamList, 'DashboardHome'>;

interface DashboardCardProps {
  icon: string;
  title: string;
  count: number;
  onPress: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ icon, title, count, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.cardIcon}>
      <Icon name={icon} size={28} color={colors.primary} />
    </View>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardCount}>{count}</Text>
  </TouchableOpacity>
);

const DashboardHomeScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNavigationProp>();
  const { allBeats } = useBeat();
  const { playlists } = usePlaylist();

  const dashboardItems = [
    { icon: 'musical-notes', title: 'Beats', count: allBeats.length, screen: 'Beats' as const },
    { icon: 'list', title: 'Playlists', count: playlists.length, screen: 'PlaylistsManage' as const },
    { icon: 'albums', title: 'Genres', count: 0, screen: 'Genres' as const },
    { icon: 'happy', title: 'Moods', count: 0, screen: 'Moods' as const },
    { icon: 'pricetag', title: 'Keywords', count: 0, screen: 'Keywords' as const },
    { icon: 'star', title: 'Features', count: 0, screen: 'Features' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Manage your content</Text>

        <View style={styles.grid}>
          {dashboardItems.map((item, index) => (
            <DashboardCard
              key={index}
              icon={item.icon}
              title={item.title}
              count={item.count}
              onPress={() => navigation.navigate(item.screen)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  content: {
    padding: spacing.lg,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.grayDefault,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: '47%',
    backgroundColor: colors.grayDark,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  cardCount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});

export default DashboardHomeScreen;
