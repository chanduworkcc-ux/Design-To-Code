import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

interface ConfigItem {
  key: string;
  value: string;
  description: string | null;
}

const BOOLEAN_CONFIGS: Record<string, { label: string; description: string }> = {
  registration_open: { label: "Registration Open", description: "Allow new user sign-ups" },
  maintenance_mode: { label: "Maintenance Mode", description: "Take the app offline for maintenance" },
  cod_enabled: { label: "Cash on Delivery", description: "Allow COD payment method" },
  razorpay_enabled: { label: "Razorpay Enabled", description: "Allow Razorpay payment method" },
  announcement_enabled: { label: "Announcement Bar", description: "Show announcement banner on home screen" },
};

const NUMERIC_CONFIGS: Record<string, { label: string; description: string }> = {
  coins_per_inr: { label: "Coins per ₹1", description: "How many coins equal 1 INR" },
  referral_bonus_coins: { label: "Referral Bonus Coins", description: "Coins rewarded for successful referral" },
  delivery_charge: { label: "Delivery Charge (₹)", description: "Standard delivery fee" },
  free_delivery_threshold: { label: "Free Delivery Above (₹)", description: "Order value for free delivery" },
  tax_rate: { label: "Tax Rate (%)", description: "Percentage tax applied to orders" },
  service_charge_rate: { label: "Service Charge (%)", description: "Platform service fee" },
};

const TEXT_CONFIGS: Record<string, { label: string; description: string; placeholder?: string }> = {
  approval_mode: { label: "Approval Mode", description: "automatic = instant access, manual = admin approves each signup", placeholder: "automatic" },
  announcement_text: { label: "Announcement Text", description: "Text shown in the home announcement bar", placeholder: "🎉 Welcome to XyloCart! Free delivery on all orders today." },
  announcement_color: { label: "Announcement Color", description: "Hex color for the announcement bar (e.g. #2563EB)", placeholder: "#2563EB" },
};

