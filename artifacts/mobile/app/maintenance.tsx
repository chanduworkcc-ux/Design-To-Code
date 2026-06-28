import React, { useEffect } from "react";
import {
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
import { useColors } from "@/hooks/useColors";



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

      {/* Centre content */}
      <View style={styles.center}>
        {/* Text content */}
        <View style={{ alignItems: "center", marginTop: 48 }}>
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
        </View>
      </View>

      {/* Bottom tagline */}
      <View style={{ alignItems: "center", paddingBottom: insets.bottom + 24 }}>
        <Text style={styles.bottomTag}>XyloCart — Shop smarter, live better</Text>
      </View>
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
