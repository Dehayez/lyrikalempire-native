import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardStackParamList } from './types';
import { colors } from '../theme';

// Screens (placeholders for now)
import DashboardHomeScreen from '../screens/dashboard/DashboardHomeScreen';
import BeatsScreen from '../screens/dashboard/BeatsScreen';
import PlaylistsManageScreen from '../screens/dashboard/PlaylistsManageScreen';
import GenresScreen from '../screens/dashboard/GenresScreen';
import MoodsScreen from '../screens/dashboard/MoodsScreen';
import KeywordsScreen from '../screens/dashboard/KeywordsScreen';
import FeaturesScreen from '../screens/dashboard/FeaturesScreen';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

const DashboardNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.blackDark,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: { backgroundColor: colors.black },
      }}
    >
      <Stack.Screen
        name="DashboardHome"
        component={DashboardHomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen
        name="Beats"
        component={BeatsScreen}
        options={{ title: 'Manage Beats' }}
      />
      <Stack.Screen
        name="PlaylistsManage"
        component={PlaylistsManageScreen}
        options={{ title: 'Manage Playlists' }}
      />
      <Stack.Screen
        name="Genres"
        component={GenresScreen}
        options={{ title: 'Genres' }}
      />
      <Stack.Screen
        name="Moods"
        component={MoodsScreen}
        options={{ title: 'Moods' }}
      />
      <Stack.Screen
        name="Keywords"
        component={KeywordsScreen}
        options={{ title: 'Keywords' }}
      />
      <Stack.Screen
        name="Features"
        component={FeaturesScreen}
        options={{ title: 'Features' }}
      />
    </Stack.Navigator>
  );
};

export default DashboardNavigator;
