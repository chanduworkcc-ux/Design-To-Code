import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { LANGUAGE_LABELS, type Language } from "@/lib/i18n";

const LANGUAGES: Language[] = ["en", "hi", "te"];

export default function LanguageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  async function handleSelect(lang: Language) {
    await setLanguage(lang);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("language")}</Text>
        <Image source={require("@/assets/logo-nobg.png")} style={styles.headerLogo} resizeMode="contain" />
      </View>

      <View style={styles.content}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("selectLanguage").toUpperCase()}</Text>

        <View style={[styles.optionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {LANGUAGES.map((lang, i) => {
            const active = language === lang;
            const info = LANGUAGE_LABELS[lang];
            return (
              <React.Fragment key={lang}>
                <Pressable
                  style={({ pressed }) => [styles.optionRow, pressed && { backgroundColor: colors.accent }]}
                  onPress={() => handleSelect(lang)}
                >
                  <View style={[styles.flagBox, { backgroundColor: active ? colors.primary : colors.accent }]}>
                    <Text style={styles.flagText}>{info.flag}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nativeName, { color: colors.text }]}>{info.native}</Text>
                    <Text style={[styles.englishName, { color: colors.mutedForeground }]}>{info.english}</Text>
                  </View>
                  <View style={[styles.radio, { borderColor: active ? colors.primary : colors.border }]}>
                    {active && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                </Pressable>
                {i < LANGUAGES.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {t("languageHint")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold" },
  headerLogo: { width: 32, height: 32 },
  content: { padding: 20, gap: 10 },
  sectionLabel: { fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 0.8, marginBottom: 4 },
  optionsCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  optionRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  flagBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  flagText: { fontSize: 22 },
  nativeName: { fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  englishName: { fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  divider: { height: 1, marginLeft: 74 },
  hint: { fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 18, marginTop: 4 },
});
