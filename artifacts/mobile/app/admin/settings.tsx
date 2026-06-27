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
  stripe_enabled: { label: "Stripe Enabled", description: "Allow Stripe card payment method" },
  paypal_enabled: { label: "PayPal Enabled", description: "Allow PayPal express checkout" },
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

interface GatewayFieldMeta { label: string; description: string; secure?: boolean; required?: boolean; placeholder?: string }

const GATEWAY_CONFIGS: Record<string, { label: string; color: string; requiredKeys: string[]; fields: Record<string, GatewayFieldMeta> }> = {
  stripe: {
    label: "Stripe",
    color: "#635BFF",
    requiredKeys: ["stripe_secret_key", "stripe_publishable_key"],
    fields: {
      stripe_publishable_key: { label: "Publishable Key *", description: "Starts with pk_live_ or pk_test_", secure: false, required: true, placeholder: "pk_live_..." },
      stripe_secret_key: { label: "Secret Key *", description: "Starts with sk_live_ or sk_test_", secure: true, required: true, placeholder: "sk_live_..." },
      stripe_webhook_secret: { label: "Webhook Secret", description: "Optional — verify Stripe webhook events", secure: true, placeholder: "whsec_..." },
    },
  },
  paypal: {
    label: "PayPal",
    color: "#003087",
    requiredKeys: ["paypal_client_id", "paypal_secret_key"],
    fields: {
      paypal_client_id: { label: "Client ID *", description: "Your PayPal app Client ID", secure: false, required: true, placeholder: "AZ..." },
      paypal_secret_key: { label: "Secret Key *", description: "Your PayPal app Secret", secure: true, required: true, placeholder: "EC..." },
    },
  },
  razorpay: {
    label: "Razorpay",
    color: "#2563EB",
    requiredKeys: ["razorpay_key_id", "razorpay_key_secret"],
    fields: {
      razorpay_key_id: { label: "Key ID *", description: "Your Razorpay API Key ID", secure: false, required: true, placeholder: "rzp_live_..." },
      razorpay_key_secret: { label: "Key Secret *", description: "Your Razorpay API Key Secret", secure: true, required: true, placeholder: "..." },
      razorpay_webhook_secret: { label: "Webhook Secret", description: "Optional — verify Razorpay webhook events", secure: true, placeholder: "..." },
    },
  },
};

const GATEWAY_ERROR_MESSAGES: Record<string, string> = {
  stripe: "Please enter your Stripe Secret Key and Publishable Key. These are required to process card payments.",
  paypal: "Please enter your PayPal Client ID and Secret Key. These are required to accept PayPal express checkouts.",
  razorpay: "Please enter your Razorpay Key ID and Key Secret. These are required to accept domestic payments.",
};

