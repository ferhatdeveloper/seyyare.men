import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";

import { colors, radius } from "../lib/theme";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  rounded?: "sm" | "md" | "lg";
  style?: ViewStyle;
}

const radiusMap = {
  sm: radius.sm,
  md: radius.md,
  lg: radius.lg,
};

/** Mist with soft flame tint for brand-friendly shimmer */
const SKELETON_BG = colors.flameSoft;

export function Skeleton({ width = "100%", height = 16, rounded = "md", style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.75, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          opacity,
          backgroundColor: SKELETON_BG,
          borderRadius: radiusMap[rounded],
        },
        style,
      ]}
    />
  );
}

export function VehicleCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={180} rounded="lg" style={styles.cover} />
      <View style={styles.body}>
        <Skeleton width="70%" height={16} style={styles.gap} />
        <Skeleton width="50%" height={12} style={styles.gap} />
        <Skeleton width="40%" height={20} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FFD8B8",
  },
  cover: { borderRadius: 0 },
  body: { padding: 16 },
  gap: { marginBottom: 8 },
});
