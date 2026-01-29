import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { Button, Input } from '../../components';
import { verifyConfirmationCode } from '../../services/userService';
import { colors, spacing, fontSize, fontWeight } from '../../theme';
import { AuthStackParamList } from '../../navigation/types';

type ConfirmEmailScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ConfirmEmail'>;
type ConfirmEmailScreenRouteProp = RouteProp<AuthStackParamList, 'ConfirmEmail'>;

const ConfirmEmailScreen: React.FC = () => {
  const navigation = useNavigation<ConfirmEmailScreenNavigationProp>();
  const route = useRoute<ConfirmEmailScreenRouteProp>();
  const { email } = route.params;

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!code.trim()) {
      setError('Please enter the confirmation code');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await verifyConfirmationCode(email, code);
      Toast.show({
        type: 'success',
        text1: 'Email Confirmed',
        text2: 'Your account has been verified. Please login.',
      });
      navigation.navigate('Login');
    } catch (err: any) {
      setError(err.message || 'Invalid confirmation code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Confirm Email</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit code to {email}. Enter it below to verify your account.
            </Text>
          </View>

          <Input
            label="Confirmation Code"
            value={code}
            onChangeText={setCode}
            placeholder="Enter 6-digit code"
            keyboardType="numeric"
            maxLength={6}
            error={error}
          />

          <Button
            title="Verify"
            onPress={handleConfirm}
            loading={isLoading}
            fullWidth
            size="large"
            style={styles.button}
          />

          <Button
            title="Back to Login"
            onPress={() => navigation.navigate('Login')}
            variant="ghost"
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.grayDefault,
    lineHeight: 22,
  },
  button: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
});

export default ConfirmEmailScreen;
