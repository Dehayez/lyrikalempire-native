import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  PanResponder,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAudio } from '../contexts';
import { colors, spacing, fontSize, fontWeight } from '../theme';

export const AudioPlayer: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderWidth = useRef(Dimensions.get('window').width);
  const durationRef = useRef(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const lastSeekPosition = useRef<number | null>(null);
  
  const {
    currentBeat,
    isPlaying,
    progress,
    duration,
    pause,
    resume,
    next,
    previous,
    seekTo,
  } = useAudio();

  // Keep duration ref updated
  durationRef.current = duration;

  // Update animated progress when not dragging
  useEffect(() => {
    if (!isDragging && lastSeekPosition.current === null) {
      progressAnim.setValue(progress);
    }
    // Clear lastSeekPosition when progress catches up
    if (lastSeekPosition.current !== null && Math.abs(progress - lastSeekPosition.current) < 1) {
      lastSeekPosition.current = null;
    }
  }, [progress, isDragging]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsDragging(true);
        const x = evt.nativeEvent.locationX;
        const percent = Math.max(0, Math.min(1, x / sliderWidth.current));
        const newProgress = percent * (durationRef.current || 1);
        progressAnim.setValue(newProgress);
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const percent = Math.max(0, Math.min(1, x / sliderWidth.current));
        const newProgress = percent * (durationRef.current || 1);
        progressAnim.setValue(newProgress);
      },
      onPanResponderRelease: (evt) => {
        const x = evt.nativeEvent.locationX;
        const percent = Math.max(0, Math.min(1, x / sliderWidth.current));
        const seekPosition = percent * (durationRef.current || 1);
        lastSeekPosition.current = seekPosition;
        setIsDragging(false);
        seekTo(seekPosition);
      },
    })
  ).current;

  // Early return AFTER all hooks
  if (!currentBeat) return null;

  const progressPercent = duration > 0 
    ? progressAnim.interpolate({
        inputRange: [0, duration],
        outputRange: ['0%', '100%'],
        extrapolate: 'clamp',
      })
    : '0%';

  return (
    <View style={styles.container}>
      {/* Custom Progress Bar - Full Width at Top */}
      <View 
        style={styles.sliderContainer}
        {...panResponder.panHandlers}
        onLayout={(e) => {
          sliderWidth.current = e.nativeEvent.layout.width;
        }}
      >
        <Animated.View style={[styles.sliderProgress, { width: progressPercent }]} />
        {isDragging && (
          <Animated.View 
            style={[
              styles.sliderThumb, 
              { 
                left: progressPercent,
              }
            ]} 
          />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentBeat.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            Dehayez
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={previous} style={styles.controlButton}>
            <Icon name="play-skip-back" size={22} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={isPlaying ? pause : resume}
            style={styles.controlButton}
          >
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={26}
              color={colors.white}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={next} style={styles.controlButton}>
            <Icon name="play-skip-forward" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.blackDark,
    borderTopWidth: 1,
    borderTopColor: colors.grayDark,
  },
  sliderContainer: {
    height: 4,
    backgroundColor: colors.grayDark,
    width: '100%',
  },
  sliderProgress: {
    height: '100%',
    backgroundColor: colors.white,
  },
  sliderThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.white,
    top: -4,
    marginLeft: -6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  trackInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  trackTitle: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  trackArtist: {
    color: colors.grayDefault,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  controlButton: {
    padding: spacing.xs,
  },
});

export default AudioPlayer;
