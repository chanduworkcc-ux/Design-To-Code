import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

function Btn3D({ onPress, loading, label }: { onPress: () => void; loading: boolean; label: string }) {
  const scale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSequence(
      withTiming(0.95, { duration: 80, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 200, easing: Easing.out(Easing.back()) }),
    );
    onPress();
  }

  return (
    <Animated.View style={btnStyle}>
      <Pressable
        style={[styles.btn, { backgroundColor: loading ? "#94A3B8" : "#2563EB" }]}
        onPress={handlePress}
        disabled={loading}
      >
        <Text style={styles.btnText}>{loading ? "Resetting..." : label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function ResetPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();

  const [token, setToken] = useState(params.token ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (!token.trim()) { setError("Please enter your reset code"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim().toUpperCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setDone(true);
    } catch {
      setError("Failed to connect. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          <View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ alignItems: "center", gap: 16 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="check-circle" size={36} color="#10B981" />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text, textAlign: "center" }]}>Password Reset!</Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground, textAlign: "center", lineHeight: 22 }]}>
                  Your password has been updated successfully. You can now sign in with your new password.
                </Text>
                <Btn3D onPress={() => router.replace("/(auth)/login")} loading={false} label="Sign In" />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 32, gap: 8 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" }}>
            <Feather name="shield" size={28} color="#2563EB" />
          </View>
          <Text style={[styles.heading, { color: colors.text }]}>Reset Password</Text>
          <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
            Enter the code from your email and choose a new password
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Reset Code</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="hash" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, styles.codeInput, { color: colors.text }]}
                placeholder="Enter 6-digit code"
                placeholderTextColor={colors.mutedForeground}
                value={token}
                onChangeText={(t) => { setToken(t.toUpperCase()); setError(""); }}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Min. 6 characters"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(""); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(v => !v)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Repeat new password"
                placeholderTextColor={colors.mutedForeground}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowConfirm(v => !v)}>
                <Feather name={showConfirm ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          <Btn3D onPress={handleReset} loading={loading} label="Reset Password" />

          <Pressable onPress={() => router.back()} style={styles.backRow}>
            <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
            <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, flexGrow: 1, justifyContent: "center" },
  heading: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -4 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  errorText: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  field: { gap: 6 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  codeInput: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: 4 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  backRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: -4 },
  backText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
