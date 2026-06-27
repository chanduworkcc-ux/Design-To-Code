import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { FloatingOrb, FloatIn, TiltCard3D } from "@/components/ThreeD";

const { width: W, height: H } = Dimensions.get("window");

function Btn3D({ onPress, loading, label }: { onPress: () => void; loading: boolean; label: string }) {
  const scale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSequence(
      withTiming(0.95, { duration: 80, easing: Easing.out(Easing.cubic) }),
      withTiming(1,    { duration: 200, easing: Easing.out(Easing.back) }),
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
        <Text style={styles.btnText}>{loading ? "Signing in..." : label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingApproval, setPendingApproval] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields"); return; }
    setLoading(true);
    setError("");
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      if (e.message === "pending_approval") { setPendingApproval(true); }
      else { setError(e.message ?? "Login failed"); }
    } finally { setLoading(false); }
  }

  if (pendingApproval) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: colors.background }}>
        {/* 3D floating orbs even on pending screen */}
        <FloatingOrb color="#8B5CF6" size={200} style={{ top: -40, right: -60 }} delay={0} />
        <FloatingOrb color="#2563EB" size={160} style={{ bottom: 20, left: -50 }} delay={600} />

        <FloatIn delay={200}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#F5F3FF", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Feather name="clock" size={36} color="#8B5CF6" />
          </View>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center", marginBottom: 10 }}>
            Account Pending
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 22, marginBottom: 28 }}>
            Your account is pending admin review.{"\n"}Please wait until an administrator approves your access.
          </Text>
          <View style={{ backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#FCD34D", marginBottom: 24 }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#92400E", textAlign: "center", lineHeight: 18 }}>
              This usually takes 24–48 hours. Contact support if you need faster access.
            </Text>
          </View>
          <Pressable
            style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 24, paddingVertical: 12 }}
            onPress={() => setPendingApproval(false)}
          >
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.text }}>Go Back</Text>
          </Pressable>
        </FloatIn>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* 3D Floating background orbs */}
      <FloatingOrb color="#2563EB" size={280} style={{ top: -80,   left: -100 }} delay={0}    amplitude={22} duration={3600} />
      <FloatingOrb color="#7C3AED" size={200} style={{ top: H * 0.35, right: -80 }} delay={700}  amplitude={18} duration={3200} />
      <FloatingOrb color="#0EA5E9" size={160} style={{ bottom: 60, left: -40  }} delay={1200} amplitude={14} duration={4000} />
      <FloatingOrb color="#F472B6" size={120} style={{ top: H * 0.55, left: W * 0.5 }} delay={400} amplitude={20} duration={2900} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo with float-in */}
        <FloatIn delay={0} distance={30} style={styles.logoArea}>
          <Image source={require("@/assets/logo.png")} style={styles.logoImg} resizeMode="contain" />
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Shop smarter, live better</Text>
        </FloatIn>

        {/* 3D tilt-in card */}
        <TiltCard3D delay={200} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Welcome back</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Sign in to your account</Text>

          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
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
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter your password"
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

          <Btn3D onPress={handleLogin} loading={loading} label="Sign In" />

          <Pressable onPress={() => router.push("/(auth)/register")} style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>Don't have an account? </Text>
            <Text style={[styles.switchLink, { color: colors.primary }]}>Create one</Text>
          </Pressable>
        </TiltCard3D>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, flexGrow: 1, justifyContent: "center" },
  logoArea: { alignItems: "center", marginBottom: 32, gap: 8 },
  logoImg: { width: 180, height: 100 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -8 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  errorText: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  field: { gap: 6 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: -4 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  switchLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
