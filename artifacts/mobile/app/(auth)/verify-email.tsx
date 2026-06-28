import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

function Btn3D({ onPress, loading, label }: { onPress: () => void; loading: boolean; label: string }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  function handlePress() {
    scale.value = withSequence(
      withTiming(0.95, { duration: 80, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 200, easing: Easing.out(Easing.back()) }),
    );
    onPress();
  }
  return (
    <Animated.View style={style}>
      <Pressable style={[s.btn, { backgroundColor: loading ? "#94A3B8" : "#2563EB" }]} onPress={handlePress} disabled={loading}>
        <Text style={s.btnText}>{loading ? "Verifying..." : label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function VerifyEmailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingApproval, setPendingApproval] = useState(false);
  const [resent, setResent] = useState(false);

  const email = params.email ?? "";
  const code = digits.join("");

  function handleDigit(text: string, index: number) {
    const val = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    setError("");
    if (val && index < 5) inputRefs.current[index + 1]?.focus();
    if (!val && index > 0) inputRefs.current[index - 1]?.focus();
  }

  function handleKeyPress(e: any, index: number) {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    if (code.length < 6) { setError("Please enter the complete 6-digit code"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.error === "pending_approval") { setPendingApproval(true); return; }
      if (!res.ok) { setError(data.error ?? "Verification failed"); return; }
      router.replace("/(tabs)");
    } catch {
      setError("Failed to connect. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    setResent(false);
    try {
      await fetch(`${BASE_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResent(true);
    } catch {}
    setResendLoading(false);
  }

  if (pendingApproval) {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, justifyContent: "center", padding: 28 }}>
          <View>
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ alignItems: "center", gap: 16 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#F5F3FF", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="clock" size={32} color="#8B5CF6" />
                </View>
                <Text style={[s.cardTitle, { color: colors.text, textAlign: "center" }]}>Email Verified!</Text>
                <Text style={[s.cardSub, { color: colors.mutedForeground, textAlign: "center", lineHeight: 22 }]}>
                  Your email has been verified. Your account is now pending admin review — you'll be notified once access is granted.
                </Text>
                <View style={{ backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#FCD34D", width: "100%" }}>
                  <Text style={{ fontSize: 12, fontFamily: "DMSans_400Regular", color: "#92400E", textAlign: "center", lineHeight: 18 }}>
                    This usually takes 24–48 hours. Contact support if you need faster access.
                  </Text>
                </View>
                <Pressable style={[s.btn, { backgroundColor: "#2563EB" }]} onPress={() => router.replace("/(auth)/login")}>
                  <Text style={s.btnText}>Back to Login</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[s.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 32, gap: 8 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" }}>
            <Feather name="mail" size={28} color="#10B981" />
          </View>
          <Text style={[s.heading, { color: colors.text }]}>Verify your email</Text>
          <Text style={[s.subheading, { color: colors.mutedForeground, paddingHorizontal: 16 }]}>
            We sent a 6-digit code to{"\n"}
            <Text style={{ fontFamily: "DMSans_600SemiBold", color: colors.text }}>{email}</Text>
          </Text>
        </View>

        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!!error && (
            <View style={[s.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {resent && (
            <View style={{ backgroundColor: "#ECFDF5", borderRadius: 10, borderWidth: 1, borderColor: "#6EE7B7", padding: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="check-circle" size={14} color="#10B981" />
              <Text style={{ color: "#065F46", fontSize: 13, fontFamily: "DMSans_400Regular" }}>New code sent! Check your inbox.</Text>
            </View>
          )}

          <Text style={[s.label, { color: colors.text, textAlign: "center" }]}>Enter verification code</Text>

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginVertical: 8 }}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputRefs.current[i] = r; }}
                style={[s.digitBox, {
                  color: colors.text,
                  backgroundColor: colors.secondary,
                  borderColor: d ? "#2563EB" : colors.border,
                }]}
                value={d}
                onChangeText={(t) => handleDigit(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <Btn3D onPress={handleVerify} loading={loading} label="Verify Email" />

          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, marginTop: -4 }}>
            <Text style={[s.switchText, { color: colors.mutedForeground }]}>Didn't receive it? </Text>
            <Pressable onPress={handleResend} disabled={resendLoading}>
              <Text style={[s.switchLink, { color: colors.primary }]}>{resendLoading ? "Sending..." : "Resend code"}</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.replace("/(auth)/login")} style={[s.backRow]}>
            <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
            <Text style={[s.switchText, { color: colors.mutedForeground }]}>Back to login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, flexGrow: 1, justifyContent: "center" },
  heading: { fontSize: 24, fontFamily: "DMSans_700Bold", textAlign: "center" },
  subheading: { fontSize: 14, fontFamily: "DMSans_400Regular", textAlign: "center", lineHeight: 22 },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  cardTitle: { fontSize: 22, fontFamily: "DMSans_700Bold" },
  cardSub: { fontSize: 14, fontFamily: "DMSans_400Regular", marginTop: -4 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  errorText: { color: "#EF4444", fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 },
  label: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  digitBox: { width: 44, height: 54, borderRadius: 10, borderWidth: 1.5, fontSize: 22, fontFamily: "DMSans_700Bold", textAlign: "center" },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  switchText: { fontSize: 14, fontFamily: "DMSans_400Regular" },
  switchLink: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  backRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: -4 },
});
