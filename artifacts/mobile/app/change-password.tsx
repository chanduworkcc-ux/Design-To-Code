import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
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

export default function ChangePasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [current, setCurrent]     = useState("");
  const [next, setNext]           = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  async function handleSave() {
    setError("");
    if (!current.trim()) { setError("Please enter your current password."); return; }
    if (next.length < 6)  { setError("New password must be at least 6 characters."); return; }
    if (next !== confirm)  { setError("New passwords do not match."); return; }
    setSaving(true);
    try {
      const res = await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.ok) {
        setSuccess(true);
        if (Platform.OS === "web") {
          setError("");
        } else {
          Alert.alert("Password changed", "Your password has been updated successfully.", [
            { text: "OK", onPress: () => router.back() },
          ]);
        }
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to change password. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    }
    setSaving(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 16, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Change Password</Text>
          <Image source={require("@/assets/logo-nobg.png")} style={styles.headerLogo} resizeMode="contain" />
        </View>

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}>
          <Feather name="lock" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Enter your current password and choose a new one.
        </Text>

        {/* Form */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Current Password */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Current Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="lock" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter current password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showCurrent}
                value={current}
                onChangeText={(t) => { setCurrent(t); setError(""); }}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowCurrent(v => !v)}>
                <Feather name={showCurrent ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="key" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showNext}
                value={next}
                onChangeText={(t) => { setNext(t); setError(""); }}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowNext(v => !v)}>
                <Feather name={showNext ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Confirm New Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="check-circle" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Repeat new password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showConfirm}
                value={confirm}
                onChangeText={(t) => { setConfirm(t); setError(""); }}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowConfirm(v => !v)}>
                <Feather name={showConfirm ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {/* Error */}
          {!!error && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Success */}
          {success && (
            <View style={styles.successRow}>
              <Feather name="check-circle" size={14} color="#10B981" />
              <Text style={styles.successText}>Password changed successfully!</Text>
            </View>
          )}

          {/* Save */}
          <Pressable
            style={[styles.saveBtn, { backgroundColor: saving ? colors.mutedForeground : colors.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Feather name="check" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Update Password"}</Text>
          </Pressable>
        </View>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          After changing your password you will remain signed in on this device.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontFamily: "DMSans_700Bold", flex: 1 },
  headerLogo: { width: 32, height: 32 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 12 },
  subtitle: { fontSize: 14, fontFamily: "DMSans_400Regular", textAlign: "center", marginBottom: 24, paddingHorizontal: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 14, fontFamily: "DMSans_400Regular", padding: 0 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { color: "#EF4444", fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 },
  successRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  successText: { color: "#10B981", fontSize: 13, fontFamily: "DMSans_500Medium", flex: 1 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 15, marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  hint: { fontSize: 12, fontFamily: "DMSans_400Regular", textAlign: "center", marginTop: 16, paddingHorizontal: 16 },
});
