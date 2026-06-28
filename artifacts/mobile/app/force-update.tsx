import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ForceUpdateScreenProps {
  version: string;
  url: string;
  notes: string;
}

export default function ForceUpdateScreen({ version, url, notes }: ForceUpdateScreenProps) {
  const insets = useSafeAreaInsets();

  function handleUpdate() {
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Feather name="arrow-up-circle" size={64} color="#2563EB" />
        </View>

        <Text style={styles.title}>Update Required</Text>
        <Text style={styles.subtitle}>
          A new version of XyloCart is available. Please update to continue using the app.
        </Text>

        <View style={styles.versionBadge}>
          <Feather name="tag" size={14} color="#2563EB" />
          <Text style={styles.versionText}>Version {version} required</Text>
        </View>

        {!!notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>What's New</Text>
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.notesText}>{notes}</Text>
            </ScrollView>
          </View>
        )}

        <Pressable
          style={[styles.updateBtn, !url && { opacity: 0.5 }]}
          onPress={handleUpdate}
          disabled={!url}
        >
          <Feather name="download" size={18} color="#fff" />
          <Text style={styles.updateBtnText}>Download Update</Text>
        </Pressable>

        <Text style={styles.footerNote}>
          You must install the latest version to continue.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EEF2FF",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: "DMSans_700Bold",
    color: "#0F1740",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  versionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  versionText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#2563EB",
  },
  notesCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5EAF8",
  },
  notesTitle: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: "#374151",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#4B5563",
    lineHeight: 22,
  },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: "100%",
    marginTop: 8,
  },
  updateBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
  },
  footerNote: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },
});
