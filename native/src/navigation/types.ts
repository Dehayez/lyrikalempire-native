import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ConfirmEmail: { email: string };
  RequestPasswordReset: undefined;
  ResetPassword: { email: string; resetCode: string };
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Playlists: undefined;
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  Settings: undefined;
};

// Dashboard Stack
export type DashboardStackParamList = {
  DashboardHome: undefined;
  Beats: undefined;
  PlaylistsManage: undefined;
  Genres: undefined;
  Moods: undefined;
  Keywords: undefined;
  Features: undefined;
};

// Root Stack (contains Auth and Main)
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  PlaylistDetail: { id: number };
  Profile: undefined;
};

// Screen Props Types
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type DashboardStackScreenProps<T extends keyof DashboardStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<DashboardStackParamList, T>,
  MainTabScreenProps<'Dashboard'>
>;

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

// Declare global navigation types
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