const PAYMENT_CONFIGS: Record<string, { label: string; description: string; secure?: boolean }> = {
  razorpay_key_id: { label: "Razorpay Key ID", description: "Your Razorpay API Key ID" },
  razorpay_key_secret: { label: "Razorpay Key Secret", description: "Your Razorpay API Key Secret", secure: true },
  paytm_merchant_id: { label: "Paytm Merchant ID", description: "Your Paytm Merchant ID" },
  paytm_merchant_key: { label: "Paytm Merchant Key", description: "Your Paytm Merchant Key", secure: true },
  paytm_environment: { label: "Paytm Environment", description: "staging or production", },
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => { fetchConfig(); }, []);

  async function fetchConfig() {
    try {
      const res = await apiRequest("/admin/config");
      if (res.ok) {
        const d = await res.json();
        const map: Record<string, string> = {};
        for (const item of (d.config as ConfigItem[])) { map[item.key] = item.value; }
        setConfig(map);
        setEdited(map);
      }
    } catch {}
    setLoading(false);
  }

  async function handleSave() {
    const changes: Record<string, string> = {};
    for (const [k, v] of Object.entries(edited)) {
      if (v !== config[k]) changes[k] = v;
    }
    if (Object.keys(changes).length === 0) {
      Alert.alert("No Changes", "Nothing to save.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiRequest("/admin/config", { method: "PUT", body: JSON.stringify(changes) });
      if (res.ok) {
        const d = await res.json();
        const map: Record<string, string> = {};
        for (const item of (d.config as ConfigItem[])) { map[item.key] = item.value; }
        setConfig(map);
        setEdited(map);
        Alert.alert("Saved", "Settings updated successfully.");
      }
    } catch {}
    setSaving(false);
  }

  const hasChanges = Object.keys(edited).some((k) => edited[k] !== config[k]);

  return (
    <View style={[styles.root, { backgroundColor: "#F8FAFF" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F1740" />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        {hasChanges && (
          <Pressable
            style={[styles.saveBtn, { opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

          {/* Feature Toggles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FEATURE TOGGLES</Text>
            <View style={styles.card}>
              {Object.entries(BOOLEAN_CONFIGS).map(([key, meta], i, arr) => {
                const val = (edited[key] ?? "true") === "true";
                return (
                  <React.Fragment key={key}>
                    <View style={styles.toggleRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.configLabel}>{meta.label}</Text>
                        <Text style={styles.configDesc}>{meta.description}</Text>
                      </View>
                      <Switch
                        value={val}
                        onValueChange={(v) => setEdited((prev) => ({ ...prev, [key]: v ? "true" : "false" }))}
                        trackColor={{ true: "#2563EB", false: "#D1D5DB" }}
                        thumbColor="#fff"
                      />
                    </View>
                    {i < arr.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* Text / Behaviour */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BEHAVIOUR & CONTENT</Text>
            <View style={styles.card}>
              {Object.entries(TEXT_CONFIGS).map(([key, meta], i, arr) => (
                <React.Fragment key={key}>
                  <View style={styles.textInputRow}>
                    <Text style={styles.configLabel}>{meta.label}</Text>
                    <Text style={styles.configDesc}>{meta.description}</Text>
                    <TextInput
                      style={styles.textInput}
                      value={edited[key] ?? ""}
                      onChangeText={(v) => setEdited((prev) => ({ ...prev, [key]: v }))}
                      placeholder={meta.placeholder ?? ""}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Pricing & Fees */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PRICING & FEES</Text>
            <View style={styles.card}>
              {Object.entries(NUMERIC_CONFIGS).map(([key, meta], i, arr) => (
                <React.Fragment key={key}>
                  <View style={styles.inputRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.configLabel}>{meta.label}</Text>
                      <Text style={styles.configDesc}>{meta.description}</Text>
                    </View>
                    <TextInput
                      style={styles.configInput}
                      value={edited[key] ?? ""}
                      onChangeText={(v) => setEdited((prev) => ({ ...prev, [key]: v }))}
                      keyboardType="numeric"
                    />
                  </View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Payment Gateway */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAYMENT GATEWAYS</Text>
            <View style={[styles.card, { gap: 0 }]}>
              <View style={styles.gatewayHeader}>
                <Text style={styles.gatewayLabel}>Razorpay</Text>
              </View>
              {["razorpay_key_id", "razorpay_key_secret"].map((key, i) => {
                const meta = PAYMENT_CONFIGS[key];
                return (
                  <React.Fragment key={key}>
                    <View style={styles.textInputRow}>
                      <Text style={styles.configLabel}>{meta.label}</Text>
                      <TextInput
                        style={styles.textInput}
                        value={edited[key] ?? ""}
                        onChangeText={(v) => setEdited((prev) => ({ ...prev, [key]: v }))}
                        placeholder={`Enter ${meta.label}`}
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!!meta.secure}
                      />
                    </View>
                    {i === 0 && <View style={styles.divider} />}
                  </React.Fragment>
                );
              })}
              <View style={[styles.gatewayHeader, { borderTopWidth: 1, borderTopColor: "#F3F4F6" }]}>
                <Text style={styles.gatewayLabel}>Paytm</Text>
              </View>
              {["paytm_merchant_id", "paytm_merchant_key", "paytm_environment"].map((key, i, arr) => {
                const meta = PAYMENT_CONFIGS[key];
                return (
                  <React.Fragment key={key}>
                    <View style={styles.textInputRow}>
                      <Text style={styles.configLabel}>{meta.label}</Text>
                      <Text style={styles.configDesc}>{meta.description}</Text>
                      <TextInput
                        style={styles.textInput}
                        value={edited[key] ?? ""}
                        onChangeText={(v) => setEdited((prev) => ({ ...prev, [key]: v }))}
                        placeholder={`Enter ${meta.label}`}
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!!meta.secure}
                      />
                    </View>
                    {i < arr.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {hasChanges && (
            <Pressable style={[styles.saveBtnLarge, { opacity: saving ? 0.6 : 1 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnLargeText}>Save All Changes</Text>}
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5EAF8", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F1740" },
  saveBtn: { backgroundColor: "#2563EB", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#6B7280", fontFamily: "Inter_500Medium", fontSize: 14 },
  content: { padding: 16, gap: 0 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#6B7280", letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#E5EAF8", overflow: "hidden" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  textInputRow: { padding: 16, gap: 4 },
  configLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0F1740" },
  configDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 2 },
  configInput: { width: 80, fontSize: 14, fontFamily: "Inter_700Bold", color: "#2563EB", textAlign: "right", backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  textInput: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#0F1740", backgroundColor: "#F8FAFF", borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  gatewayHeader: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#F8FAFF" },
  gatewayLabel: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#2563EB" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 16 },
  saveBtnLarge: { backgroundColor: "#2563EB", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  saveBtnLargeText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
