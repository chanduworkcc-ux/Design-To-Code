import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

type ThemeMode = "light" | "dark" | "system";

const OPTIONS: { key: ThemeMode; icon: string; label: string; desc: string }[] = [
  { key: "light", icon: "sun", label: "Light", desc: "Always use the light theme." },
  { key: "dark", icon: "moon", label: "Dark", desc: "Always use the dark theme." },
  { key: "system", icon: "monitor", label: "System Default", desc: "Follow your device's appearance setting." },
];

export default function AppearanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeMode, setThemeMode } = useApp();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Appearance</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>THEME</Text>
        <View style={[styles.optionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {OPTIONS.map((opt, i) => {
            const active = themeMode === opt.key;
            return (
              <React.Fragment key={opt.key}>
                <Pressable style={styles.optionRow} onPress={() => setThemeMode(opt.key)}>
                  <View style={[styles.optionIcon, { backgroundColor: active ? colors.primary : colors.accent }]}>
                    <Feather name={opt.icon as any} size={18} color={active ? "#fff" : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
                    <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
                  </View>
                  <View style={[styles.radio, { borderColor: active ? colors.primary : colors.border }]}>
                    {active && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                </Pressable>
                {i < OPTIONS.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            );
          })}
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Theme changes take effect immediately across the entire app.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 20, gap: 10 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 4 },
  optionsCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  optionRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  optionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  optionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  divider: { height: 1, marginLeft: 70 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 4 },
});
