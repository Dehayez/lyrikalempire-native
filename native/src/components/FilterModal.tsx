import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 150;

export interface FilterOption {
  id: string | number;
  name: string;
  count: number;
}

interface FilterModalProps {
  visible: boolean;
  title: string;
  options: FilterOption[];
  selectedIds: (string | number)[];
  onSelect: (ids: (string | number)[]) => void;
  onClose: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  title,
  options,
  selectedIds,
  onSelect,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelectedIds, setLocalSelectedIds] = useState<(string | number)[]>(selectedIds);
  const [modalVisible, setModalVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollOffset = useRef(0);
  
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  // Pan responder for drag to dismiss - works on entire modal
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture downward drags when list is at the top
        const isAtTop = scrollOffset.current <= 0;
        const isDownward = gestureState.dy > 10;
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        return isAtTop && isDownward && isVertical;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        // Only capture downward drags when list is at the top
        const isAtTop = scrollOffset.current <= 0;
        const isDownward = gestureState.dy > 10;
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        return isAtTop && isDownward && isVertical;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging down (positive dy)
        if (gestureState.dy > 0) {
          dragY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsDragging(false);
        if (gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > 0.5) {
          // Dismiss the modal
          onClose();
        } else {
          // Snap back
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      },
    })
  ).current;

  // Handle visibility and animations
  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      scrollOffset.current = 0;
      setModalVisible(true);
      setLocalSelectedIds(selectedIds);
      setSearchQuery('');
      
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else if (modalVisible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
        dragY.setValue(0);
      });
    }
  }, [visible]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(opt => opt.name.toLowerCase().includes(query));
  }, [options, searchQuery]);

  const toggleOption = (id: string | number) => {
    setLocalSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleDone = () => {
    onSelect(localSelectedIds);
    onClose();
  };

  const handleClear = () => {
    setLocalSelectedIds([]);
  };

  const handleScroll = (event: any) => {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
  };

  const renderOption = ({ item }: { item: FilterOption }) => {
    const isSelected = localSelectedIds.includes(item.id);
    return (
      <TouchableOpacity 
        style={styles.optionRow} 
        onPress={() => toggleOption(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Icon name="checkmark" size={14} color={colors.black} />}
        </View>
        <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>
          {item.name}
        </Text>
        <Text style={styles.optionCount}>{item.count}</Text>
      </TouchableOpacity>
    );
  };

  const combinedTranslateY = Animated.add(slideAnim, dragY);

  // Use a larger range so opacity decreases more gradually
  // Opacity reaches 0 only when modal is dragged much further down
  const MAX_DRAG_DISTANCE = DISMISS_THRESHOLD * 3; // 240px

  // Interpolate dragY to control overlay opacity (decreases as drag increases)
  const dynamicOverlayOpacity = dragY.interpolate({
    inputRange: [0, MAX_DRAG_DISTANCE],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Combine base overlay opacity with drag-based opacity
  const finalOverlayOpacity = Animated.multiply(overlayOpacity, dynamicOverlayOpacity);

  // Interpolate dragY to control blur intensity (using opacity of different blur layers)
  const strongBlurOpacity = dragY.interpolate({
    inputRange: [0, MAX_DRAG_DISTANCE / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const weakBlurOpacity = dragY.interpolate({
    inputRange: [0, MAX_DRAG_DISTANCE / 2, MAX_DRAG_DISTANCE],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        {/* Animated Blur Overlay */}
        <Animated.View 
          style={[
            styles.overlay,
            { opacity: finalOverlayOpacity }
          ]} 
        >
          {/* Strong blur layer */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: strongBlurOpacity }]}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={2}
              reducedTransparencyFallbackColor="black"
            />
          </Animated.View>
          
          {/* Weak blur layer */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: weakBlurOpacity }]}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={0.5}
              reducedTransparencyFallbackColor="black"
            />
          </Animated.View>
          
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>
        
        {/* Animated Content - entire container is draggable */}
        <Animated.View 
          style={[
            styles.container, 
            { 
              paddingBottom: insets.bottom || spacing.lg,
              transform: [{ translateY: combinedTranslateY }],
            }
          ]}
          {...panResponder.panHandlers}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Filter {title}</Text>

          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`Search ${title.toLowerCase()}...`}
              placeholderTextColor={colors.grayDefault}
            />
          </View>

          {/* Options List */}
          <FlatList
            data={filteredOptions}
            renderItem={renderOption}
            keyExtractor={(item) => item.id.toString()}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            scrollEnabled={!isDragging}
            bounces={true}
            nestedScrollEnabled={true}
          />

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: colors.grayDark,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '70%',
    paddingHorizontal: spacing.lg,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: colors.grayMid,
    borderRadius: 3,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.md,
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.blackDark,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.white,
    fontSize: fontSize.md,
  },
  list: {
    flexGrow: 0,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.grayMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  optionNameSelected: {
    color: colors.primary,
  },
  optionCount: {
    fontSize: fontSize.sm,
    color: colors.grayDefault,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.grayMid,
    marginTop: spacing.md,
  },
  clearButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  clearButtonText: {
    fontSize: fontSize.md,
    color: colors.grayLight,
  },
  doneButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  doneButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
});

export default FilterModal;
