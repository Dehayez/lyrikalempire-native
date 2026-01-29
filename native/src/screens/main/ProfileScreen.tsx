import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { useUser } from '../../contexts';
import { updateUserDetails } from '../../services/userService';
import { Button, Input } from '../../components';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

const ProfileScreen: React.FC = () => {
  const { user, setUser } = useUser();

  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      await updateUserDetails({ username });
      setUser(prev => ({ ...prev, username }));
      setIsEditing(false);
      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your profile has been updated successfully.',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Failed to update profile',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setUsername(user.username);
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Icon name="person" size={48} color={colors.primary} />
          </View>
          <Text style={styles.displayName}>{user.username || 'User'}</Text>
          <Text style={styles.displayEmail}>{user.email}</Text>
        </View>

        {/* Profile Form */}
        <View style={styles.formSection}>
          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            editable={isEditing}
            leftIcon="person-outline"
          />

          <Input
            label="Email"
            value={email}
            onChangeText={() => {}}
            placeholder="Email"
            editable={false}
            leftIcon="mail-outline"
          />

          {isEditing ? (
            <View style={styles.buttonRow}>
              <Button
                title="Cancel"
                onPress={handleCancel}
                variant="secondary"
                style={styles.button}
              />
              <Button
                title="Save"
                onPress={handleSave}
                loading={isLoading}
                style={styles.button}
              />
            </View>
          ) : (
            <Button
              title="Edit Profile"
              onPress={() => setIsEditing(true)}
              variant="secondary"
              fullWidth
              style={styles.editButton}
            />
          )}
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  displayName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  displayEmail: {
    fontSize: fontSize.md,
    color: colors.grayDefault,
  },
  formSection: {
    backgroundColor: colors.grayDark,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
  },
  editButton: {
    marginTop: spacing.md,
  },
});

export default ProfileScreen;
