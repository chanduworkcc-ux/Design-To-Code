import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function NotFoundScreen() {
  const colors = useColors();
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/(tabs)" as any);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        Redirecting…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  text: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
  },
});
