import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const { width: W, height: H } = Dimensions.get("window");

function Btn3D({ onPress, loading, label }: { onPress: () => void; loading: boolean; label: string }) {
  const scale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withTiming(1,    { duration: 220, easing: Easing.out(Easing.back()) }),
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
        <Text style={styles.btnText}>{loading ? "Creating account..." : label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();
  const params = useLocalSearchParams<{ ref?: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(params.ref ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [refAutoFilled, setRefAutoFilled] = useState(!!params.ref);

  useEffect(() => {
    if (params.ref && params.ref !== referralCode) {
      setReferralCode(params.ref.toUpperCase());
      setRefAutoFilled(true);
    }
  }, [params.ref]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingApproval, setPendingApproval] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !mobile.trim() || !password.trim()) {
      setError("Please fill in all required fields");
      return;
    }
    if (name.trim().length < 3) {
      setError("Name must be at least 3 characters");
      return;
    }
    if (!/^\d{10}$/.test(mobile.trim())) {
      setError("Mobile number must be exactly 10 digits");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!agreedToTerms) {
      setError("You must accept the Terms & Conditions to continue");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        mobileNumber: mobile.trim(),
        referralCode: referralCode.trim() || undefined,
      });
      router.replace("/(tabs)");
    } catch (e: any) {
      if (e.message === "pending_approval") { setPendingApproval(true); }
      else { setError(e.message ?? "Registration failed"); }
    } finally { setLoading(false); }
  }

  if (pendingApproval) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: colors.background }}>
        <View>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Feather name="check-circle" size={36} color="#10B981" />
          </View>
          <Text style={{ fontSize: 22, fontFamily: "DMSans_700Bold", color: colors.text, textAlign: "center", marginBottom: 10 }}>Registration Submitted!</Text>
          <Text style={{ fontSize: 14, fontFamily: "DMSans_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 22, marginBottom: 28 }}>
            Your account is pending admin approval.{"\n"}You'll be notified once access is granted.
          </Text>
          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.btnText}>Back to Login</Text>
          </Pressable>
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
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoArea}>
          <Image source={require("@/assets/logo-nobg.png")} style={styles.logoImg} resizeMode="contain" />
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Join millions of smart shoppers</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Start your XyloCart journey</Text>

          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Full Name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <View style={[styles.inputRow, { backgroundColor: "transparent", borderColor: colors.border }]}>
              <Feather name="user" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter your full name (3+ chars)"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={(t) => { setName(t); setError(""); }}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <View style={[styles.inputRow, { backgroundColor: "transparent", borderColor: colors.border }]}>
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

          {/* Mobile Number */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Mobile Number</Text>
            <View style={[styles.inputRow, { backgroundColor: "transparent", borderColor: colors.border }]}>
              <Feather name="phone" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.mutedForeground}
                value={mobile}
                onChangeText={(t) => { setMobile(t.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                keyboardType="number-pad"
                maxLength={10}
                autoCorrect={false}
              />
              {mobile.length > 0 && (
                <Text style={{ fontSize: 11, fontFamily: "DMSans_500Medium", color: mobile.length === 10 ? "#10B981" : colors.mutedForeground }}>
                  {mobile.length}/10
                </Text>
              )}
            </View>
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View style={[styles.inputRow, { backgroundColor: "transparent", borderColor: colors.border }]}>
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Create a password (6+ chars)"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(""); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowPassword(v => !v)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {/* Referral Code */}
          <View style={styles.field}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.label, { color: colors.text }]}>Referral Code <Text style={[styles.optional, { color: colors.mutedForeground }]}>(Optional)</Text></Text>
              {refAutoFilled && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#ECFDF5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Feather name="check" size={10} color="#059669" />
                  <Text style={{ fontSize: 10, fontFamily: "DMSans_600SemiBold", color: "#059669" }}>Auto-applied</Text>
                </View>
              )}
            </View>
            <View style={[styles.inputRow, { backgroundColor: refAutoFilled ? "#ECFDF5" : colors.secondary, borderColor: refAutoFilled ? "#A7F3D0" : colors.border }]}>
              <Feather name="gift" size={18} color={refAutoFilled ? "#059669" : colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: refAutoFilled ? "#059669" : colors.text }]}
                placeholder="Enter referral code"
                placeholderTextColor={colors.mutedForeground}
                value={referralCode}
                onChangeText={(v) => { setReferralCode(v.toUpperCase()); setRefAutoFilled(false); }}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {refAutoFilled && <Feather name="check-circle" size={16} color="#059669" />}
            </View>
          </View>

          {/* Terms & Conditions */}
          <Pressable style={styles.termsRow} onPress={() => setAgreedToTerms(v => !v)}>
            <View style={[styles.checkbox, { borderColor: agreedToTerms ? "#2563EB" : colors.border, backgroundColor: agreedToTerms ? "#2563EB" : "transparent" }]}>
              {agreedToTerms && <Feather name="check" size={12} color="#fff" />}
            </View>
            <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
              I agree to the{" "}
              <Text style={[styles.termsLink, { color: colors.primary }]} onPress={() => router.push("/policies")}>
                Terms & Conditions
              </Text>{" "}
              and{" "}
              <Text style={[styles.termsLink, { color: colors.primary }]} onPress={() => router.push("/policies")}>
                Privacy Policy
              </Text>
            </Text>
          </Pressable>

          <Btn3D onPress={handleRegister} loading={loading} label="Create Account" />

          <Pressable onPress={() => router.push("/(auth)/login")} style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>Already have an account? </Text>
            <Text style={[styles.switchLink, { color: colors.primary }]}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, flexGrow: 1, justifyContent: "center" },
  logoArea: { alignItems: "center", marginBottom: 28, gap: 8 },
  logoImg: { width: 120, height: 120 },
  tagline: { fontSize: 14, fontFamily: "DMSans_400Regular" },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 14 },
  cardTitle: { fontSize: 22, fontFamily: "DMSans_700Bold" },
  cardSub: { fontSize: 14, fontFamily: "DMSans_400Regular", marginTop: -6 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  errorText: { color: "#EF4444", fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 },
  field: { gap: 6 },
  label: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  optional: { fontSize: 12, fontFamily: "DMSans_400Regular" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 14, fontFamily: "DMSans_400Regular", padding: 0 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: -2 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  termsText: { flex: 1, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20 },
  termsLink: { fontFamily: "DMSans_600SemiBold" },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: -2 },
  switchText: { fontSize: 14, fontFamily: "DMSans_400Regular" },
  switchLink: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
});
