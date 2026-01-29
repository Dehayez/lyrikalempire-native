import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { Button, Input } from '../../components';
import { requestPasswordReset } from '../../services/userService';
import { colors, spacing, fontSize, fontWeight } from '../../theme';
import { AuthStackParamList } from '../../navigation/types';

type RequestPasswordResetNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'RequestPasswordReset'
>;

const RequestPasswordResetScreen: React.FC = () => {
  const navigation = useNavigation<RequestPasswordResetNavigationProp>();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState('');

  const handleRequestReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await requestPasswordReset(email);
      setCodeSent(true);
      Toast.show({
        type: 'success',
        text1: 'Code Sent',
        text2: 'Check your email for the reset code.',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (!resetCode.trim()) {
      setError('Please enter the reset code');
      return;
    }
    navigation.navigate('ResetPassword', { email, resetCode });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {codeSent
                ? 'Enter the 6-digit code sent to your email.'
                : "Enter your email address and we'll send you a reset code."}
            </Text>
          </View>

          {!codeSent ? (
            <>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoComplete="email"
                error={error}
                leftIcon="mail-outline"
              />

              <Button
                title="Send Reset Code"
                onPress={handleRequestReset}
                loading={isLoading}
                fullWidth
                size="large"
                style={styles.button}
              />
            </>
          ) : (
            <>
              <Input
                label="Reset Code"
                value={resetCode}
                onChangeText={setResetCode}
                placeholder="Enter 6-digit code"
                keyboardType="numeric"
                maxLength={6}
                error={error}
              />

              <Button
                title="Continue"
                onPress={handleVerifyCode}
                fullWidth
                size="large"
                style={styles.button}
              />

              <Button
                title="Resend Code"
                onPress={handleRequestReset}
                variant="ghost"
                fullWidth
                loading={isLoading}
              />
            </>
          )}

          <Button
            title="Back to Login"
            onPress={() => navigation.navigate('Login')}
            variant="ghost"
            fullWidth
            style={styles.backButton}
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
  backButton: {
    marginTop: spacing.lg,
  },
});

export default RequestPasswordResetScreen;
