import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const AVATAR_COLORS = ["#2563EB", "#7C3AED", "#059669", "#DC2626", "#D97706", "#0891B2"];

export default function PersonalInfoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, apiRequest, refreshUser } = useAuth();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [avatarColor, setAvatarColor] = useState(colors.primary);

  const avatarLetter = (name || user?.name || "?").charAt(0).toUpperCase();

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Validation", "Name cannot be empty.");
      return;
    }
    if (trimmed === user?.name) { router.back(); return; }
    setSaving(true);
    try {
      const res = await apiRequest("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        await refreshUser();
        router.back();
      } else {
        const d = await res.json().catch(() => ({}));
        Alert.alert("Error", d.error ?? "Failed to update profile.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
    setSaving(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Personal Information</Text>
        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>Choose avatar colour</Text>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map((c) => (
              <Pressable
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  avatarColor === c && styles.colorDotSelected,
                ]}
                onPress={() => setAvatarColor(c)}
              >
                {avatarColor === c && <Feather name="check" size={14} color="#fff" />}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Name — editable */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>DISPLAY NAME</Text>
        <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="user" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={colors.mutedForeground}
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>

        {/* Email — read-only */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>EMAIL ADDRESS</Text>
        <View style={[styles.inputCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="mail" size={18} color={colors.mutedForeground} />
          <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]} numberOfLines={1}>{user?.email ?? "—"}</Text>
          <Feather name="lock" size={13} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>Email address cannot be changed once registered.</Text>

        {/* Referral Code — read-only */}
        {user?.referralCode && (
          <>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>REFERRAL CODE</Text>
            <View style={[styles.inputCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="gift" size={18} color={colors.mutedForeground} />
              <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]}>{user.referralCode}</Text>
              <Feather name="lock" size={13} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>Your unique referral code. Share it to earn rewards.</Text>
          </>
        )}

        {/* Account Created */}
        <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="calendar" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>Account role: {user?.role?.toUpperCase() ?? "USER"}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, minWidth: 60, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 20, gap: 6 },
  avatarSection: { alignItems: "center", paddingVertical: 28, gap: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  avatarText: { color: "#fff", fontSize: 36, fontFamily: "Inter_700Bold" },
  avatarHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  colorRow: { flexDirection: "row", gap: 12 },
  colorDot: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  colorDotSelected: { transform: [{ scale: 1.15 }] },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginTop: 14, marginBottom: 6 },
  inputCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", padding: 0 },
  readOnlyText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 5, marginLeft: 2, lineHeight: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 20 },
  infoText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
