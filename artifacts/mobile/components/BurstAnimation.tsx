import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";

export interface BurstHandle {
  trigger: () => void;
}

interface Particle {
  angle: number;
  distance: number;
  color: string;
  size: number;
  delay: number;
}

function makeParticles(colors: string[], count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    angle: (i / count) * 2 * Math.PI + Math.random() * 0.4,
    distance: 38 + Math.random() * 30,
    color: colors[i % colors.length],
    size: 5 + Math.random() * 5,
    delay: Math.random() * 60,
  }));
}

interface AnimParticleProps {
  particle: Particle;
  trigger: number;
}

function AnimParticle({ particle, trigger }: AnimParticleProps) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    if (trigger === 0) return;
    const dx = Math.cos(particle.angle) * particle.distance;
    const dy = Math.sin(particle.angle) * particle.distance;

    opacity.value = withDelay(
      particle.delay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 380, easing: Easing.out(Easing.quad) }),
      ),
    );
    scale.value = withDelay(
      particle.delay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0.4, { duration: 380 }),
      ),
    );
    translateX.value = withDelay(
      particle.delay,
      withTiming(dx, { duration: 480, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      particle.delay,
      withTiming(dy, { duration: 480, easing: Easing.out(Easing.cubic) }),
    );
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}

interface BurstAnimationProps {
  colors?: string[];
  count?: number;
  size?: number;
}

const BurstAnimation = forwardRef<BurstHandle, BurstAnimationProps>(
  ({ colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"], count = 12, size = 60 }, ref) => {
    const [triggerCount, setTriggerCount] = React.useState(0);
    const particles = useRef(makeParticles(colors, count)).current;

    useImperativeHandle(ref, () => ({
      trigger: () => setTriggerCount((c) => c + 1),
    }));

    return (
      <View style={[styles.root, { width: size, height: size }]} pointerEvents="none">
        {particles.map((p, i) => (
          <AnimParticle key={i} particle={p} trigger={triggerCount} />
        ))}
      </View>
    );
  },
);

export default BurstAnimation;

const styles = StyleSheet.create({
  root: { position: "absolute", alignItems: "center", justifyContent: "center", zIndex: 100 },
  particle: { position: "absolute" },
});
