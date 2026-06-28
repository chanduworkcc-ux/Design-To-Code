import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface BadgeDef {
  featherIcon: string;
  label: string;
  topBg: string;
  iconBg: string;
  iconColor: string;
  banColor: string;
}

const BADGES: BadgeDef[] = [
  {
    featherIcon: "rotate-ccw",
    label: "No Returns",
    topBg: "#FFF1F2",
    iconBg: "#FEE2E2",
    iconColor: "#EF4444",
    banColor: "#DC2626",
  },
  {
    featherIcon: "refresh-cw",
    label: "No Exchange",
    topBg: "#FFFBEB",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    banColor: "#DC2626",
  },
  {
    featherIcon: "dollar-sign",
    label: "No Refund",
    topBg: "#FFF1F2",
    iconBg: "#FEE2E2",
    iconColor: "#EF4444",
    banColor: "#DC2626",
  },
];

function PolicyBadge({ def }: { def: BadgeDef }) {
  return (
    <View style={styles.card}>
      {/* Illustrated icon area */}
      <View style={[styles.iconArea, { backgroundColor: def.topBg }]}>
        {/* Inner circle */}
        <View style={[styles.iconCircle, { backgroundColor: def.iconBg }]}>
          <Feather name={def.featherIcon as any} size={26} color={def.iconColor} />
        </View>

        {/* Ban slash overlay — the "No" visual */}
        <View style={styles.banOverlay} pointerEvents="none">
          {/* Diagonal line */}
          <View style={[styles.slash, { backgroundColor: def.banColor }]} />
          {/* Corner badge */}
          <View style={[styles.cornerX, { backgroundColor: def.banColor }]}>
            <Feather name="x" size={9} color="#fff" />
          </View>
        </View>
      </View>

      {/* Label */}
      <Text style={styles.label} numberOfLines={1}>{def.label}</Text>
    </View>
  );
}

export default function PolicyBadges() {
  return (
    <View style={styles.row}>
      {BADGES.map((b) => (
        <PolicyBadge key={b.label} def={b} />
      ))}
    </View>
  );
}

const CARD_SIZE = 92;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  card: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    paddingBottom: 10,
  },
  iconArea: {
    width: "100%",
    height: CARD_SIZE,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  banOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  slash: {
    position: "absolute",
    width: 3,
    height: 68,
    borderRadius: 2,
    transform: [{ rotate: "-45deg" }],
    opacity: 0.85,
  },
  cornerX: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 8,
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    color: "#374151",
    textAlign: "center",
    letterSpacing: 0.2,
    paddingHorizontal: 4,
  },
});
