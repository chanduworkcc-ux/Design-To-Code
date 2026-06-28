import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width: W, height: H } = Dimensions.get("window");
const LOCAL_LOGO = require("@/assets/logo-transparent.png");
const SLIDE_DURATION = 1800;
const DISPLAY_MS = 3200;

interface Props {
  visible: boolean;
  onDone: () => void;
  logoUrl?: string | null;
}

export function TransitionBanner({ visible, onDone, logoUrl }: Props) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const logoX = useRef(new Animated.Value(-W * 0.55)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    doneRef.current = false;

    Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoX, { toValue: W * 0.12, duration: SLIDE_DURATION, useNativeDriver: true }),
          Animated.timing(logoScale, { toValue: 1, duration: SLIDE_DURATION, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(logoX, { toValue: -W * 0.55, duration: SLIDE_DURATION, useNativeDriver: true }),
          Animated.timing(logoScale, { toValue: 0.85, duration: SLIDE_DURATION, useNativeDriver: true }),
        ]),
      ]),
      { iterations: 5 }
    ).start();

    Animated.timing(textOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }).start();

    const timer = setTimeout(dismiss, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  function dismiss() {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      logoX.setValue(-W * 0.55);
      logoScale.setValue(0.85);
      textOpacity.setValue(0);
      onDone();
    });
  }

  if (!visible) return null;

  const logoSource = logoUrl ? { uri: logoUrl } : LOCAL_LOGO;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />

      <View style={styles.stripBg}>
        <Animated.View
          style={[
            styles.logoWrap,
            { transform: [{ translateX: logoX }, { scale: logoScale }] },
          ]}
        >
          <View style={styles.logoCard}>
            <Image source={logoSource} style={styles.logoImg} resizeMode="contain" />
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.brandRow, { opacity: textOpacity }]}>
        <Text style={styles.brandBy}>powered by</Text>
        <Text style={styles.brandName}>XyloCart</Text>
      </Animated.View>

      <Pressable style={styles.skipBtn} onPress={dismiss}>
        <Text style={styles.skipText}>Tap to skip</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8888,
    backgroundColor: "#0A0F2E",
    alignItems: "center",
    justifyContent: "center",
  },
  stripBg: {
    width: W,
    height: 180,
    backgroundColor: "#111840",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 24,
    marginHorizontal: 16,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 18,
    shadowColor: "#2563EB",
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  logoImg: {
    width: W * 0.38,
    height: W * 0.38 * 0.55,
  },
  brandRow: {
    marginTop: 32,
    alignItems: "center",
    gap: 4,
  },
  brandBy: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: "#94A3B8",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  brandName: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
    letterSpacing: 8,
  },
  skipBtn: {
    position: "absolute",
    bottom: H * 0.1,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  skipText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: "#94A3B8",
  },
});
