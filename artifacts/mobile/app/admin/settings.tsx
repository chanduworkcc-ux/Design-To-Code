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

const CONFIG_META: Record<string, { label: string; description: string; type: "text" | "boolean" | "number" }> = {
  registration_open: { label: "Registration Open", description: "Allow new user sign-ups", type: "boolean" },
  maintenance_mode: { label: "Maintenance Mode", description: "Take the app offline for maintenance", type: "boolean" },
  cod_enabled: { label: "Cash on Delivery", description: "Allow COD payment method", type: "boolean" },
  razorpay_enabled: { label: "Razorpay Enabled", description: "Allow Razorpay payment method", type: "boolean" },
  coins_per_inr: { label: "Coins per ₹1", description: "How many coins equal 1 INR", type: "number" },
  referral_bonus_coins: { label: "Referral Bonus Coins", description: "Coins rewarded for successful referral", type: "number" },
  delivery_charge: { label: "Delivery Charge (₹)", description: "Standard delivery fee", type: "number" },
  free_delivery_threshold: { label: "Free Delivery Above (₹)", description: "Order value for free delivery", type: "number" },
  tax_rate: { label: "Tax Rate (%)", description: "Percentage tax applied to orders", type: "number" },
  service_charge_rate: { label: "Service Charge (%)", description: "Platform service fee", type: "number" },
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
          {/* Boolean toggles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Feature Toggles</Text>
            <View style={styles.card}>
              {Object.entries(CONFIG_META).filter(([, m]) => m.type === "boolean").map(([key, meta], i, arr) => {
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

          {/* Numeric configs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing & Fees</Text>
            <View style={styles.card}>
              {Object.entries(CONFIG_META).filter(([, m]) => m.type === "number" || m.type === "text").map(([key, meta], i, arr) => {
                return (
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
                        keyboardType={meta.type === "number" ? "numeric" : "default"}
                      />
                    </View>
                    {i < arr.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* Unknown keys */}
          {Object.keys(config).filter((k) => !CONFIG_META[k]).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Other Config</Text>
              <View style={styles.card}>
                {Object.keys(config).filter((k) => !CONFIG_META[k]).map((key, i, arr) => (
                  <React.Fragment key={key}>
                    <View style={styles.inputRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.configLabel}>{key}</Text>
                      </View>
                      <TextInput
                        style={styles.configInput}
                        value={edited[key] ?? ""}
                        onChangeText={(v) => setEdited((prev) => ({ ...prev, [key]: v }))}
                      />
                    </View>
                    {i < arr.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

          {hasChanges && (
            <Pressable style={[styles.saveBtnLarge, { opacity: saving ? 0.6 : 1 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnLargeText}>Save Changes</Text>}
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
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#6B7280", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#E5EAF8", overflow: "hidden" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  configLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0F1740" },
  configDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 2 },
  configInput: { width: 80, fontSize: 14, fontFamily: "Inter_700Bold", color: "#2563EB", textAlign: "right", backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 16 },
  saveBtnLarge: { backgroundColor: "#2563EB", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  saveBtnLargeText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
