import React, { useEffect } from "react";
import { Dimensions, Modal, StyleSheet, Text, View } from "react-native";
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
];

export default function PurchaseSuccessAnimation({ visible, orderNumber, total, onComplete }: Props) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onComplete, 3600);
    return () => clearTimeout(t);
  }, [visible, onComplete]);

  if (!visible) return null;

  const fmt = (n: number) => n.toLocaleString("en-IN");

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.root}>
        {/* Background blobs */}
        <FloatingOrb color="#fff" size={320} style={{ top: -100, left: -100 }} delay={0} amplitude={14} />
        <FloatingOrb color="#fff" size={220} style={{ bottom: 0, right: -70 }} delay={600} amplitude={10} />
        <FloatingOrb color="#60A5FA" size={160} style={{ top: height * 0.35, left: -60 }} delay={300} amplitude={18} />

        {/* Pulsing sonar rings */}
        <View style={styles.ringWrap}>
          <PulsingRing color="rgba(255,255,255,0.35)" size={200} delay={0}    duration={2200} thickness={2} />
          <PulsingRing color="rgba(255,255,255,0.22)" size={290} delay={700}  duration={2200} thickness={1.5} />
          <PulsingRing color="rgba(255,255,255,0.12)" size={370} delay={1400} duration={2200} thickness={1} />
        </View>

        {/* 3D spinning box */}
        <View style={styles.boxWrap}>
          <SpinBox3D
            size={110}
            color="rgba(255,255,255,0.92)"
            topColor="#BFDBFE"
            sideColor="rgba(191,219,254,0.6)"
          />
        </View>

        {/* Floating particles */}
        {PARTICLES.map((p, i) => (
          <FloatingParticle
            key={i}
            x={p.x}
            startY={p.y}
            color="rgba(255,255,255,0.55)"
            delay={p.delay}
            size={p.size}
            duration={3200}
          />
        ))}

        {/* Text content */}
        <View style={styles.textBlock}>
          <FloatIn delay={200}>
            <Text style={styles.emoji}>🎉</Text>
          </FloatIn>

          <FloatIn delay={380}>
            <Text style={styles.title}>Order Placed!</Text>
          </FloatIn>

          {!!orderNumber && (
            <FloatIn delay={520}>
              <Text style={styles.orderNum}>{orderNumber}</Text>
            </FloatIn>
          )}

          {total != null && (
            <FloatIn delay={660}>
              <View style={styles.totalBadge}>
                <Text style={styles.totalText}>₹{fmt(total)}</Text>
              </View>
            </FloatIn>
          )}

          <FloatIn delay={820}>
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
    backgroundColor: "#1D4ED8",
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
    top: height * 0.12,
    alignSelf: "center",
  },
  textBlock: {
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 140,
  },
  emoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -1,
    textAlign: "center",
  },
  orderNum: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
    letterSpacing: 0.5,
  },
  totalBadge: {
    marginTop: 14,
    paddingHorizontal: 28,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  totalText: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  redirectMsg: {
    marginTop: 28,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.3,
  },
});
