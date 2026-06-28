import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function AdminLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, logout, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      router.replace("/admin/dashboard");
    }
  }, [user, authLoading]);

  function validate() {
    let valid = true;
    setEmailError("");
    setPasswordError("");
    if (!email.trim()) {
      setEmailError("Email is required");
      valid = false;
    } else if (!email.includes("@")) {
      setEmailError("Enter a valid email");
      valid = false;
    }
    if (!password.trim()) {
      setPasswordError("Password is required");
      valid = false;
    }
    return valid;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      if (user.role !== "admin") {
        // Logged in but not an admin — logout and show error
        await logout();
        setPasswordError("Access denied. This account does not have admin privileges.");
        setLoading(false);
        return;
      }
      router.replace("/admin/dashboard");
    } catch (err: any) {
      setPasswordError(err.message ?? "Invalid credentials. Please try again.");
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <Pressable
          style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>

        {/* Logo / Header */}
        <View style={styles.logoArea}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Feather name="shield" size={32} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>XyloCart</Text>
          <Text style={[styles.adminLabel, { color: colors.mutedForeground }]}>Admin Console</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Admin Sign In</Text>
          <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
            Access the admin panel with your administrator credentials
          </Text>

          {/* Email Field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.secondary,
                  borderColor: emailError && emailError.trim() ? "#EF4444" : colors.border,
                },
              ]}
            >
              <Feather name="mail" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="admin@xyloscart.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={(t) => { setEmail(t); setEmailError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {!!emailError && emailError.trim() && (
              <Text style={styles.errorText}>{emailError}</Text>
            )}
          </View>

          {/* Password Field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.secondary,
                  borderColor: passwordError ? "#EF4444" : colors.border,
                },
              ]}
            >
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={(t) => { setPassword(t); setPasswordError(""); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword((v) => !v)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {!!passwordError && (
              <Text style={styles.errorText}>{passwordError}</Text>
            )}
          </View>

          {/* Login Button */}
          <Pressable
            style={[styles.loginBtn, { backgroundColor: loading ? colors.mutedForeground : colors.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="log-in" size={18} color="#fff" />
                <Text style={styles.loginBtnText}>Sign In as Admin</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          This area is restricted to authorized administrators only.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, flexGrow: 1 },
  backBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  logoArea: { alignItems: "center", marginBottom: 28, gap: 8 },
  logoCircle: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  appName: { fontSize: 26, fontFamily: "DMSans_700Bold" },
  adminLabel: { fontSize: 14, fontFamily: "DMSans_500Medium" },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  cardTitle: { fontSize: 22, fontFamily: "DMSans_700Bold" },
  cardSubtitle: { fontSize: 13, fontFamily: "DMSans_400Regular", marginTop: -8 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 14, fontFamily: "DMSans_400Regular", padding: 0 },
  errorText: { color: "#EF4444", fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 },
  loginBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16, marginTop: 4 },
  loginBtnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  hint: { fontSize: 12, fontFamily: "DMSans_400Regular", textAlign: "center", marginTop: 20, paddingHorizontal: 16 },
});
