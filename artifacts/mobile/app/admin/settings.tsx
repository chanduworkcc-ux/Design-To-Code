import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

interface ConfigItem {
  key: string;
  value: string;
  description: string | null;
}

const BOOLEAN_CONFIGS: Record<string, { label: string; description: string }> = {
  registration_open: { label: "Registration Open", description: "Allow new user sign-ups" },
  maintenance_mode: { label: "Maintenance Mode", description: "Take the app offline for maintenance" },
  auth_required: { label: "Login Required to Browse", description: "Force users to log in before browsing the shop (guest mode off)" },
  cod_enabled: { label: "Cash on Delivery", description: "Allow COD payment method" },
  announcement_enabled: { label: "Announcement Bar", description: "Show announcement banner on home screen" },
  no_returns: { label: "No Returns", description: "Show 'No Returns' policy badge on product pages" },
  no_refunds: { label: "No Refunds", description: "Show 'No Refunds' policy badge on product pages" },
  no_exchanges: { label: "No Exchanges", description: "Show 'No Exchanges' policy badge on product pages" },
};

const NUMERIC_CONFIGS: Record<string, { label: string; description: string }> = {
  coins_per_inr: { label: "Coins per ₹1", description: "How many coins equal 1 INR" },
  referral_coins: { label: "Referral Bonus Coins", description: "Coins rewarded for successful referral" },
  delivery_charge: { label: "Delivery Charge (₹)", description: "Standard delivery fee added to every order" },
  tax_percent: { label: "Tax / GST (%)", description: "Percentage tax applied to the order subtotal" },
  service_charge: { label: "Service Charge (₹)", description: "Fixed platform service fee per order" },
  maintenance_charge: { label: "Maintenance Charge (₹)", description: "Fixed maintenance fee per order" },
};

const TEXT_CONFIGS: Record<string, { label: string; description: string; placeholder?: string; multiline?: boolean }> = {
  approval_mode: { label: "Approval Mode", description: "automatic = instant access, manual = admin approves each signup", placeholder: "automatic" },
  announcement_text: { label: "Announcement Text", description: "Text shown in the home announcement bar", placeholder: "🎉 Welcome to XyloCart! Free delivery on all orders today." },
  announcement_color: { label: "Announcement Color", description: "Hex color for the announcement bar (e.g. #2563EB)", placeholder: "#2563EB" },
  delivery_info: { label: "Delivery Info", description: "Short delivery estimate shown on product pages", placeholder: "Delivered in 5–10 business days" },
  product_disclaimer: { label: "Product Disclaimer", description: "Disclaimer text shown at the bottom of every product page", placeholder: "This product will be delivered in 5–10 days.", multiline: true },
  maintenance_message: { label: "Maintenance Message", description: "Message shown to users when maintenance mode is active", placeholder: "We are performing scheduled maintenance. Please check back soon.", multiline: true },
};

