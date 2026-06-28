import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const AVATAR_KEY = "@xc_avatar_uri";

export default function PersonalInfoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, apiRequest, refreshUser } = useAuth();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const avatarLetter = (name || user?.name || "?").charAt(0).toUpperCase();

  useEffect(() => {
    AsyncStorage.getItem(AVATAR_KEY).then((uri) => {
      if (uri) setAvatarUri(uri);
    }).catch(() => {});
  }, []);

  async function handlePickImage() {
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "Image upload is available on the mobile app.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library to set a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      await AsyncStorage.setItem(AVATAR_KEY, uri);
      setAvatarUri(uri);
    }
  }

  async function handleRemoveImage() {
    await AsyncStorage.removeItem(AVATAR_KEY);
    setAvatarUri(null);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Validation", "Name cannot be empty.");
      return;
    }
    if (trimmed === user?.name) { router.back(); return; }
    setSaving(true);
    try {
      const res = await apiRequest("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        await refreshUser();
        router.back();
      } else {
        const d = await res.json().catch(() => ({}));
        Alert.alert("Error", d.error ?? "Failed to update profile.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
    setSaving(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Personal Information</Text>
        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {/* Avatar with gallery picker */}
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarWrap} onPress={handlePickImage}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{avatarLetter}</Text>
              </View>
            )}
            <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
              <Feather name="camera" size={14} color="#fff" />
            </View>
          </Pressable>
          <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
            {avatarUri ? "Tap to change photo" : "Tap to add a photo from gallery"}
          </Text>
          {avatarUri && (
            <Pressable style={[styles.removePhotoBtn, { borderColor: colors.border }]} onPress={handleRemoveImage}>
              <Feather name="trash-2" size={13} color={colors.destructive ?? "#EF4444"} />
              <Text style={[styles.removePhotoText, { color: colors.destructive ?? "#EF4444" }]}>Remove photo</Text>
            </Pressable>
          )}
        </View>

        {/* Name — editable */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>DISPLAY NAME</Text>
        <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="user" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={colors.mutedForeground}
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>

        {/* Email — read-only */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>EMAIL ADDRESS</Text>
        <View style={[styles.inputCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="mail" size={18} color={colors.mutedForeground} />
          <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]} numberOfLines={1}>{user?.email ?? "—"}</Text>
          <Feather name="lock" size={13} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>Email address cannot be changed once registered.</Text>

        {/* Mobile Number — read-only */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>MOBILE NUMBER</Text>
        <View style={[styles.inputCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="phone" size={18} color={colors.mutedForeground} />
          <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]}>{user?.mobileNumber ?? "—"}</Text>
          <Feather name="lock" size={13} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>Mobile number cannot be changed once registered.</Text>

        {/* Referral Code — read-only */}
        {user?.referralCode && (
          <>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>REFERRAL CODE</Text>
            <View style={[styles.inputCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="gift" size={18} color={colors.mutedForeground} />
              <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]}>{user.referralCode}</Text>
              <Feather name="lock" size={13} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>Your unique referral code. Share it to earn rewards.</Text>
          </>
        )}

        {/* Account Role */}
        <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="calendar" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>Account role: {user?.role?.toUpperCase() ?? "USER"}</Text>
        </View>

        {/* What can be edited notice */}
        <View style={[styles.noticeBox, { backgroundColor: colors.accent, borderColor: colors.border }]}>
          <Feather name="info" size={15} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.primary }]}>
            You can update your display name and profile photo. Email, mobile number, and referral code are fixed.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "DMSans_700Bold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, minWidth: 60, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  content: { padding: 20, gap: 6 },
  avatarSection: { alignItems: "center", paddingVertical: 28, gap: 10 },
  avatarWrap: { position: "relative", width: 94, height: 94 },
  avatar: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarEditBadge: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  avatarText: { color: "#fff", fontSize: 36, fontFamily: "DMSans_700Bold" },
  avatarHint: { fontSize: 12, fontFamily: "DMSans_400Regular" },
  removePhotoBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  removePhotoText: { fontSize: 12, fontFamily: "DMSans_500Medium" },
  label: { fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 0.8, marginTop: 14, marginBottom: 6 },
  inputCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, fontFamily: "DMSans_500Medium", padding: 0 },
  readOnlyText: { flex: 1, fontSize: 15, fontFamily: "DMSans_500Medium" },
  hint: { fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 5, marginLeft: 2, lineHeight: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 20 },
  infoText: { fontSize: 13, fontFamily: "DMSans_500Medium" },
  noticeBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 16 },
  noticeText: { flex: 1, fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 18 },
});
