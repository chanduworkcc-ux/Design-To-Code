import React, { useEffect } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: W } = Dimensions.get("window");
const SIZE = Math.min(W * 0.55, 240);

function Particle({ delay, x, size }: { delay: number; x: number; size: number }) {
  const y = useSharedValue(0);
  const op = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(-90, { duration: 2200, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 0 }),
      ), -1,
    ));
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.7, { duration: 400 }),
        withTiming(0, { duration: 1800, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 100 }),
      ), -1,
    ));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: x }],
    opacity: op.value,
  }));
  return (
    <Animated.View style={[styles.particle, { width: size, height: size, borderRadius: size / 2 }, style]} />
  );
}

function WifiArc({ radius, strokeW, delay, totalDelay }: { radius: number; strokeW: number; delay: number; totalDelay: number }) {
  const op = useSharedValue(1);
  useEffect(() => {
    op.value = withRepeat(
      withSequence(
        withDelay(delay, withTiming(1, { duration: 0 })),
        withTiming(0.15, { duration: 500, easing: Easing.out(Easing.quad) }),
        withDelay(totalDelay - delay - 500, withTiming(0.15, { duration: 0 })),
        withTiming(1, { duration: 600, easing: Easing.out(Easing.back()) }),
      ), -1,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  const arcW = radius * 2 + strokeW;
  const arcH = radius + strokeW / 2;
  return (
    <Animated.View style={[{ position: "absolute", bottom: strokeW / 2, width: arcW, height: arcH, overflow: "hidden" }, style]}>
      <View style={{
        width: arcW, height: arcW, borderRadius: arcW / 2,
        borderWidth: strokeW, borderColor: "#60A5FA",
        borderBottomColor: "transparent", borderLeftColor: "transparent", borderRightColor: "transparent",
        transform: [{ rotate: "45deg" }],
        position: "absolute", bottom: 0, left: 0,
      }} />
    </Animated.View>
  );
}

function WifiIcon() {
  const fallY = useSharedValue(0);
  const rotZ = useSharedValue(0);
  const scl = useSharedValue(1);

  useEffect(() => {
    fallY.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(1800, withTiming(18, { duration: 300, easing: Easing.out(Easing.quad) })),
        withTiming(14, { duration: 120, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 600, easing: Easing.out(Easing.back(2)) }),
      ), -1,
    );
    rotZ.value = withRepeat(
      withSequence(
        withDelay(1800, withTiming(-8, { duration: 300, easing: Easing.out(Easing.quad) })),
        withTiming(0, { duration: 600, easing: Easing.out(Easing.back(2)) }),
        withTiming(0, { duration: 1400 }),
      ), -1,
    );
    scl.value = withRepeat(
      withSequence(
        withDelay(1800, withTiming(0.88, { duration: 300 })),
        withTiming(1.04, { duration: 400, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 1400 }),
      ), -1,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: fallY.value },
      { rotate: `${rotZ.value}deg` },
      { scale: scl.value },
    ],
  }));

  const arcs = [
    { radius: 14, strokeW: 5, delay: 0 },
    { radius: 28, strokeW: 5, delay: 300 },
    { radius: 42, strokeW: 5, delay: 600 },
  ];

  return (
    <Animated.View style={[styles.wifiContainer, style]}>
      <View style={styles.wifiInner}>
        {arcs.map((a) => (
          <WifiArc key={a.radius} {...a} totalDelay={2800} />
        ))}
        <View style={styles.wifiDot} />
      </View>
    </Animated.View>
  );
}

function PulseRing({ delay, baseSize }: { delay: number; baseSize: number }) {
  const s = useSharedValue(0.5);
  const op = useSharedValue(0.6);
  useEffect(() => {
    s.value = withDelay(delay, withRepeat(
      withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.quad) }), -1,
    ));
    op.value = withDelay(delay, withRepeat(
      withTiming(0, { duration: 2000, easing: Easing.out(Easing.quad) }), -1,
    ));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
    opacity: op.value,
  }));
  return (
    <Animated.View style={[styles.ring, { width: baseSize, height: baseSize, borderRadius: baseSize / 2 }, style]} />
  );
}

interface Props {
  onRetry?: () => void;
}

export default function NetworkErrorScreen({ onRetry }: Props) {
  const insets = useSafeAreaInsets();
  const particles = [
    { delay: 0, x: -40, size: 5 },
    { delay: 500, x: 30, size: 4 },
    { delay: 900, x: -10, size: 6 },
    { delay: 1400, x: 50, size: 3 },
    { delay: 700, x: -60, size: 4 },
    { delay: 200, x: 20, size: 5 },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.center}>
        <View style={styles.iconArea}>
          <PulseRing delay={0} baseSize={SIZE * 0.7} />
          <PulseRing delay={700} baseSize={SIZE * 0.7} />
          <WifiIcon />
          <View style={styles.particleOrigin}>
            {particles.map((p, i) => <Particle key={i} {...p} />)}
          </View>
        </View>

        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>OFFLINE</Text>
        </View>

        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.subtitle}>
          XyloCart couldn't reach the server.{"\n"}
          Please check your Wi-Fi or mobile data and try again.
        </Text>

        <View style={styles.infoRow}>
          {["Wi-Fi", "Mobile Data", "Server"].map((label, i) => (
            <View key={label} style={styles.infoChip}>
              <View style={[styles.chipDot, { backgroundColor: i < 2 ? "#EF4444" : "#F59E0B" }]} />
              <Text style={styles.chipLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {onRetry && (
          <Pressable style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]} onPress={onRetry}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.footer}>XyloCart — Shop smarter, live better</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#040C1A",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 9999,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 20 },
  iconArea: {
    width: SIZE, height: SIZE,
    alignItems: "center", justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 2, borderColor: "#3B82F6",
  },
  wifiContainer: {
    width: SIZE * 0.6, height: SIZE * 0.6,
    alignItems: "center", justifyContent: "flex-end",
  },
  wifiInner: { position: "relative", alignItems: "center", justifyContent: "flex-end" },
  wifiDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#60A5FA", marginTop: 8,
  },
  particleOrigin: { position: "absolute", bottom: 0, width: 1, height: 1, alignItems: "center" },
  particle: { position: "absolute", backgroundColor: "#3B82F6" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(239,68,68,0.15)", paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444" },
  badgeText: { fontSize: 11, fontFamily: "DMSans_700Bold", color: "#EF4444", letterSpacing: 1.5 },
  title: { fontSize: 26, fontFamily: "DMSans_700Bold", color: "#F1F5F9", textAlign: "center" },
  subtitle: {
    fontSize: 14, fontFamily: "DMSans_400Regular",
    color: "#64748B", textAlign: "center", lineHeight: 22,
  },
  infoRow: { flexDirection: "row", gap: 10 },
  infoChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipLabel: { fontSize: 12, fontFamily: "DMSans_500Medium", color: "#94A3B8" },
  retryBtn: {
    backgroundColor: "#2563EB", paddingHorizontal: 36, paddingVertical: 14,
    borderRadius: 14, marginTop: 4,
  },
  retryText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  footer: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#1E293B" },
});