const APP_VERSION_CONFIGS: Record<string, { label: string; description: string; placeholder?: string }> = {
  app_version: { label: "Current App Version", description: "Live platform version displayed to users (e.g. 1.0, 1.1, 2.0)", placeholder: "1.0" },
  rate_app_url: { label: "Rate Our App URL", description: "App Store or Play Store URL shown when users tap 'Rate the App'", placeholder: "https://play.google.com/store/apps/details?id=com.yourapp" },
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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const [gatewayErrors, setGatewayErrors] = useState<Record<string, string>>({});
  const [secureFields, setSecureFields] = useState<Record<string, boolean>>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUrlNoBg, setLogoUrlNoBg] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoNoBgUploading, setLogoNoBgUploading] = useState(false);
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  useEffect(() => { fetchConfig(); fetchLogo(); }, []);

  async function fetchLogo() {
    try {
      const res = await fetch(`${BASE_URL}/config/public`);
      if (res.ok) {
        const d = await res.json();
        if (d.logo_url) setLogoUrl(d.logo_url);
        if (d.logo_url_without_bg) setLogoUrlNoBg(d.logo_url_without_bg);
      }
    } catch {}
  }

  async function uploadLogoVariant(variant: "default" | "no_bg") {
    const isNoBg = variant === "no_bg";
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library to upload a logo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 7],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const fileName = asset.fileName ?? `logo-${Date.now()}.png`;
    const fileSize = asset.fileSize ?? 500000;
    const mimeType = asset.mimeType ?? "image/png";

    if (isNoBg) setLogoNoBgUploading(true); else setLogoUploading(true);
    try {
      const urlRes = await apiRequest("/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({ name: fileName, size: fileSize, contentType: mimeType }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      const blob = await (await fetch(asset.uri)).blob();
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": mimeType },
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const saveRes = await apiRequest("/storage/uploads/logo", {
        method: "POST",
        body: JSON.stringify({ objectPath, variant: isNoBg ? "no_bg" : "default" }),
      });
      if (!saveRes.ok) throw new Error("Failed to save logo URL");
      const { logoUrl: newUrl } = await saveRes.json();
      if (isNoBg) setLogoUrlNoBg(newUrl); else setLogoUrl(newUrl);
      Alert.alert("Success", `${isNoBg ? "Transparent" : "Standard"} logo updated successfully.`);
    } catch (e: any) {
      Alert.alert("Upload Failed", e.message ?? "Could not upload logo. Please try again.");
    }
    if (isNoBg) setLogoNoBgUploading(false); else setLogoUploading(false);
  }

  function uploadLogo() { return uploadLogoVariant("default"); }

  async function fetchConfig() {
    try {
      const res = await apiRequest("/admin/config");
      if (res.ok) {
        const d = await res.json();
        const map: Record<string, string> = d.config as Record<string, string>;
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
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const errors = validatePaymentGateways();
    setGatewayErrors(errors);

    const changes: Record<string, string> = {};
    for (const [k, v] of Object.entries(edited)) {
      if (v !== config[k]) changes[k] = v;
    }

    if (Object.keys(changes).length === 0) {
      savingRef.current = false;
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      return;
    }

    try {
      const res = await apiRequest("/admin/config", { method: "PUT", body: JSON.stringify(changes) });
      if (res.ok) {
        const d = await res.json();
        const returnedMap: Record<string, string> = d.config as Record<string, string>;
        setConfig(returnedMap);
        setEdited((prev) => ({ ...prev, ...returnedMap }));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        const errData = await res.json().catch(() => ({}));
        setSaveError(errData?.error ?? "Could not save. Please try again.");
        setTimeout(() => setSaveError(null), 4000);
      }
    } catch {
      setSaveError("No connection. Please check your network.");
      setTimeout(() => setSaveError(null), 4000);
    }

    setSaving(false);
    savingRef.current = false;
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
        {saveSuccess && (
          <View style={styles.savedBadge}>
            <Feather name="check" size={13} color="#fff" />
            <Text style={styles.savedBadgeText}>Saved</Text>
          </View>
        )}
        {saveError && (
          <View style={styles.errorBadge}>
            <Feather name="alert-circle" size={13} color="#fff" />
            <Text style={styles.errorBadgeText}>Error</Text>
          </View>
        )}
        {(hasChanges || saving) && !saveSuccess && (
          <Pressable
            style={[styles.saveBtn, { opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.saveBtnText}>Save</Text>}
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

          {/* App Logo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>APP BRANDING</Text>
            <View style={styles.card}>
              {/* Logo with background */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <View style={[styles.logoPreview, { backgroundColor: "#F3F4F6" }]}>
                  {logoUrl
                    ? <Image source={{ uri: logoUrl }} style={styles.logoImg} resizeMode="contain" />
                    : <Feather name="image" size={28} color="#9CA3AF" />
                  }
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.configLabel}>Logo (With Background)</Text>
                  <Text style={styles.configDesc}>
                    {logoUrl ? "Active — tap to replace" : "No logo set — using default"}
                  </Text>
                </View>
                <Pressable
                  style={[styles.uploadBtn, { opacity: logoUploading ? 0.6 : 1 }]}
                  onPress={() => uploadLogoVariant("default")}
                  disabled={logoUploading}
                >
                  {logoUploading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Feather name="upload" size={14} color="#fff" /><Text style={styles.uploadBtnText}>Upload</Text></>
                  }
                </Pressable>
              </View>
              <View style={{ height: 1, backgroundColor: "#E5EAF8", marginBottom: 14 }} />
              {/* Logo without background */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={[styles.logoPreview, { backgroundColor: "#111827" }]}>
                  {logoUrlNoBg
                    ? <Image source={{ uri: logoUrlNoBg }} style={styles.logoImg} resizeMode="contain" />
                    : <Feather name="image" size={28} color="#6B7280" />
                  }
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.configLabel}>Logo (Transparent / No BG)</Text>
                  <Text style={styles.configDesc}>
                    {logoUrlNoBg ? "Active — tap to replace" : "Not set — upload PNG with transparency"}
                  </Text>
                </View>
                <Pressable
                  style={[styles.uploadBtn, { opacity: logoNoBgUploading ? 0.6 : 1 }]}
                  onPress={() => uploadLogoVariant("no_bg")}
                  disabled={logoNoBgUploading}
                >
                  {logoNoBgUploading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Feather name="upload" size={14} color="#fff" /><Text style={styles.uploadBtnText}>Upload</Text></>
                  }
                </Pressable>
              </View>
            </View>
          </View>

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
                      style={[styles.textInput, meta.multiline && { minHeight: 72, textAlignVertical: "top" }]}
                      value={edited[key] ?? ""}
                      onChangeText={(v) => setEdited((prev) => ({ ...prev, [key]: v }))}
                      placeholder={meta.placeholder ?? ""}
                      placeholderTextColor="#9CA3AF"
                      multiline={!!meta.multiline}
                      numberOfLines={meta.multiline ? 3 : 1}
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
                      onChangeText={(v) => {
                        // Allow digits and a single decimal point only; never silently discard "0"
                        const sanitised = v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                        setEdited((prev) => ({ ...prev, [key]: sanitised }));
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
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

          {/* Active Payment Gateway */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACTIVE PAYMENT GATEWAY</Text>
            <Text style={[styles.configDesc, { marginBottom: 10, marginLeft: 4 }]}>
              Only the selected gateway will be shown to customers at checkout.
            </Text>
            <View style={styles.card}>
              {(["cod", "razorpay", "phonepe"] as const).map((gw, i, arr) => {
                const labels: Record<string, string> = { cod: "Cash on Delivery", razorpay: "Razorpay", phonepe: "PhonePe" };
                const descs: Record<string, string> = { cod: "No payment required — customer pays on delivery", razorpay: "Online payment via Razorpay", phonepe: "UPI payment via PhonePe" };
                const isActive = (edited["active_payment_gateway"] ?? "cod") === gw;
                return (
                  <React.Fragment key={gw}>
                    <Pressable
                      style={styles.toggleRow}
                      onPress={() => setEdited((prev) => ({ ...prev, active_payment_gateway: gw }))}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.configLabel}>{labels[gw]}</Text>
                        <Text style={styles.configDesc}>{descs[gw]}</Text>
                      </View>
                      <View style={[styles.gwRadio, { borderColor: isActive ? "#2563EB" : "#D1D5DB" }]}>
                        {isActive && <View style={styles.gwRadioFill} />}
                      </View>
                    </Pressable>
                    {i < arr.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* App Version Control */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>APP VERSION CONTROL</Text>
            <Text style={[styles.configDesc, { marginBottom: 10, marginLeft: 4 }]}>
              Manage the live platform version and the Rate Our App redirect destination.
            </Text>
            <View style={styles.card}>
              {Object.entries(APP_VERSION_CONFIGS).map(([key, meta], i, arr) => (
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
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType={key === "rate_app_url" ? "url" : "default"}
                    />
                  </View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Forced App Update */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FORCED APP UPDATE</Text>
            <Text style={[styles.configDesc, { marginBottom: 10, marginLeft: 4 }]}>
              When enabled, all users will see a mandatory update screen instead of the app until they update.
            </Text>
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.configLabel}>Force Update Active</Text>
                  <Text style={styles.configDesc}>Show mandatory update screen to all users</Text>
                </View>
                <Switch
                  value={(edited["force_update"] ?? "false") === "true"}
                  onValueChange={(v) => setEdited((prev) => ({ ...prev, force_update: v ? "true" : "false" }))}
                  trackColor={{ true: "#EF4444", false: "#D1D5DB" }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.textInputRow}>
                <Text style={styles.configLabel}>Required Version</Text>
                <Text style={styles.configDesc}>Version number shown on the update screen</Text>
                <TextInput
                  style={styles.textInput}
                  value={edited["update_version"] ?? ""}
                  onChangeText={(v) => setEdited((prev) => ({ ...prev, update_version: v }))}
                  placeholder="2.0.0"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.textInputRow}>
                <Text style={styles.configLabel}>Download URL</Text>
                <Text style={styles.configDesc}>Link to the new app version (App Store, Play Store, or APK)</Text>
                <TextInput
                  style={styles.textInput}
                  value={edited["update_url"] ?? ""}
                  onChangeText={(v) => setEdited((prev) => ({ ...prev, update_url: v }))}
                  placeholder="https://play.google.com/store/apps/..."
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.textInputRow}>
                <Text style={styles.configLabel}>Release Notes</Text>
                <Text style={styles.configDesc}>What's new in this version (shown to users on the update screen)</Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 80, textAlignVertical: "top" }]}
                  value={edited["update_notes"] ?? ""}
                  onChangeText={(v) => setEdited((prev) => ({ ...prev, update_notes: v }))}
                  placeholder="Bug fixes and performance improvements&#10;New checkout flow&#10;Enhanced order tracking"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          </View>

          {/* SMS Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SMS NOTIFICATIONS (TWILIO)</Text>
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.configLabel}>Enable SMS Notifications</Text>
                  <Text style={styles.configDesc}>Send order updates directly to customers via SMS</Text>
                </View>
                <Switch
                  value={(edited["sms_enabled"] ?? "false") === "true"}
                  onValueChange={(v) => setEdited((prev) => ({ ...prev, sms_enabled: v ? "true" : "false" }))}
                  trackColor={{ true: "#2563EB", false: "#D1D5DB" }}
                  thumbColor="#fff"
                />
              </View>
              {(edited["sms_enabled"] ?? "false") === "true" && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.textInputRow}>
                    <Text style={styles.configLabel}>Twilio Account SID *</Text>
                    <Text style={styles.configDesc}>Your Twilio Account SID from the console</Text>
                    <TextInput
                      style={styles.textInput}
                      value={edited["twilio_account_sid"] ?? ""}
                      onChangeText={(v) => setEdited((prev) => ({ ...prev, twilio_account_sid: v }))}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.textInputRow}>
                    <Text style={styles.configLabel}>Twilio Auth Token *</Text>
                    <Text style={styles.configDesc}>Your Twilio Auth Token (keep this secret)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={edited["twilio_auth_token"] ?? ""}
                      onChangeText={(v) => setEdited((prev) => ({ ...prev, twilio_auth_token: v }))}
                      placeholder="••••••••••••••••••••••••••••••••"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.textInputRow}>
                    <Text style={styles.configLabel}>Twilio Phone Number *</Text>
                    <Text style={styles.configDesc}>Your Twilio sender number in E.164 format (e.g. +1415XXXXXXX)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={edited["twilio_phone_number"] ?? ""}
                      onChangeText={(v) => setEdited((prev) => ({ ...prev, twilio_phone_number: v }))}
                      placeholder="+14155552671"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                    />
                  </View>
                </>
              )}
            </View>
          </View>

          {saveSuccess && (
            <View style={[styles.saveBtnLarge, { backgroundColor: "#16A34A" }]}>
              <Feather name="check-circle" size={18} color="#fff" />
              <Text style={styles.saveBtnLargeText}>  Settings Saved!</Text>
            </View>
          )}
          {saveError && (
            <View style={[styles.saveBtnLarge, { backgroundColor: "#DC2626", flexDirection: "row", gap: 8 }]}>
              <Feather name="alert-circle" size={16} color="#fff" />
              <Text style={[styles.saveBtnLargeText, { fontSize: 13 }]}>{saveError}</Text>
            </View>
          )}
          {(hasChanges || saving) && !saveSuccess && !saveError && (
            <Pressable style={[styles.saveBtnLarge, { opacity: saving ? 0.7 : 1, flexDirection: "row", gap: 8 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <><ActivityIndicator color="#fff" /><Text style={styles.saveBtnLargeText}>  Saving...</Text></>
                : <Text style={styles.saveBtnLargeText}>Save All Changes</Text>}
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
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold", color: "#0F1740" },
  saveBtn: { backgroundColor: "#2563EB", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  savedBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#16A34A", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  savedBadgeText: { color: "#fff", fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  errorBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#DC2626", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  errorBadgeText: { color: "#fff", fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  logoPreview: {
    width: 72, height: 48, borderRadius: 10, backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  logoImg: { width: 70, height: 46 },
  uploadBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  uploadBtnText: { color: "#fff", fontSize: 13, fontFamily: "DMSans_600SemiBold" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#6B7280", fontFamily: "DMSans_500Medium", fontSize: 14 },
  content: { padding: 16, gap: 0 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: "DMSans_700Bold", color: "#6B7280", letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#E5EAF8", overflow: "hidden" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  textInputRow: { padding: 16, gap: 4 },
  configLabel: { fontSize: 14, fontFamily: "DMSans_600SemiBold", color: "#0F1740" },
  configDesc: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#9CA3AF", marginTop: 2 },
  configInput: { width: 80, fontSize: 14, fontFamily: "DMSans_700Bold", color: "#2563EB", textAlign: "right", backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  textInput: { fontSize: 13, fontFamily: "DMSans_500Medium", color: "#0F1740", backgroundColor: "#F8FAFF", borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8", paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 16 },
  saveBtnLarge: { backgroundColor: "#2563EB", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  saveBtnLargeText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },

  // Gateway cards
  gatewayStack: { gap: 12 },
  gatewayCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#E5EAF8", overflow: "hidden" },
  gatewayCardError: { borderColor: "#FECACA", backgroundColor: "#FFF5F5" },
  gatewayHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderLeftWidth: 4, borderLeftColor: "#E5EAF8" },
  gatewayName: { fontSize: 15, fontFamily: "DMSans_700Bold" },
  gatewayFields: { borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  secureRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  eyeBtn: { width: 36, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFF", borderRadius: 10, borderWidth: 1, borderColor: "#E5EAF8" },

  // Option 2: Inline errors
  inlineError: { flexDirection: "row", alignItems: "flex-start", gap: 8, margin: 16, marginTop: 0, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#FECACA" },
  inlineErrorText: { flex: 1, fontSize: 13, fontFamily: "DMSans_500Medium", color: "#DC2626", lineHeight: 18 },

  // Active gateway radio
  gwRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  gwRadioFill: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#2563EB" },
});
