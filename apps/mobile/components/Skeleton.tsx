import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  rounded?: "sm" | "md" | "lg" | "full";
  className?: string;
}

export function Skeleton({ width = "100%", height = 16, rounded = "md", className = "" }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [opacity]);

  const roundedClass = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  }[rounded];

  return (
    <Animated.View
      style={{ width, height, opacity }}
      className={`bg-slate-200 ${roundedClass} ${className}`}
    />
  );
}

export function VehicleCardSkeleton() {
  return (
    <View className="bg-white rounded-2xl mb-3 overflow-hidden border border-slate-100">
      <Skeleton height={180} rounded="lg" className="rounded-none" />
      <View className="p-4">
        <Skeleton width="70%" height={16} className="mb-2" />
        <Skeleton width="50%" height={12} className="mb-3" />
        <Skeleton width="40%" height={20} />
      </View>
    </View>
  );
}