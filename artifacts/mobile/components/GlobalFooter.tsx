import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function GlobalFooter() {
  const colors = useColors();
  return (
    <View style={[styles.footer, { borderTopColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        © 2026 FX PRIME 26. All rights reserved.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: "center",
    paddingVertical: 18,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.4,
  },
});
