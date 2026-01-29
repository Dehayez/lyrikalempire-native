import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing, borderRadius, fontSize } from '../theme';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'username' | 'off';
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
}

const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete = 'off',
  editable = true,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style,
  inputStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const labelPosition = useRef(new Animated.Value(!!value ? 1 : 0)).current;
  const labelScale = useRef(new Animated.Value(!!value ? 1 : 0)).current;
  const labelColorFocus = useRef(new Animated.Value(0)).current;
  const borderColor = useRef(new Animated.Value(0)).current;
  const labelBackgroundOpacity = useRef(new Animated.Value(!!value ? 1 : 0)).current;

  const isSecure = secureTextEntry && !showPassword;
  const hasValue = !!value;
  const shouldFloatLabel = isFocused || hasValue;
  const displayLabel = label || placeholder || '';
  // Never show native placeholder when we have a floating label
  const displayPlaceholder = displayLabel ? '' : placeholder;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(labelPosition, {
        toValue: shouldFloatLabel ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(labelScale, {
        toValue: shouldFloatLabel ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(labelColorFocus, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(borderColor, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(labelBackgroundOpacity, {
        toValue: shouldFloatLabel ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isFocused, hasValue, shouldFloatLabel]);

  const labelTop = labelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [spacing.sm + 2, -8],
  });

  const labelLeft = labelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [leftIcon ? spacing.md + 24 : spacing.md, leftIcon ? spacing.md + 8 : spacing.md],
  });

  const labelFontSize = labelScale.interpolate({
    inputRange: [0, 1],
    outputRange: [fontSize.md, fontSize.xs],
  });

  const animatedLabelColor = labelColorFocus.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.grayDefault, colors.primary],
  });

  const animatedBorderColor = borderColor.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? colors.warning : colors.grayMid, error ? colors.warning : colors.primary],
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputWrapper}>
        <Animated.View
          style={[
            styles.inputContainer,
            {
              borderColor: animatedBorderColor,
            },
            error && styles.inputContainerError,
            !editable && styles.inputContainerDisabled,
          ]}
        >
          {leftIcon && (
            <Icon name={leftIcon} size={20} color={colors.grayDefault} style={styles.leftIcon} />
          )}
          <RNTextInput
            style={[
              styles.input,
              multiline && styles.multilineInput,
              inputStyle,
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={displayPlaceholder}
            placeholderTextColor={colors.grayDefault}
            selectionColor={colors.primary}
            secureTextEntry={isSecure}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            editable={editable}
            multiline={multiline}
            numberOfLines={numberOfLines}
            maxLength={maxLength}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {secureTextEntry && (
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.rightIcon}
            >
              <Icon
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={colors.grayDefault}
              />
            </TouchableOpacity>
          )}
          {rightIcon && !secureTextEntry && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.rightIcon}
              disabled={!onRightIconPress}
            >
              <Icon name={rightIcon} size={20} color={colors.grayDefault} />
            </TouchableOpacity>
          )}
        </Animated.View>
        {displayLabel && (
          <Animated.View
            style={[
              styles.labelContainer,
              {
                top: labelTop,
                left: labelLeft,
              },
            ]}
            pointerEvents="none"
          >
            <Animated.View
              style={[
                styles.labelBackground,
                {
                  opacity: labelBackgroundOpacity,
                },
              ]}
            />
            <Animated.Text
              style={[
                styles.floatingLabel,
                {
                  fontSize: labelFontSize,
                  color: animatedLabelColor,
                },
              ]}
            >
              {displayLabel}
            </Animated.Text>
          </Animated.View>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  inputContainerError: {
    borderColor: colors.warning,
  },
  inputContainerDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  leftIcon: {
    marginLeft: spacing.md,
  },
  rightIcon: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  labelContainer: {
    position: 'absolute',
    zIndex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  labelBackground: {
    position: 'absolute',
    left: -4,
    right: -4,
    top: 5,
    height: 6,
    backgroundColor: colors.black,
  },
  floatingLabel: {
    paddingHorizontal: 2,
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  error: {
    color: colors.warning,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});

export default Input;
