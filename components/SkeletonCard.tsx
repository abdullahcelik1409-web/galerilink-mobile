import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '@/lib/theme-context';
import Colors from '@/constants/Colors';

const { width } = Dimensions.get('window');

export const SkeletonCard = () => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const ShimmerOverlay = () => (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          transform: [{ translateX }],
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        },
      ]}
    />
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={[styles.image, { backgroundColor: colors.surfaceElevated }]}>
        <ShimmerOverlay />
      </View>
      <View style={styles.content}>
        <View style={[styles.line, { width: '70%', backgroundColor: colors.surfaceElevated }]}>
          <ShimmerOverlay />
        </View>
        <View style={[styles.line, { width: '40%', marginTop: 8, backgroundColor: colors.surfaceElevated }]}>
          <ShimmerOverlay />
        </View>
        <View style={styles.footer}>
          <View style={[styles.smallLine, { backgroundColor: colors.surfaceElevated }]}>
            <ShimmerOverlay />
          </View>
          <View style={[styles.smallLine, { backgroundColor: colors.surfaceElevated }]}>
            <ShimmerOverlay />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
    height: 320,
  },
  image: {
    height: 200,
    width: '100%',
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  line: {
    height: 20,
    borderRadius: 4,
    overflow: 'hidden',
  },
  smallLine: {
    height: 14,
    width: 60,
    borderRadius: 4,
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});
