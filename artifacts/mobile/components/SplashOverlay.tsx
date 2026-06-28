import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

const SPLASH_DURATION = 2500;
const FADE_OUT_DURATION = 500;

interface Props {
  onDone: () => void;
}

function Dot({ delay }: { delay: number }) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.4, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[styles.dot, { transform: [{ scale }], opacity }]}
    />
  );
}

export default function SplashOverlay({ onDone }: Props) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, damping: 14, stiffness: 160, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.delay(400),
      Animated.timing(tagOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_OUT_DURATION,
        useNativeDriver: true,
      }).start(() => onDone());
    }, SPLASH_DURATION - FADE_OUT_DURATION);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <View style={styles.center}>
        <Animated.View
          style={[styles.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}
        >
          <Image
            source={require("@/assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.dotsRow}>
          <Dot delay={0} />
          <Dot delay={200} />
          <Dot delay={400} />
        </View>
      </View>

      <Animated.View style={[styles.footer, { opacity: tagOpacity }]}>
        <Text style={styles.byText}>by</Text>
        <Text style={styles.companyText}>FX PRIME 26</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  logoWrap: {
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 90,
    height: 90,
  },
  brandName: {
    fontSize: 26,
    fontFamily: Platform.OS === "web" ? "sans-serif" : "DMSans_700Bold",
    color: "#1E293B",
    letterSpacing: 0.5,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#3B82F6",
  },
  footer: {
    paddingBottom: Platform.OS === "web" ? 40 : 60,
    alignItems: "center",
    gap: 4,
  },
  byText: {
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: Platform.OS === "web" ? "sans-serif" : "DMSans_400Regular",
    letterSpacing: 1,
  },
  companyText: {
    fontSize: 16,
    fontFamily: Platform.OS === "web" ? "sans-serif" : "DMSans_700Bold",
    color: "#1E40AF",
    letterSpacing: 3,
  },
});
