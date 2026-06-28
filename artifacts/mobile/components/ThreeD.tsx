import React, { useEffect, useRef } from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// ─── FloatingOrb ─────────────────────────────────────────────────────────────
// A blurry coloured sphere that bobs up/down. Use as decorative background layer.
interface FloatingOrbProps {
  color: string;
  size: number;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  amplitude?: number;
  duration?: number;
}
export function FloatingOrb({ color, size, style, delay = 0, amplitude = 18, duration = 3200 }: FloatingOrbProps) {
  const y = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    y.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(-amplitude, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(amplitude,  { duration, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    ));
    scale.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1.08, { duration: duration * 0.9, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.94, { duration: duration * 0.9, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    ));
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.28,
          position: "absolute",
        },
        style,
        orbStyle,
      ]}
    />
  );
}

// ─── PulsingRing ─────────────────────────────────────────────────────────────
// An expanding ring (sonar / radar style) that fades out and loops.
interface PulsingRingProps {
  color: string;
  size: number;
  delay?: number;
  duration?: number;
  thickness?: number;
}
export function PulsingRing({ color, size, delay = 0, duration = 2400, thickness = 2 }: PulsingRingProps) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) }),
      -1, false
    ));
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.7, { duration: duration * 0.15 }),
        withTiming(0,   { duration: duration * 0.85, easing: Easing.out(Easing.quad) }),
      ), -1, false
    ));
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thickness,
          borderColor: color,
          position: "absolute",
        },
        ringStyle,
      ]}
    />
  );
}

// ─── FloatIn ─────────────────────────────────────────────────────────────────
// Entrance animation: children float up from below and fade in.
interface FloatInProps {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}
export function FloatIn({ children, delay = 0, distance = 40, style }: FloatInProps) {
  const y = useSharedValue(distance);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(delay, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

// ─── SpinBox3D ────────────────────────────────────────────────────────────────
// A box that rotates continuously in 3D perspective — the face changes appear/
// disappear as it spins around the Y axis.
interface SpinBox3DProps {
  size?: number;
  color?: string;
  topColor?: string;
  sideColor?: string;
}
export function SpinBox3D({ size = 110, color = "#2563EB", topColor = "#60A5FA", sideColor = "#1D4ED8" }: SpinBox3DProps) {
  const rot = useSharedValue(0);
  const bobY = useSharedValue(0);

  useEffect(() => {
    rot.value = withRepeat(
      withTiming(360, { duration: 5000, easing: Easing.linear }), -1, false
    );
    bobY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(12,  { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
  }, []);

  // Main front face – spins around Y axis
  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: size * 5 },
      { translateY: bobY.value },
      { rotateY: `${rot.value}deg` },
      { rotateX: "15deg" },
    ],
  }));

  // Shadow that scales as box "lifts"
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: 1 + interpolate(bobY.value, [-12, 12], [0.12, -0.08]) },
    ],
    opacity: interpolate(bobY.value, [-12, 12], [0.3, 0.15]),
  }));

  return (
    <View style={{ width: size, height: size + 30, alignItems: "center", justifyContent: "center" }}>
      {/* Main spinning box face */}
      <Animated.View style={[
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: size * 0.18,
        },
        frontStyle,
      ]}>
        {/* Top highlight stripe (simulates top face) */}
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: size * 0.18,
          backgroundColor: topColor,
          borderTopLeftRadius: size * 0.18,
          borderTopRightRadius: size * 0.18,
          opacity: 0.7,
        }} />
        {/* Left shadow stripe (simulates side face) */}
        <View style={{
          position: "absolute", top: 0, left: 0, bottom: 0,
          width: size * 0.16,
          backgroundColor: sideColor,
          borderTopLeftRadius: size * 0.18,
          borderBottomLeftRadius: size * 0.18,
          opacity: 0.5,
        }} />
        {/* Gloss dot */}
        <View style={{
          position: "absolute", top: size * 0.22, right: size * 0.22,
          width: size * 0.18, height: size * 0.18, borderRadius: size * 0.09,
          backgroundColor: "rgba(255,255,255,0.25)",
        }} />
      </Animated.View>

      {/* Ground shadow */}
      <Animated.View style={[
        {
          width: size * 0.7,
          height: 14,
          borderRadius: 7,
          backgroundColor: color,
          marginTop: 10,
        },
        shadowStyle,
      ]} />
    </View>
  );
}

