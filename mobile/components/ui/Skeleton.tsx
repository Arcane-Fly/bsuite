import React, { useEffect, useRef } from 'react';
import { View, Animated, type DimensionValue } from 'react-native';
import { Colors } from '@/lib/constants';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  className?: string;
}

/**
 * Animated skeleton placeholder with pulsing opacity.
 * Uses React Native Animated API for smooth performance.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  className = '',
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View className={className}>
      <Animated.View
        style={{
          width,
          height,
          borderRadius,
          backgroundColor: Colors.surfaceElevated,
          opacity,
        }}
      />
    </View>
  );
}

/**
 * Skeleton matching ApprenticeRow layout: avatar + two text lines + badge.
 */
export function SkeletonApprenticeRow() {
  return (
    <View className="flex-row items-center bg-surface border-b border-border px-4 py-3">
      <Skeleton width={40} height={40} borderRadius={20} />
      <View className="ml-3 flex-1 gap-2">
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={14} />
      </View>
      <Skeleton width={60} height={22} borderRadius={11} />
    </View>
  );
}

/**
 * Skeleton matching TimesheetCard layout: name + date + hours.
 */
export function SkeletonTimesheetCard() {
  return (
    <View className="rounded-xl border border-border bg-surface p-4 mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <Skeleton width="50%" height={16} />
        <Skeleton width={60} height={22} borderRadius={11} />
      </View>
      <View className="flex-row items-center gap-4 mb-2">
        <Skeleton width={100} height={14} />
        <Skeleton width={50} height={14} />
      </View>
      <View className="flex-row gap-4">
        <Skeleton width={80} height={12} />
        <Skeleton width={70} height={12} />
      </View>
    </View>
  );
}

/**
 * Skeleton matching WHSIncidentCard layout: icon + title + badges + details.
 */
export function SkeletonIncidentCard() {
  return (
    <View className="rounded-xl border border-border bg-surface p-4 mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Skeleton width={30} height={30} borderRadius={8} />
          <Skeleton width="60%" height={16} />
        </View>
        <Skeleton width={60} height={22} borderRadius={11} />
      </View>
      <View className="flex-row items-center gap-3 mb-1.5">
        <Skeleton width={70} height={22} borderRadius={11} />
        <Skeleton width={60} height={22} borderRadius={11} />
      </View>
      <View className="gap-1 mt-1">
        <Skeleton width="70%" height={12} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
}

/**
 * Skeleton matching MetricCard layout: icon + value + label.
 */
export function SkeletonMetricCard() {
  return (
    <View className="flex-1 min-w-[45%] rounded-xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Skeleton width={36} height={36} borderRadius={8} />
        <Skeleton width={40} height={14} />
      </View>
      <Skeleton width={60} height={32} className="mb-1" />
      <Skeleton width="70%" height={14} />
    </View>
  );
}
