import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, Modal, StyleSheet, Text, View } from "react-native";
import {
  FloatIn,
  FloatingOrb,
  FloatingParticle,
  PulsingRing,
  SpinBox3D,
} from "./ThreeD";

const { width, height } = Dimensions.get("window");

interface Props {
  visible: boolean;
  orderNumber?: string;
  total?: number;
  onComplete: () => void;
}

const PARTICLES = [
  { x: 30,  y: height * 0.65, delay: 0,    size: 10 },
  { x: 80,  y: height * 0.70, delay: 200,  size: 7  },
  { x: 140, y: height * 0.60, delay: 400,  size: 12 },
  { x: 200, y: height * 0.72, delay: 100,  size: 8  },
  { x: 260, y: height * 0.63, delay: 600,  size: 6  },
  { x: width - 60,  y: height * 0.68, delay: 300,  size: 9  },
  { x: width - 120, y: height * 0.58, delay: 500,  size: 7  },
  { x: width - 180, y: height * 0.73, delay: 150,  size: 11 },
  { x: width / 2 - 40, y: height * 0.75, delay: 350, size: 8 },
  { x: width / 2 + 40, y: height * 0.67, delay: 250, size: 6 },
  { x: width * 0.15, y: height * 0.45, delay: 700, size: 5 },
  { x: width * 0.85, y: height * 0.42, delay: 900, size: 7 },
];

function CheckmarkRing({ delay = 0 }: { delay?: number }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, damping: 14, stiffness: 220, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.timing(checkAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[styles.checkRing, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
      <Animated.View style={[styles.checkInner]}>
        <Text style={styles.checkMark}>✓</Text>
      </Animated.View>
    </Animated.View>
  );
}

export default function PurchaseSuccessAnimation({ visible, orderNumber, total, onComplete }: Props) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onComplete, 4200);
    return () => clearTimeout(t);
  }, [visible, onComplete]);

  if (!visible) return null;

  const fmt = (n: number) => n.toLocaleString("en-IN");

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.root}>
        {/* Gradient-like background blobs */}
        <FloatingOrb color="#fff" size={340} style={{ top: -120, left: -120, opacity: 0.08 }} delay={0} amplitude={14} />
        <FloatingOrb color="#fff" size={240} style={{ bottom: -40, right: -80, opacity: 0.06 }} delay={600} amplitude={10} />
        <FloatingOrb color="#60A5FA" size={180} style={{ top: height * 0.3, left: -70, opacity: 0.18 }} delay={300} amplitude={18} />
        <FloatingOrb color="#34D399" size={120} style={{ top: height * 0.1, right: -30, opacity: 0.14 }} delay={900} amplitude={12} />

        {/* Sonar rings */}
        <View style={styles.ringWrap}>
          <PulsingRing color="rgba(255,255,255,0.30)" size={220} delay={0}    duration={2400} thickness={2} />
          <PulsingRing color="rgba(255,255,255,0.18)" size={320} delay={800}  duration={2400} thickness={1.5} />
          <PulsingRing color="rgba(255,255,255,0.10)" size={420} delay={1600} duration={2400} thickness={1} />
        </View>

        {/* 3D spinning box top-centre */}
        <View style={styles.boxWrap}>
          <SpinBox3D
            size={100}
            color="rgba(255,255,255,0.90)"
            topColor="#A5F3D0"
            sideColor="rgba(165,243,208,0.5)"
          />
        </View>

        {/* Floating particles */}
        {PARTICLES.map((p, i) => (
          <FloatingParticle
            key={i}
            x={p.x}
            startY={p.y}
            color="rgba(255,255,255,0.50)"
            delay={p.delay}
            size={p.size}
            duration={3400}
          />
        ))}

        {/* Main text content */}
        <View style={styles.textBlock}>
          {/* Animated checkmark */}
          <CheckmarkRing delay={100} />

          <FloatIn delay={320} distance={30}>
            <Text style={styles.title}>Your order has{"\n"}been placed</Text>
          </FloatIn>

          <FloatIn delay={480} distance={20}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerDot}>✦</Text>
              <View style={styles.dividerLine} />
            </View>
          </FloatIn>

          {!!orderNumber && (
            <FloatIn delay={580} distance={16}>
              <Text style={styles.orderNum}>{orderNumber}</Text>
            </FloatIn>
          )}

          {total != null && (
            <FloatIn delay={700} distance={16}>
              <View style={styles.totalBadge}>
                <Text style={styles.totalText}>₹{fmt(total)}</Text>
              </View>
            </FloatIn>
          )}

          <FloatIn delay={900} distance={14}>
            <Text style={styles.redirectMsg}>Taking you to order tracking…</Text>
          </FloatIn>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  ringWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    top: 0, left: 0, right: 0, bottom: 0,
  },
  boxWrap: {
    position: "absolute",
    top: height * 0.10,
    alignSelf: "center",
  },
  checkRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  checkInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontSize: 46,
    color: "#fff",
    fontWeight: "700",
    lineHeight: 54,
  },
  textBlock: {
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 120,
  },
  title: {
    fontSize: 34,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
    letterSpacing: -0.8,
    textAlign: "center",
    lineHeight: 42,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.30)",
  },
  dividerDot: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
  },
  orderNum: {
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
    letterSpacing: 0.5,
  },
  totalBadge: {
    marginTop: 14,
    paddingHorizontal: 32,
    paddingVertical: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
  },
  totalText: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  redirectMsg: {
    marginTop: 30,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.60)",
    letterSpacing: 0.3,
  },
});
