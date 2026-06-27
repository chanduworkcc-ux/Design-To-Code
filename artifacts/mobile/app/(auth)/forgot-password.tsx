import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { FloatingOrb, FloatIn, TiltCard3D } from "@/components/ThreeD";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

function Btn3D({ onPress, loading, label }: { onPress: () => void; loading: boolean; label: string }) {
  const scale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSequence(
      withTiming(0.95, { duration: 80, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 200, easing: Easing.out(Easing.back) }),
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
        <Text style={styles.btnText}>{loading ? "Sending..." : label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) { setError("Please enter your email address"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setSent(true);
    } catch {
      setError("Failed to connect. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <FloatingOrb color="#2563EB" size={240} style={{ top: -60, left: -80 }} delay={0} />
        <FloatingOrb color="#7C3AED" size={160} style={{ bottom: 60, right: -60 }} delay={600} />
        <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          <FloatIn delay={0}>
            <TiltCard3D delay={100} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ alignItems: "center", gap: 16 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="send" size={32} color="#2563EB" />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text, textAlign: "center" }]}>Check your email</Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground, textAlign: "center", lineHeight: 22 }]}>
                  If an account exists for{" "}
                  <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.text }}>{email}</Text>
                  , you'll receive a 6-digit reset code shortly.
                </Text>
                <View style={{ backgroundColor: "#FFF7ED", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#FED7AA", width: "100%" }}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#92400E", textAlign: "center", lineHeight: 18 }}>
                    The code expires in 15 minutes. Check your spam folder if you don't see it.
                  </Text>
                </View>
                <Btn3D
                  onPress={() => router.push("/(auth)/reset-password")}
                  loading={false}
                  label="Enter Reset Code"
                />
                <Pressable onPress={() => router.back()} style={styles.backRow}>
                  <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back to login</Text>
                </Pressable>
              </View>
            </TiltCard3D>
          </FloatIn>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <FloatingOrb color="#2563EB" size={260} style={{ top: -80, left: -100 }} delay={0} amplitude={20} duration={3600} />
      <FloatingOrb color="#7C3AED" size={180} style={{ bottom: 80, right: -70 }} delay={700} amplitude={16} duration={3200} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FloatIn delay={0} distance={30} style={{ alignItems: "center", marginBottom: 32, gap: 8 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" }}>
            <Feather name="key" size={28} color="#2563EB" />
          </View>
          <Text style={[styles.heading, { color: colors.text }]}>Forgot Password?</Text>
          <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
            No worries — we'll send you a reset code
          </Text>
        </FloatIn>

        <TiltCard3D delay={200} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Email address</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="mail" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter your email"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>
          </View>

          <Btn3D onPress={handleSubmit} loading={loading} label="Send Reset Code" />

          <Pressable onPress={() => router.back()} style={styles.backRow}>
            <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
            <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back to login</Text>
          </Pressable>
        </TiltCard3D>
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
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  backRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: -4 },
  backText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
