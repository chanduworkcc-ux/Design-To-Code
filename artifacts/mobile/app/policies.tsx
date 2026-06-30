import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const SECTIONS = [
  {
    id: "terms",
    title: "Terms & Conditions",
    icon: "file-text",
    content: [
      {
        heading: "Strict No-Return, No-Refund & No-Exchange Policy",
        body: "All sales are final. Under no circumstances will items be eligible for return, refund, or exchange once an order is placed. By completing a purchase, you explicitly acknowledge and accept this policy.",
      },
      {
        heading: "Limitation of Quantity",
        body: "Users are strictly restricted to purchasing a maximum quantity of one (1) unit of a single item per transaction. Duplicate or automated bulk ordering is strictly prohibited. Each item may only be purchased once per account.",
      },
      {
        heading: "Order Finality",
        body: "Once an order is confirmed, it cannot be modified, cancelled, or reversed. Please review your order details carefully before proceeding to payment.",
      },
      {
        heading: "Account Eligibility",
        body: "Users must be 18 years or older to make purchases. By registering, you confirm that the information provided is accurate and that you comply with applicable laws in your jurisdiction.",
      },
      {
        heading: "Platform Rights",
        body: "XyloCart reserves the right to suspend or permanently terminate any account found to be in violation of these terms, including but not limited to fraudulent activity, creation of multiple accounts, or device policy violations.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    icon: "shield",
    content: [
      {
        heading: "Data Collection",
        body: "We collect your name, email address, mobile number, shipping address, and device identifier solely for the purpose of account verification and order fulfillment. No data is sold to third parties.",
      },
      {
        heading: "Device & Session Data",
        body: "A unique device ID is captured at registration and login to enforce our one-device, one-account policy. This data is stored securely and used exclusively for security enforcement.",
      },
      {
        heading: "Transaction Records",
        body: "All transaction records are stored securely and retained for a minimum of 5 years as required by applicable financial regulations. These records may be accessed by authorized personnel for dispute resolution.",
      },
      {
        heading: "Data Security",
        body: "We implement industry-standard encryption (TLS/HTTPS) for all data transmitted to and from our servers. Passwords are stored as one-way bcrypt hashes and are never accessible in plaintext.",
      },
      {
        heading: "Your Rights",
        body: "You may request a copy of your personal data or ask for account deletion by contacting our support team. Account deletion will permanently remove your profile and transaction history.",
      },
    ],
  },
  {
    id: "general",
    title: "General Policies",
    icon: "info",
    content: [
      {
        heading: "One Device, One Account",
        body: "XyloCart enforces a strict one-device, one-account policy. Attempting to register or log into multiple accounts from the same device constitutes a violation and will result in permanent account suspension.",
      },
      {
        heading: "One Mobile Number, One Account",
        body: "Each mobile number may be associated with only one XyloCart account. Using the same number for multiple registrations is strictly prohibited.",
      },
      {
        heading: "Prohibited Activities",
        body: "Users must not engage in automated purchasing, account sharing, price manipulation, or any activity that undermines the platform's integrity. Violations result in immediate account termination.",
      },
      {
        heading: "Out-of-Stock Items",
        body: "Items marked as 'Out of Stock' cannot be added to cart or purchased. Stock availability is updated in real time as orders are placed. We do not accept pre-orders.",
      },
      {
        heading: "Pricing & Taxes",
        body: "All prices are displayed in Indian Rupees (₹) and are inclusive of applicable taxes unless stated otherwise. Additional charges such as delivery fees may apply and will be shown at checkout.",
      },
      {
        heading: "Governing Law",
        body: "These policies are governed by the laws of India. Any disputes arising from the use of this platform shall be subject to the exclusive jurisdiction of the courts of India.",
      },
    ],
  },
];

export default function PoliciesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string>("terms");
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Policies & Terms</Text>
        <Image source={require("@/assets/logo-nobg.png")} style={styles.headerLogo} resizeMode="contain" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          By using XyloCart, you agree to the following terms and policies. Please read them carefully.
        </Text>

        {SECTIONS.map((section) => {
          const isOpen = expanded === section.id;
          return (
            <View key={section.id} style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable
                style={styles.sectionHeader}
                onPress={() => setExpanded(isOpen ? "" : section.id)}
              >
                <View style={[styles.sectionIcon, { backgroundColor: colors.accent }]}>
                  <Feather name={section.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                <Feather
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>

              {isOpen && (
                <View style={[styles.sectionBody, { borderTopColor: colors.border }]}>
                  {section.content.map((item, i) => (
                    <View key={i} style={styles.policyItem}>
                      <Text style={[styles.policyHeading, { color: colors.text }]}>{item.heading}</Text>
                      <Text style={[styles.policyBody, { color: colors.mutedForeground }]}>{item.body}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={[styles.contactBox, { backgroundColor: colors.accent, borderColor: colors.border }]}>
          <Feather name="mail" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactTitle, { color: colors.text }]}>Questions about our policies?</Text>
            <Text style={[styles.contactSub, { color: colors.mutedForeground }]}>
              Contact our support team via the Help Center in your Profile.
            </Text>
          </View>
        </View>

        <Text style={[styles.lastUpdated, { color: colors.mutedForeground }]}>
          Last updated: June 2026
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "DMSans_700Bold" },
  headerLogo: { width: 32, height: 32 },
  scroll: { padding: 16, gap: 12 },
  intro: { fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20, marginBottom: 4 },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { flex: 1, fontSize: 15, fontFamily: "DMSans_700Bold" },
  sectionBody: { borderTopWidth: 1, padding: 14, gap: 14 },
  policyItem: { gap: 4 },
  policyHeading: { fontSize: 13, fontFamily: "DMSans_700Bold" },
  policyBody: { fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20 },
  contactBox: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 4 },
  contactTitle: { fontSize: 14, fontFamily: "DMSans_600SemiBold", marginBottom: 2 },
  contactSub: { fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 18 },
  lastUpdated: { fontSize: 11, fontFamily: "DMSans_400Regular", textAlign: "center", marginTop: 8 },
});
