import React, { useEffect } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { FloatingOrb, FloatingParticle, PulsingRing, SpinBox3D, FloatIn } from "@/components/ThreeD";
import { useColors } from "@/hooks/useColors";

const { width: W, height: H } = Dimensions.get("window");

const PARTICLES = [
  { x: W * 0.08, y: H * 0.75, color: "#60A5FA", delay: 0,    size: 5 },
  { x: W * 0.18, y: H * 0.6,  color: "#A78BFA", delay: 400,  size: 4 },
  { x: W * 0.35, y: H * 0.82, color: "#34D399", delay: 800,  size: 6 },
  { x: W * 0.55, y: H * 0.68, color: "#60A5FA", delay: 200,  size: 4 },
  { x: W * 0.72, y: H * 0.78, color: "#F472B6", delay: 1000, size: 5 },
  { x: W * 0.84, y: H * 0.58, color: "#A78BFA", delay: 600,  size: 4 },
  { x: W * 0.92, y: H * 0.72, color: "#34D399", delay: 300,  size: 6 },
  { x: W * 0.28, y: H * 0.55, color: "#F472B6", delay: 700,  size: 5 },
];

function AnimatedTitle() {
  const letter1 = useSharedValue(0);
  const letter2 = useSharedValue(0);

  useEffect(() => {
    letter1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
    letter2.value = withDelay(400, withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    ));
  }, []);

  const dotStyle1 = useAnimatedStyle(() => ({ opacity: interpolate(letter1.value, [0, 1], [0.4, 1]) }));
  const dotStyle2 = useAnimatedStyle(() => ({ opacity: interpolate(letter2.value, [0, 1], [0.4, 1]) }));

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, marginBottom: 6 }}>
      <Text style={styles.mainTitle}>Under Maintenance</Text>
      <Animated.Text style={[styles.dot, dotStyle1]}>.</Animated.Text>
      <Animated.Text style={[styles.dot, dotStyle2]}>.</Animated.Text>
      <Animated.Text style={[styles.dot, dotStyle1]}>.</Animated.Text>
    </View>
  );
}

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function MaintenanceScreen({ message, onRetry }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: "#0F172A" }]}>
      {/* Background floating orbs */}
      <FloatingOrb color="#2563EB" size={260} style={{ top: -60, left: -80 }} delay={0}   amplitude={20} />
      <FloatingOrb color="#7C3AED" size={200} style={{ top: H * 0.3, right: -70 }} delay={800} amplitude={16} />
      <FloatingOrb color="#0EA5E9" size={180} style={{ bottom: 40, left: -50 }} delay={400} amplitude={22} />
      <FloatingOrb color="#8B5CF6" size={140} style={{ bottom: H * 0.25, right: 20 }} delay={1200} amplitude={14} />

      {/* Floating particles drifting upward */}
      {PARTICLES.map((p, i) => (
        <FloatingParticle key={i} x={p.x} startY={p.y} color={p.color} delay={p.delay} size={p.size} duration={3400 + i * 200} />
      ))}

      {/* Centre content */}
      <View style={styles.center}>
        {/* Pulsing sonar rings around the box */}
        <View style={styles.ringsContainer}>
          <PulsingRing color="#2563EB" size={260} delay={0}    duration={2600} thickness={1.5} />
          <PulsingRing color="#60A5FA" size={200} delay={500}  duration={2600} thickness={2}   />
          <PulsingRing color="#93C5FD" size={140} delay={1000} duration={2600} thickness={1}   />
          <PulsingRing color="#BFDBFE" size={90}  delay={1400} duration={2400} thickness={1}   />

          {/* 3D spinning box */}
          <SpinBox3D size={100} color="#2563EB" topColor="#60A5FA" sideColor="#1D4ED8" />
        </View>

        {/* Text content */}
        <FloatIn delay={300} distance={30} style={{ alignItems: "center", marginTop: 48 }}>
          <AnimatedTitle />
          <Text style={styles.subtitle}>
            {message ?? "We're making XyloCart even better.\nPlease check back in a little while."}
          </Text>

          {onRetry && (
            <Pressable style={styles.retryBtn} onPress={onRetry}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          )}

          {/* Grid status indicators */}
          <View style={styles.statusRow}>
            {[
              { label: "Store",   color: "#EF4444" },
              { label: "API",     color: "#F59E0B" },
              { label: "Backend", color: "#10B981" },
            ].map(({ label, color }) => (
              <View key={label} style={styles.statusChip}>
                <View style={[styles.statusDot, { backgroundColor: color }]} />
                <Text style={styles.statusLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </FloatIn>
      </View>

      {/* Bottom tagline */}
      <FloatIn delay={600} distance={20} style={{ alignItems: "center", paddingBottom: insets.bottom + 24 }}>
        <Text style={styles.bottomTag}>XyloCart — Shop smarter, live better</Text>
      </FloatIn>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "space-between" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  ringsContainer: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  mainTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#F1F5F9",
    textAlign: "center",
  },
  dot: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#60A5FA",
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  retryBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 28,
  },
  retryText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  statusRow: {
    flexDirection: "row",
    gap: 12,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#94A3B8",
  },
  bottomTag: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#475569",
  },
});
