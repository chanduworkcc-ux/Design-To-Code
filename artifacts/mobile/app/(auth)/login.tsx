import { BASE_URL } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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


const { width: W, height: H } = Dimensions.get("window");

function Btn3D({ onPress, loading, label }: { onPress: () => void; loading: boolean; label: string }) {
  const scale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSequence(
      withTiming(0.95, { duration: 80, easing: Easing.out(Easing.cubic) }),
      withTiming(1,    { duration: 200, easing: Easing.out(Easing.back()) }),
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
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [suspended, setSuspended] = useState<{ until: string | null; reason: string } | null>(null);
  const [rejected, setRejected] = useState(false);
  const [multiAccountBanned, setMultiAccountBanned] = useState(false);
  const [portalClosed, setPortalClosed] = useState<{ active: boolean; message: string }>({ active: false, message: "" });
  const [portalLoading, setPortalLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/config/public`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.login_enabled === "false") {
          setPortalClosed({ active: true, message: d.login_closed_message || "Logins are temporarily paused. Please try again later." });
        }
        if (d?.auth_required === "false") {
          setAuthRequired(false);
        }
      })
      .catch(() => {})
      .finally(() => setPortalLoading(false));
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields"); return; }
    setLoading(true);
    setError("");
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      if (e.message === "pending_approval") { setPendingApproval(true); }
      else if (e.message?.startsWith("unverified:")) {
        const addr = e.message.split(":")[1];
        setUnverifiedEmail(addr || email.trim().toLowerCase());
      } else if (e.message === "rejected") { setRejected(true); }
      else if (e.message?.startsWith("suspended:")) {
        const [, until, ...rest] = e.message.split(":");
        setSuspended({ until: until || null, reason: rest.join(":").trim() || "Suspended by administrator" });
      } else if (e.message?.startsWith("Account banned:") && e.message?.includes("Multiple accounts")) {
        setMultiAccountBanned(true);
      } else { setError(e.message ?? "Login failed"); }
    } finally { setLoading(false); }
  }

  if (portalLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  if (portalClosed.active) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: colors.background }}>
        <View>
          <View style={{ alignItems: "center", gap: 20 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
              <Feather name="lock" size={36} color="#EF4444" />
            </View>
            <Text style={{ fontSize: 22, fontFamily: "DMSans_700Bold", color: colors.text, textAlign: "center" }}>
              Login Unavailable
            </Text>
            <View style={{ backgroundColor: "#FEF2F2", borderRadius: 14, padding: 18, borderWidth: 1, borderColor: "#FECACA" }}>
              <Text style={{ fontSize: 14, fontFamily: "DMSans_400Regular", color: "#7F1D1D", textAlign: "center", lineHeight: 22 }}>
                {portalClosed.message}
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontFamily: "DMSans_400Regular", color: colors.mutedForeground, textAlign: "center" }}>
              Contact support if you need immediate assistance.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (suspended) {
    const until = suspended.until ? new Date(suspended.until) : null;
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: colors.background }}>
        <View>
          <View style={{ alignItems: "center", gap: 20 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFFBEB", alignItems: "center", justifyContent: "center" }}>
              <Feather name="slash" size={36} color="#F59E0B" />
            </View>
            <Text style={{ fontSize: 22, fontFamily: "DMSans_700Bold", color: colors.text, textAlign: "center" }}>Account Suspended</Text>
            <View style={{ backgroundColor: "#FFFBEB", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#FDE68A", width: "100%" }}>
              <Text style={{ fontSize: 13, fontFamily: "DMSans_700Bold", color: "#B45309", marginBottom: 6 }}>Reason</Text>
              <Text style={{ fontSize: 14, fontFamily: "DMSans_400Regular", color: "#78350F", lineHeight: 20 }}>{suspended.reason}</Text>
              {until && (
                <Text style={{ fontSize: 12, fontFamily: "DMSans_500Medium", color: "#92400E", marginTop: 8 }}>
                  Until: {until.toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
                </Text>
              )}
            </View>
            <Pressable
              style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 24, paddingVertical: 12 }}
              onPress={() => setSuspended(null)}
            >
              <Text style={{ fontSize: 14, fontFamily: "DMSans_600SemiBold", color: colors.text }}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (unverifiedEmail) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: colors.background }}>
        <View>
          <View style={{ alignItems: "center", gap: 20 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" }}>
              <Feather name="mail" size={36} color="#10B981" />
            </View>
            <Text style={{ fontSize: 22, fontFamily: "DMSans_700Bold", color: colors.text, textAlign: "center" }}>Verify Your Email</Text>
            <Text style={{ fontSize: 14, fontFamily: "DMSans_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 22 }}>
              Please verify your email address before signing in. Check your inbox for the verification code we sent.
            </Text>
            <Pressable
              style={[styles.btn, { backgroundColor: "#2563EB", marginTop: 8, width: "100%" }]}
              onPress={() => router.push({ pathname: "/(auth)/verify-email", params: { email: unverifiedEmail } })}
            >
              <Text style={styles.btnText}>Enter Verification Code</Text>
            </Pressable>
            <Pressable
              style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 24, paddingVertical: 12, width: "100%", alignItems: "center" }}
              onPress={() => setUnverifiedEmail(null)}
            >
              <Text style={{ fontSize: 14, fontFamily: "DMSans_600SemiBold", color: colors.text }}>Back</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (multiAccountBanned) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: colors.background }}>
        <View style={{ alignItems: "center", gap: 20, width: "100%" }}>
          <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
            <Feather name="shield-off" size={40} color="#DC2626" />
          </View>
          <Text style={{ fontSize: 24, fontFamily: "DMSans_700Bold", color: colors.text, textAlign: "center" }}>
            Account Permanently Banned
          </Text>
          <View style={{ backgroundColor: "#FEF2F2", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#FECACA", width: "100%", gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <Feather name="alert-triangle" size={18} color="#DC2626" style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontSize: 14, fontFamily: "DMSans_600SemiBold", color: "#991B1B", lineHeight: 22 }}>
                Multiple Accounts Detected
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontFamily: "DMSans_400Regular", color: "#7F1D1D", lineHeight: 22 }}>
              You have been creating multiple accounts using the same IP address. This violates our Terms of Service.
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "DMSans_400Regular", color: "#7F1D1D", lineHeight: 22 }}>
              All accounts associated with your IP address have been permanently banned.
            </Text>
          </View>
          <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, width: "100%", gap: 8 }}>
            <Text style={{ fontSize: 13, fontFamily: "DMSans_700Bold", color: colors.text }}>
              Want to appeal this ban?
            </Text>
            <Text style={{ fontSize: 13, fontFamily: "DMSans_400Regular", color: colors.mutedForeground, lineHeight: 20 }}>
              Contact our support team and we will review your case.
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
              <Feather name="mail" size={15} color="#2563EB" />
              <Text style={{ fontSize: 14, fontFamily: "DMSans_600SemiBold", color: "#2563EB" }}>
                support@xylocart.com
              </Text>
            </View>
          </View>
          <Pressable
            style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 24, paddingVertical: 12, width: "100%", alignItems: "center" }}
            onPress={() => setMultiAccountBanned(false)}
          >
            <Text style={{ fontSize: 14, fontFamily: "DMSans_600SemiBold", color: colors.text }}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (rejected) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: colors.background }}>
        <View>
          <View style={{ alignItems: "center", gap: 20 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}>
              <Feather name="x-circle" size={36} color="#EF4444" />
            </View>
            <Text style={{ fontSize: 22, fontFamily: "DMSans_700Bold", color: colors.text, textAlign: "center" }}>Application Not Approved</Text>
            <View style={{ backgroundColor: "#FEF2F2", borderRadius: 14, padding: 18, borderWidth: 1, borderColor: "#FECACA", width: "100%" }}>
              <Text style={{ fontSize: 14, fontFamily: "DMSans_400Regular", color: "#7F1D1D", textAlign: "center", lineHeight: 22 }}>
                Your account registration was not approved. Please contact support if you believe this is a mistake.
              </Text>
            </View>
            <Pressable
              style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 24, paddingVertical: 12 }}
              onPress={() => setRejected(false)}
            >
              <Text style={{ fontSize: 14, fontFamily: "DMSans_600SemiBold", color: colors.text }}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (pendingApproval) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: colors.background }}>
        {/* 3D floating orbs even on pending screen */}

        <View>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#F5F3FF", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Feather name="clock" size={36} color="#8B5CF6" />
          </View>
          <Text style={{ fontSize: 22, fontFamily: "DMSans_700Bold", color: colors.text, textAlign: "center", marginBottom: 10 }}>
            Account Pending
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "DMSans_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 22, marginBottom: 28 }}>
            Your account is pending admin review.{"\n"}Please wait until an administrator approves your access.
          </Text>
          <View style={{ backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#FCD34D", marginBottom: 24 }}>
            <Text style={{ fontSize: 12, fontFamily: "DMSans_400Regular", color: "#92400E", textAlign: "center", lineHeight: 18 }}>
              This usually takes 24–48 hours. Contact support if you need faster access.
            </Text>
          </View>
          <Pressable
            style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 24, paddingVertical: 12 }}
            onPress={() => setPendingApproval(false)}
          >
            <Text style={{ fontSize: 14, fontFamily: "DMSans_600SemiBold", color: colors.text }}>Go Back</Text>
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
      {/* 3D Floating background orbs */}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo with float-in */}
        <View style={styles.logoArea}>
          <Image source={require("@/assets/logo-nobg.png")} style={styles.logoImg} resizeMode="contain" />
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Shop smarter, live better</Text>
        </View>

        {/* 3D tilt-in card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View style={[styles.inputRow, { backgroundColor: "transparent", borderColor: colors.border }]}>
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

          <Pressable onPress={() => router.push("/(auth)/forgot-password")} style={styles.switchRow}>
            <Text style={[styles.switchLink, { color: colors.primary }]}>Forgot password?</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/(auth)/register")} style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>Don't have an account? </Text>
            <Text style={[styles.switchLink, { color: colors.primary }]}>Create one</Text>
          </Pressable>

          {!authRequired && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                <Text style={{ fontSize: 12, fontFamily: "DMSans_400Regular", color: colors.mutedForeground }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              </View>
              <Pressable
                style={[styles.switchRow, { marginTop: 0 }]}
                onPress={() => router.replace("/(tabs)")}
              >
                <Text style={[styles.switchLink, { color: colors.mutedForeground }]}>Browse as Guest</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, flexGrow: 1, justifyContent: "center" },
  logoArea: { alignItems: "center", marginBottom: 32, gap: 8 },
  logoImg: { width: 140, height: 140 },
  tagline: { fontSize: 14, fontFamily: "DMSans_400Regular" },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  cardTitle: { fontSize: 22, fontFamily: "DMSans_700Bold" },
  cardSub: { fontSize: 14, fontFamily: "DMSans_400Regular", marginTop: -8 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  errorText: { color: "#EF4444", fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 },
  field: { gap: 6 },
  label: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 14, fontFamily: "DMSans_400Regular", padding: 0 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: -4 },
  switchText: { fontSize: 14, fontFamily: "DMSans_400Regular" },
  switchLink: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
});
