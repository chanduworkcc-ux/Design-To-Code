import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const ADMIN_EMAIL = "admin@integratedgmail.com";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>

      <View style={styles.content}>
        <View style={{ alignItems: "center", marginBottom: 32, gap: 10 }}>
          <Image source={require("@/assets/logo-nobg.png")} style={styles.logoImg} resizeMode="contain" />
          <View style={[styles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
            <Feather name="shield" size={32} color="#2563EB" />
          </View>
          <Text style={[styles.heading, { color: colors.text }]}>Password Recovery</Text>
          <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
            Contact our support team to reset your password
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoSection}>
            <Feather name="info" size={18} color="#2563EB" />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              For security reasons, password resets are handled manually by our admin team.
            </Text>
          </View>

          <View style={[styles.emailBox, { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" }]}>
            <Text style={[styles.emailLabel, { color: "#0369A1" }]}>Send your request to</Text>
            <Text style={styles.emailAddr}>{ADMIN_EMAIL}</Text>
            <Text style={[styles.emailHint, { color: "#0369A1" }]}>
              Include your registered email address in the message
            </Text>
          </View>

          <Pressable
            style={[styles.mailBtn, { backgroundColor: "#2563EB" }]}
            onPress={() => Linking.openURL(`mailto:${ADMIN_EMAIL}?subject=Password Reset Request&body=Hi, I would like to reset the password for my account. My registered email is: `)}
          >
            <Feather name="mail" size={17} color="#fff" />
            <Text style={styles.mailBtnText}>Open Mail App</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.backRow}>
            <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
            <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back to login</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  logoImg: { width: 110, height: 110 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 24, fontFamily: "DMSans_700Bold", textAlign: "center" },
  subheading: { fontSize: 14, fontFamily: "DMSans_400Regular", textAlign: "center" },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 20 },
  infoSection: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 14, fontFamily: "DMSans_400Regular", lineHeight: 22 },
  emailBox: { borderRadius: 14, borderWidth: 1, padding: 18, gap: 6, alignItems: "center" },
  emailLabel: { fontSize: 12, fontFamily: "DMSans_500Medium" },
  emailAddr: { fontSize: 17, fontFamily: "DMSans_700Bold", color: "#0F172A", letterSpacing: 0.2 },
  emailHint: { fontSize: 12, fontFamily: "DMSans_400Regular", textAlign: "center" },
  mailBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16 },
  mailBtnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  backRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  backText: { fontSize: 14, fontFamily: "DMSans_400Regular" },
});