// ─── FloatingParticle ────────────────────────────────────────────────────────
// A small dot that drifts upward and fades — use several for a particle field.
interface FloatingParticleProps {
  x: number;
  startY: number;
  color: string;
  delay?: number;
  size?: number;
  duration?: number;
}
export function FloatingParticle({ x, startY, color, delay = 0, size = 6, duration = 3800 }: FloatingParticleProps) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(delay, withRepeat(
      withTiming(-120, { duration, easing: Easing.out(Easing.quad) }),
      -1, false
    ));
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.8, { duration: duration * 0.2 }),
        withTiming(0,   { duration: duration * 0.8 }),
      ), -1, false
    ));
  }, []);

  const particleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x,
          top: startY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        particleStyle,
      ]}
    />
  );
}

// ─── GlowPulse ───────────────────────────────────────────────────────────────
// A continuously pulsing glow ring — perfect for avatars or icons.
interface GlowPulseProps {
  color: string;
  size: number;
  children?: React.ReactNode;
}
export function GlowPulse({ color, size, children }: GlowPulseProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.97, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [0.97, 1.15], [0.4, 0.12]),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          { position: "absolute", width: size + 20, height: size + 20, borderRadius: (size + 20) / 2, backgroundColor: color },
          glowStyle,
        ]}
      />
      {children}
    </View>
  );
}

// ─── TiltCard3D ──────────────────────────────────────────────────────────────
// Wraps children in a card that gently tilts in 3D on mount then settles.
interface TiltCard3DProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}
export function TiltCard3D({ children, style, delay = 0 }: TiltCard3DProps) {
  const tiltY = useSharedValue(20);
  const tiltX = useSharedValue(-8);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    const d = delay;
    tiltY.value = withDelay(d, withSequence(
      withTiming(-10, { duration: 600, easing: Easing.out(Easing.cubic) }),
      withTiming(0,   { duration: 800, easing: Easing.out(Easing.back()) }),
    ));
    tiltX.value = withDelay(d, withSequence(
      withTiming(5,  { duration: 600 }),
      withTiming(0,  { duration: 800 }),
    ));
    opacity.value = withDelay(d, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(d, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { perspective: 900 },
      { rotateY: `${tiltY.value}deg` },
      { rotateX: `${tiltX.value}deg` },
      { translateY: translateY.value },
    ],
  }));

  return <Animated.View style={[style, cardStyle]}>{children}</Animated.View>;
}

// ─── ShimmerWallet ────────────────────────────────────────────────────────────
// A wallet card with a moving shimmer shine effect.
interface ShimmerWalletProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}
export function ShimmerWallet({ children, style }: ShimmerWalletProps) {
  const shimmerX = useSharedValue(-200);
  const tilt = useSharedValue(0);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withSequence(
        withTiming(350, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        withTiming(-200, { duration: 0 }),
        withTiming(-200, { duration: 2000 }),
      ), -1, false
    );
    tilt.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(-4, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { rotateY: `${tilt.value}deg` },
    ],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }, { rotate: "25deg" }],
  }));

  return (
    <Animated.View style={[{ overflow: "hidden" }, style, containerStyle]}>
      {children}
      {/* Shimmer overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: -60,
            bottom: -60,
            width: 80,
            backgroundColor: "rgba(255,255,255,0.18)",
          },
          shineStyle,
        ]}
      />
    </Animated.View>
  );
}
