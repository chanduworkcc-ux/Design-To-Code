import React, { useEffect } from "react";
import {
  Dimensions,
  Image,
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
import { FloatingOrb, PulsingRing } from "@/components/ThreeD";
import { useColors } from "@/hooks/useColors";

const { width: W, height: H } = Dimensions.get("window");
const LOGO = require("@/assets/logo-nobg.png");

// Animated dots: "Loading..." → "Loading." → "Loading.." → "Loading..."
function LoadingDots() {
  const dot = useSharedValue(0);
  useEffect(() => {
    dot.value = withRepeat(
      withTiming(3, { duration: 1200, easing: Easing.linear }),
      -1, false
    );
  }, []);
  const d1 = useAnimatedStyle(() => ({ opacity: dot.value >= 1 ? 1 : 0.2 }));
  const d2 = useAnimatedStyle(() => ({ opacity: dot.value >= 2 ? 1 : 0.2 }));
  const d3 = useAnimatedStyle(() => ({ opacity: dot.value >= 3 ? 1 : 0.2 }));
  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, d1]} />
      <Animated.View style={[styles.dot, d2]} />
      <Animated.View style={[styles.dot, d3]} />
    </View>
  );
}

interface LoadingScreenProps {
  visible: boolean;
  message?: string;
}

export default function LoadingScreen({ visible, message }: LoadingScreenProps) {
  const colors = useColors();

  // 3D logo animations
  const bobY    = useSharedValue(0);
  const rotY    = useSharedValue(0);
  const rotX    = useSharedValue(-6);
  const logoSc  = useSharedValue(0.88);
  const fadeIn  = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    // Fade in the whole overlay
    fadeIn.value = withTiming(1, { duration: 340 });

    // Float up-down
    bobY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(20,  { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
    // Tilt on Y axis (like 3D rotate)
    rotY.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(14,  { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
    // Gentle X tilt (nod)
    rotX.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
        withTiming(2,   { duration: 3400, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
    // Scale breathe
    logoSc.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.92, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { translateY: bobY.value },
      { rotateY: `${rotY.value}deg` },
      { rotateX: `${rotX.value}deg` },
      { scale: logoSc.value },
    ],
  }));

  // Ground shadow: gets smaller/lighter as logo floats up
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(bobY.value, [-20, 20], [1.25, 0.7]) }],
    opacity: interpolate(bobY.value, [-20, 20], [0.22, 0.08]),
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.root, { backgroundColor: colors.background }, overlayStyle]}
    >
      {/* Background orbs */}
      <FloatingOrb color={colors.primary} size={260} style={{ top: -60, right: -80 }} amplitude={12} duration={3800} />
      <FloatingOrb color="#7C3AED"        size={180} style={{ top: 100, left: -70 }} delay={700} amplitude={14} duration={3100} />
      <FloatingOrb color={colors.primary} size={140} style={{ bottom: 80, right: -40 }} delay={400} amplitude={10} duration={2900} />
      <FloatingOrb color="#0EA5E9"        size={110} style={{ bottom: 180, left: -20 }} delay={900} amplitude={8} duration={3500} />

      {/* Center logo zone */}
      <View style={styles.center}>
        {/* Radar rings behind logo */}
        <PulsingRing color={colors.primary} size={200} duration={2600}         />
        <PulsingRing color={colors.primary} size={200} duration={2600} delay={880} />
        <PulsingRing color="#7C3AED"        size={240} duration={3200} delay={440} />

        {/* 3D floating logo */}
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            source={LOGO}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Ground shadow */}
        <Animated.View style={[styles.shadow, shadowStyle]} />

        {/* Loading label */}
        <View style={styles.labelRow}>
          <Text style={[styles.labelText, { color: colors.mutedForeground }]}>
            {message ?? "Loading"}
          </Text>
          <LoadingDots />
        </View>
      </View>

      {/* Bottom brand */}
      <View style={styles.brand}>
        <Text style={[styles.brandBy,    { color: colors.mutedForeground }]}>by</Text>
        <Text style={[styles.brandName,  { color: colors.primary }]}>XyloCart</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 900,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    width: W,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.30,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  logo: {
    width: 160,
    height: 160,
  },
  shadow: {
    width: 100,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2563EB",
    marginTop: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    gap: 4,
  },
  labelText: {
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 0.4,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },
  brand: {
    position: "absolute",
    bottom: 52,
    alignItems: "center",
    gap: 2,
  },
  brandBy: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    letterSpacing: 1,
  },
  brandName: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 4,
  },
});