const GATEWAY_ENABLED_KEYS: Record<string, string> = {
  stripe: "stripe_enabled",
  paypal: "paypal_enabled",
  razorpay: "razorpay_enabled",
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [gatewayErrors, setGatewayErrors] = useState<Record<string, string>>({});
  const [secureFields, setSecureFields] = useState<Record<string, boolean>>({});
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
      } else {
        Alert.alert("Error", "Failed to load settings. Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection Error", "Could not reach the server. Check your connection and try again.");
    }
    setLoading(false);
  }

  function validatePaymentGateways(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const [gateway, meta] of Object.entries(GATEWAY_CONFIGS)) {
      const enabledKey = GATEWAY_ENABLED_KEYS[gateway];
      const isEnabled = (edited[enabledKey] ?? "false") === "true";
      if (!isEnabled) continue;
      const missingRequired = meta.requiredKeys.some((k) => !edited[k] || edited[k].trim() === "");
      if (missingRequired) {
        errors[gateway] = GATEWAY_ERROR_MESSAGES[gateway];
      }
    }
    return errors;
  }

  async function handleSave() {
    // Option 2: compute inline errors
    const errors = validatePaymentGateways();
    setGatewayErrors(errors);

    // Option 1: show pop-up if any gateway has errors
    if (Object.keys(errors).length > 0) {
      Alert.alert(
        "Missing Payment Configuration!",
        "You cannot save your settings yet. Please fill in all required payment gateway details (marked with an asterisk *) to activate payments.",
        [{ text: "Acknowledge", style: "default" }]
      );
      return;
    }

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
        setShowBanner(false);
        Alert.alert("Saved", "Settings updated successfully.");
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert("Save Failed", errData?.error ?? "Could not save settings. Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection Error", "Could not reach the server. Check your connection and try again.");
    }
    setSaving(false);
  }

  const hasChanges = Object.keys(edited).some((k) => edited[k] !== config[k]);

  function toggleSecure(key: string) {
    setSecureFields((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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

      {/* Option 3: Warning Banner */}
      {showBanner && (
        <View style={styles.warningBanner}>
          <View style={styles.warningIconWrap}>
            <Feather name="alert-triangle" size={16} color="#92400E" />
          </View>
          <Text style={styles.warningText}>
            <Text style={styles.warningBold}>Action Required:</Text>
            {" "}Your payment gateways are currently inactive. Fill out the mandatory credentials below and click "Save" to go live.
          </Text>
          <Pressable onPress={() => setShowBanner(false)} style={styles.warningClose} hitSlop={8}>
            <Feather name="x" size={14} color="#92400E" />
          </Pressable>
        </View>
      )}

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
                const val = (edited[key] ?? "false") === "true";
                return (
                  <React.Fragment key={key}>
                    <View style={styles.toggleRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.configLabel}>{meta.label}</Text>
                        <Text style={styles.configDesc}>{meta.description}</Text>
                      </View>
                      <Switch
                        value={val}
                        onValueChange={(v) => {
                          setEdited((prev) => ({ ...prev, [key]: v ? "true" : "false" }));
                          // Clear gateway error when toggled off
                          const gw = Object.entries(GATEWAY_ENABLED_KEYS).find(([, ek]) => ek === key)?.[0];
                          if (gw && !v) setGatewayErrors((prev) => { const n = { ...prev }; delete n[gw]; return n; });
                        }}
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

          {/* Authentication Portal Override */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AUTHENTICATION PORTAL OVERRIDE</Text>
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.configLabel}>Login Portal Open</Text>
                  <Text style={styles.configDesc}>When OFF, all login attempts are blocked and users see a custom message</Text>
                </View>
                <Switch
                  value={(edited["login_enabled"] ?? "true") === "true"}
                  onValueChange={(v) => setEdited((prev) => ({ ...prev, login_enabled: v ? "true" : "false" }))}
                  trackColor={{ true: "#10B981", false: "#EF4444" }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.textInputRow}>
                <Text style={styles.configLabel}>Login Closed Message</Text>
                <Text style={styles.configDesc}>Message shown when login portal is disabled</Text>
                <TextInput
                  style={styles.textInput}
                  value={edited["login_closed_message"] ?? ""}
                  onChangeText={(v) => setEdited((prev) => ({ ...prev, login_closed_message: v }))}
                  placeholder="Logins are temporarily paused. Please try again later."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.configLabel}>Registration Portal Open</Text>
                  <Text style={styles.configDesc}>When OFF, new signups are blocked with a custom message</Text>
                </View>
                <Switch
                  value={(edited["registration_enabled"] ?? "true") === "true"}
                  onValueChange={(v) => setEdited((prev) => ({ ...prev, registration_enabled: v ? "true" : "false" }))}
                  trackColor={{ true: "#10B981", false: "#EF4444" }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.textInputRow}>
                <Text style={styles.configLabel}>Registration Closed Message</Text>
                <Text style={styles.configDesc}>Message shown when registration portal is disabled</Text>
                <TextInput
                  style={styles.textInput}
                  value={edited["registration_closed_message"] ?? ""}
                  onChangeText={(v) => setEdited((prev) => ({ ...prev, registration_closed_message: v }))}
                  placeholder="New registrations are currently closed. Please check back soon."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>
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

          {/* Payment Gateways */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAYMENT GATEWAYS</Text>
            <View style={styles.gatewayStack}>
              {Object.entries(GATEWAY_CONFIGS).map(([gateway, meta]) => {
                const enabledKey = GATEWAY_ENABLED_KEYS[gateway];
                const isEnabled = (edited[enabledKey] ?? "false") === "true";
                const hasError = !!gatewayErrors[gateway];
                return (
                  <View key={gateway} style={[styles.gatewayCard, hasError && styles.gatewayCardError]}>
                    {/* Gateway header row */}
                    <View style={[styles.gatewayHeaderRow, { borderLeftColor: meta.color }]}>
                      <Text style={[styles.gatewayName, { color: meta.color }]}>{meta.label}</Text>
                      <Switch
                        value={isEnabled}
                        onValueChange={(v) => {
                          setEdited((prev) => ({ ...prev, [enabledKey]: v ? "true" : "false" }));
                          if (!v) setGatewayErrors((prev) => { const n = { ...prev }; delete n[gateway]; return n; });
                        }}
                        trackColor={{ true: meta.color, false: "#D1D5DB" }}
                        thumbColor="#fff"
                      />
                    </View>

                    {/* Fields (only when enabled) */}
                    {isEnabled && (
                      <View style={styles.gatewayFields}>
                        {Object.entries(meta.fields).map(([key, fieldMeta], i, arr) => {
                          const isSecureVisible = secureFields[key];
                          return (
                            <React.Fragment key={key}>
                              <View style={styles.textInputRow}>
                                <Text style={styles.configLabel}>{fieldMeta.label}</Text>
                                <Text style={styles.configDesc}>{fieldMeta.description}</Text>
                                <View style={styles.secureRow}>
                                  <TextInput
                                    style={[styles.textInput, { flex: 1 }]}
                                    value={edited[key] ?? ""}
                                    onChangeText={(v) => {
                                      setEdited((prev) => ({ ...prev, [key]: v }));
                                      // Clear error for this gateway when user types
                                      if (gatewayErrors[gateway]) {
                                        setGatewayErrors((prev) => { const n = { ...prev }; delete n[gateway]; return n; });
                                      }
                                    }}
                                    placeholder={fieldMeta.placeholder ?? `Enter ${fieldMeta.label}`}
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry={fieldMeta.secure && !isSecureVisible}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                  />
                                  {fieldMeta.secure && (
                                    <Pressable onPress={() => toggleSecure(key)} style={styles.eyeBtn} hitSlop={8}>
                                      <Feather name={isSecureVisible ? "eye-off" : "eye"} size={16} color="#6B7280" />
                                    </Pressable>
                                  )}
                                </View>
                              </View>
                              {i < arr.length - 1 && <View style={styles.divider} />}
                            </React.Fragment>
                          );
                        })}

                        {/* Option 2: Inline error message */}
                        {hasError && (
                          <View style={styles.inlineError}>
                            <Feather name="alert-circle" size={14} color="#DC2626" style={{ marginTop: 1 }} />
                            <Text style={styles.inlineErrorText}>{gatewayErrors[gateway]}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
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

  // Option 3: Warning Banner
  warningBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#FFFBEB", borderBottomWidth: 1, borderBottomColor: "#FCD34D", paddingHorizontal: 16, paddingVertical: 12 },
  warningIconWrap: { marginTop: 1 },
  warningText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#78350F", lineHeight: 18 },
  warningBold: { fontFamily: "Inter_700Bold" },
  warningClose: { padding: 2 },

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
  divider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 16 },
  saveBtnLarge: { backgroundColor: "#2563EB", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  saveBtnLargeText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },

  // Gateway cards
  gatewayStack: { gap: 12 },
  gatewayCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#E5EAF8", overflow: "hidden" },
  gatewayCardError: { borderColor: "#FECACA", backgroundColor: "#FFF5F5" },
  gatewayHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderLeftWidth: 4, borderLeftColor: "#E5EAF8" },
  gatewayName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  gatewayFields: { borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  secureRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  eyeBtn: { width: 36, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFF", borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8" },

  // Option 2: Inline errors
  inlineError: { flexDirection: "row", alignItems: "flex-start", gap: 8, margin: 16, marginTop: 0, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#FECACA" },
  inlineErrorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#DC2626", lineHeight: 18 },
});
