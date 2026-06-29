import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  withDelay,
} from "react-native-reanimated";

function WifiArc({ size, delay, color }: { size: number; delay: number; color: string }) {
  const opacity = useSharedValue(0.2);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }),
          withTiming(0.2, { duration: 700, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const radius = size / 2;
  const borderWidth = 3;
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size / 2,
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
          borderWidth,
          borderBottomWidth: 0,
          borderColor: color,
          position: "absolute",
          bottom: 8,
        },
        style,
      ]}
    />
  );
}

function Dot({ color }: { color: string }) {
  const scale = useSharedValue(0.8);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 500 }),
        withTiming(0.8, { duration: 500 })
      ),
      -1,
      false
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, position: "absolute", bottom: 0 }, style]}
    />
  );
}

function FloatingCloud({ x, delay }: { x: number; delay: number }) {
  const ty = useSharedValue(0);
  useEffect(() => {
    ty.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 1800, easing: Easing.inOut(Easing.sine) }),
          withTiming(10, { duration: 1800, easing: Easing.inOut(Easing.sine) })
        ),
        -1,
        true
      )
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: 30 }, style]}>
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#E5E7EB", opacity: 0.6 }} />
    </Animated.View>
  );
}

export default function OfflineScreen() {
  const primary = "#2563EB";
  const errColor = "#EF4444";

  const mainScale = useSharedValue(0.8);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    mainScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1600, easing: Easing.inOut(Easing.sine) }),
        withTiming(0.95, { duration: 1600, easing: Easing.inOut(Easing.sine) })
      ),
      -1,
      true
    );
    shakeX.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 80 }),
        withTiming(5, { duration: 80 }),
        withTiming(-5, { duration: 80 }),
        withTiming(5, { duration: 80 }),
        withTiming(0, { duration: 80 }),
        withDelay(2000, withTiming(0, { duration: 1 }))
      ),
      -1,
      false
    );
  }, []);

  const mainStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mainScale.value }, { translateX: shakeX.value }],
  }));

  return (
    <View style={styles.root}>
      <FloatingCloud x={30} delay={0} />
      <FloatingCloud x={280} delay={400} />
      <FloatingCloud x={160} delay={800} />

      <Animated.View style={[styles.iconWrap, mainStyle]}>
        <View style={styles.wifiContainer}>
          <WifiArc size={100} delay={600} color={errColor} />
          <WifiArc size={70} delay={400} color={errColor} />
          <WifiArc size={40} delay={200} color={errColor} />
          <Dot color={errColor} />
        </View>
        <View style={styles.slashLine} />
      </Animated.View>

      <View style={styles.textWrap}>
        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.subtitle}>
          Please check your Wi-Fi or mobile data and try again.
        </Text>
      </View>

      <View style={styles.blobs}>
        {[0, 1, 2].map((i) => (
          <BlobDot key={i} index={i} />
        ))}
      </View>
    </View>
  );
}

function BlobDot({ index }: { index: number }) {
  const scale = useSharedValue(1);
  const colors = ["#DBEAFE", "#FEE2E2", "#E0E7FF"];
  const sizes = [120, 90, 70];
  const positions = [
    { top: -40, left: -40 },
    { bottom: -30, right: -30 },
    { top: 100, right: -50 },
  ];
  useEffect(() => {
    scale.value = withDelay(
      index * 500,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 2000 }),
          withTiming(0.9, { duration: 2000 })
        ),
        -1,
        true
      )
    );
  }, []);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: sizes[index],
          height: sizes[index],
          borderRadius: sizes[index] / 2,
          backgroundColor: colors[index],
          opacity: 0.5,
          ...positions[index],
        },
        aStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 32,
  },
  blobs: { ...StyleSheet.absoluteFillObject, pointerEvents: "none" },
  iconWrap: {
    width: 140,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    position: "relative",
  },
  wifiContainer: {
    width: 100,
    height: 80,
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  slashLine: {
    position: "absolute",
    width: 3,
    height: 120,
    backgroundColor: "#EF4444",
    transform: [{ rotate: "45deg" }],
    borderRadius: 2,
    opacity: 0.8,
  },
  textWrap: { alignItems: "center", gap: 10 },
  title: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
});
