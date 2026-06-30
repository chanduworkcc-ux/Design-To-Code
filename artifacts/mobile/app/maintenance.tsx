import React, { useEffect } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: W } = Dimensions.get("window");
const GEAR_R = Math.min(W * 0.22, 96);

function PulseRing({ delay, size }: { delay: number; size: number }) {
  const s = useSharedValue(0.6);
  const op = useSharedValue(0.5);
  useEffect(() => {
    s.value = withDelay(delay, withRepeat(withTiming(1.7, { duration: 2400, easing: Easing.out(Easing.quad) }), -1));
    op.value = withDelay(delay, withRepeat(withTiming(0, { duration: 2400, easing: Easing.out(Easing.quad) }), -1));
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: op.value }));
  return (
    <Animated.View style={[{
      position: "absolute", width: size, height: size, borderRadius: size / 2,
      borderWidth: 2, borderColor: "#3B82F6",
    }, style]} />
  );
}

function GearTooth({ angle, r, color }: { angle: number; r: number; color: string }) {
  const rads = (angle * Math.PI) / 180;
  const tx = Math.sin(rads) * r;
  const ty = -Math.cos(rads) * r;
  return (
    <View style={{
      position: "absolute",
      width: Math.max(10, r * 0.28),
      height: Math.max(18, r * 0.48),
      borderRadius: 4,
      backgroundColor: color,
      top: "50%",
      left: "50%",
      marginTop: -Math.max(9, r * 0.24),
      marginLeft: -Math.max(5, r * 0.14),
      transform: [{ translateX: tx }, { translateY: ty }, { rotate: `${angle}deg` }],
    }} />
  );
}

function Gear({ radius, color, speed, reverse, perspective: persp = 600 }: {
  radius: number; color: string; speed: number; reverse?: boolean; perspective?: number;
}) {
  const rot = useSharedValue(0);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  useEffect(() => {
    rot.value = withRepeat(
      withTiming(reverse ? -360 : 360, { duration: speed, easing: Easing.linear }), -1,
    );
    tiltX.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-12, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
    tiltY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(10, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { perspective: persp },
      { rotateX: `${tiltX.value}deg` },
      { rotateY: `${tiltY.value}deg` },
      { rotate: `${rot.value}deg` },
    ],
  }));

  const teeth = 8;
  const size = radius * 2 + 20;

  return (
    <Animated.View style={[{
      width: size, height: size,
      alignItems: "center", justifyContent: "center",
    }, style]}>
      <View style={{
        width: radius * 2, height: radius * 2, borderRadius: radius,
        backgroundColor: color, alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        {Array.from({ length: teeth }).map((_, i) => (
          <GearTooth key={i} angle={i * (360 / teeth)} r={radius} color={color} />
        ))}
        <View style={{
          width: radius * 0.45, height: radius * 0.45,
          borderRadius: radius * 0.225,
          backgroundColor: "#0F172A",
        }} />
      </View>
    </Animated.View>
  );
}

function FloatingBolt({ delay, x }: { delay: number; x: number }) {
  const y = useSharedValue(0);
  const op = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(-60, { duration: 2000, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 0 }),
      ), -1,
    ));
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.6, { duration: 300 }),
        withTiming(0, { duration: 1700, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 100 }),
      ), -1,
    ));
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { translateX: x }], opacity: op.value }));
  return (
    <Animated.View style={[styles.boltDot, style]} />
  );
}

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function MaintenanceScreen({ message, onRetry }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <Image source={require("@/assets/logo-nobg.png")} style={styles.topLogo} resizeMode="contain" />
      <View style={styles.center}>
        {/* 3D Gear Stage */}
        <View style={styles.gearStage}>
          <PulseRing delay={0} size={GEAR_R * 3.6} />
          <PulseRing delay={800} size={GEAR_R * 3.6} />

          {/* Secondary gear (smaller, behind) */}
          <View style={[styles.secondaryGear, { right: -GEAR_R * 0.3, top: -GEAR_R * 0.1 }]}>
            <Gear radius={GEAR_R * 0.56} color="#1D4ED8" speed={2800} reverse />
          </View>

          {/* Primary gear */}
          <Gear radius={GEAR_R} color="#2563EB" speed={5000} />

          {/* Bolt particles */}
          <View style={styles.boltOrigin}>
            {[{ d: 0, x: -30 }, { d: 400, x: 40 }, { d: 900, x: -50 }, { d: 600, x: 20 }].map((p, i) => (
              <FloatingBolt key={i} delay={p.d} x={p.x} />
            ))}
          </View>
        </View>

        {/* Badge */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>MAINTENANCE MODE</Text>
        </View>

        <Text style={styles.title}>Under Maintenance</Text>

        {/* Admin message card */}
        <View style={styles.messageCard}>
          <View style={styles.messageHeader}>
            <View style={styles.messageIcon}>
              <Text style={styles.messageIconText}>📢</Text>
            </View>
            <Text style={styles.messageLabel}>Admin Message</Text>
          </View>
          <Text style={styles.messageText}>
            {message ?? "We're making XyloCart even better. Please check back in a little while."}
          </Text>
        </View>

        {/* Status indicators */}
        <View style={styles.statusRow}>
          {[
            { label: "Store", color: "#EF4444" },
            { label: "API", color: "#F59E0B" },
            { label: "Backend", color: "#10B981" },
          ].map(({ label, color }) => (
            <View key={label} style={styles.statusChip}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={styles.statusLabel}>{label}</Text>
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
  topLogo: { width: 90, height: 50, alignSelf: "center", marginBottom: 4 },
  root: {
    flex: 1, backgroundColor: "#030712",
    alignItems: "center", justifyContent: "space-between",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 20 },
  gearStage: {
    width: GEAR_R * 4, height: GEAR_R * 4,
    alignItems: "center", justifyContent: "center",
  },
  secondaryGear: { position: "absolute" },
  boltOrigin: { position: "absolute", bottom: GEAR_R * 0.8, width: 1, height: 1, alignItems: "center" },
  boltDot: {
    position: "absolute", width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#60A5FA",
  },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(59,130,246,0.15)", paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(59,130,246,0.3)",
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#3B82F6" },
  badgeText: { fontSize: 11, fontFamily: "DMSans_700Bold", color: "#60A5FA", letterSpacing: 1.5 },
  title: { fontSize: 26, fontFamily: "DMSans_700Bold", color: "#F1F5F9", textAlign: "center" },
  messageCard: {
    width: "100%", backgroundColor: "rgba(30,41,59,0.8)",
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(59,130,246,0.2)",
    padding: 16, gap: 10,
  },
  messageHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  messageIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(59,130,246,0.15)", alignItems: "center", justifyContent: "center" },
  messageIconText: { fontSize: 16 },
  messageLabel: { fontSize: 12, fontFamily: "DMSans_700Bold", color: "#60A5FA", letterSpacing: 0.5 },
  messageText: { fontSize: 14, fontFamily: "DMSans_400Regular", color: "#94A3B8", lineHeight: 22 },
  statusRow: { flexDirection: "row", gap: 10 },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontFamily: "DMSans_500Medium", color: "#94A3B8" },
  retryBtn: {
    backgroundColor: "#2563EB", paddingHorizontal: 36, paddingVertical: 14,
    borderRadius: 14,
  },
  retryText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  footer: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#1E293B" },
});
