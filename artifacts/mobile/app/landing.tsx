import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { FloatingOrb, PulsingRing } from "@/components/ThreeD";

const { width: W, height: H } = Dimensions.get("window");
const LOGO = require("@/assets/logo-nobg.png");

const FEATURES = [
  { icon: "zap", label: "Lightning-fast delivery" },
  { icon: "shield", label: "Secure & trusted payments" },
  { icon: "tag", label: "Exclusive deals every day" },
];

function FeatureRow({ icon, label, delay }: { icon: string; label: string; delay: number }) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(24);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    tx.value = withDelay(delay, withSpring(0, { damping: 18 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }],
  }));

  return (
    <Animated.View style={[styles.featureRow, style]}>
      <View style={styles.featureIcon}>
        <Feather name={icon as any} size={15} color="#2563EB" />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </Animated.View>
  );
}

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const logoScale  = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const logoBobY   = useSharedValue(0);
  const logoRotY   = useSharedValue(-8);
  const headingOp  = useSharedValue(0);
  const headingTy  = useSharedValue(20);
  const taglineOp  = useSharedValue(0);
  const btnsOp     = useSharedValue(0);
  const btnsTy     = useSharedValue(30);

  useEffect(() => {
    logoScale.value  = withSpring(1, { damping: 14, stiffness: 90 });
    logoOpacity.value = withTiming(1, { duration: 700 });

    logoBobY.value = withDelay(700, withRepeat(
      withSequence(
        withTiming(-12, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming( 12, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ), -1, false,
    ));
    logoRotY.value = withDelay(700, withRepeat(
      withSequence(
        withTiming( 6, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-8, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      ), -1, false,
    ));

    headingOp.value  = withDelay(400, withTiming(1, { duration: 600 }));
    headingTy.value  = withDelay(400, withSpring(0, { damping: 18 }));
    taglineOp.value  = withDelay(650, withTiming(1, { duration: 600 }));

    btnsOp.value  = withDelay(900, withTiming(1, { duration: 500 }));
    btnsTy.value  = withDelay(900, withSpring(0, { damping: 18 }));
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { translateY: logoBobY.value },
      { perspective: 900 },
      { rotateY: `${logoRotY.value}deg` },
    ],
  }));
  const headingStyle = useAnimatedStyle(() => ({
    opacity: headingOp.value,
    transform: [{ translateY: headingTy.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOp.value }));
  const btnsStyle    = useAnimatedStyle(() => ({
    opacity: btnsOp.value,
    transform: [{ translateY: btnsTy.value }],
  }));

  async function handleGetStarted() {
    await AsyncStorage.setItem("has_seen_landing", "true");
    router.replace("/(auth)/register" as any);
  }

  async function handleSignIn() {
    await AsyncStorage.setItem("has_seen_landing", "true");
    router.replace("/(auth)/login" as any);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Background gradient layers */}
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      {/* Decorative orbs */}
      <FloatingOrb color="#2563EB" size={280} delay={0}   amplitude={20} duration={4000}
        style={{ top: -60, left: -80 }} />
      <FloatingOrb color="#7C3AED" size={200} delay={600} amplitude={14} duration={3400}
        style={{ top: H * 0.28, right: -70 }} />
      <FloatingOrb color="#0EA5E9" size={160} delay={300} amplitude={18} duration={3800}
        style={{ bottom: H * 0.22, left: -50 }} />

      {/* Pulsing ring behind logo */}
      <View style={styles.ringWrap}>
        <PulsingRing size={220} color="#2563EB" delay={0}   thickness={1.5} />
        <PulsingRing size={280} color="#3B82F6" delay={600} thickness={1}   />
      </View>

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, logoAnimStyle]}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      {/* Heading */}
      <Animated.View style={[styles.headingWrap, headingStyle]}>
        <Text style={styles.appName}>XyloCart</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={taglineStyle}>
        <Text style={styles.tagline}>Shop smarter. Live better.</Text>
      </Animated.View>

      {/* Feature rows */}
      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <FeatureRow key={f.icon} icon={f.icon} label={f.label} delay={750 + i * 120} />
        ))}
      </View>

      {/* CTA Buttons */}
      <Animated.View style={[styles.btnsWrap, btnsStyle, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          onPress={handleGetStarted}
        >
          <Text style={styles.btnPrimaryText}>Get Started</Text>
          <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 6 }} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
          onPress={handleSignIn}
        >
          <Text style={styles.btnSecondaryText}>I already have an account</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050C1F",
    alignItems: "center",
    justifyContent: "center",
  },
  bgTop: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: H * 0.55,
    backgroundColor: "#0A1535",
    borderBottomLeftRadius: W * 0.5,
    borderBottomRightRadius: W * 0.5,
    transform: [{ scaleX: 1.3 }],
  },
  bgBottom: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: H * 0.4,
    backgroundColor: "#060D20",
  },
  ringWrap: {
    position: "absolute",
    top: H * 0.16,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    marginTop: -H * 0.06,
    marginBottom: 4,
  },
  logo: {
    width: 130,
    height: 130,
  },
  headingWrap: {
    marginTop: 8,
  },
  appName: {
    fontSize: 40,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
    letterSpacing: -1.2,
    textAlign: "center",
  },
  tagline: {
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
    letterSpacing: 0.2,
  },
  features: {
    marginTop: 28,
    gap: 12,
    width: W - 64,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(37,99,235,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
  },
  featureLabel: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#CBD5E1",
  },
  btnsWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    gap: 12,
  },
  btnPrimary: {
    height: 54,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#FFFFFF",
  },
  btnSecondary: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#64748B",
  },
});
