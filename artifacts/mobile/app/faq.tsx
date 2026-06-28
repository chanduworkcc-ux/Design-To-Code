import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
}

function FaqItem({ faq, colors }: { faq: Faq; colors: any }) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const [height, setHeight] = useState(0);

  function toggle() {
    Animated.spring(anim, {
      toValue: open ? 0 : 1,
      useNativeDriver: false,
      damping: 18,
      stiffness: 200,
    }).start();
    setOpen((v) => !v);
  }

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const animHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [0, height] });

  return (
    <View style={[styles.faqItem, { backgroundColor: colors.card, borderColor: open ? colors.primary : colors.border }]}>
      <Pressable style={styles.faqHeader} onPress={toggle}>
        <View style={[styles.qIcon, { backgroundColor: open ? colors.primary : colors.accent }]}>
          <Text style={[styles.qIconText, { color: open ? "#fff" : colors.primary }]}>Q</Text>
        </View>
        <Text style={[styles.question, { color: colors.text, flex: 1 }]}>{faq.question}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
        </Animated.View>
      </Pressable>
      <Animated.View style={{ height: animHeight, overflow: "hidden" }}>
        <View
          style={styles.answerWrap}
          onLayout={(e) => { if (!height) setHeight(e.nativeEvent.layout.height + 16); }}
        >
          <View style={[styles.answerDivider, { backgroundColor: colors.border }]} />
          <View style={styles.answerRow}>
            <View style={[styles.aIcon, { backgroundColor: "#10B98120" }]}>
              <Text style={[styles.aIconText, { color: "#10B981" }]}>A</Text>
            </View>
            <Text style={[styles.answer, { color: colors.mutedForeground }]}>{faq.answer}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

export default function FaqScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchFaqs(); }, []);

  async function fetchFaqs() {
    try {
      const res = await fetch(`${BASE_URL}/faqs`);
      if (res.ok) {
        const d = await res.json();
        setFaqs(d.faqs ?? []);
      }
    } catch {}
    setLoading(false);
  }

  const categories = Array.from(new Set(faqs.map((f) => f.category)));

  const filtered = search.trim()
    ? faqs.filter(
        (f) =>
          f.question.toLowerCase().includes(search.toLowerCase()) ||
          f.answer.toLowerCase().includes(search.toLowerCase())
      )
    : faqs;

  const grouped = categories.reduce<Record<string, Faq[]>>((acc, cat) => {
    const items = filtered.filter((f) => f.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Q&A / Help</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Frequently asked questions</Text>
        </View>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search questions..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="help-circle" size={48} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {search ? "No results found" : "No Q&A available yet"}
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            {search ? "Try a different search term" : "Check back soon for answers"}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {search.trim() ? (
            <>
              <Text style={[styles.catLabel, { color: colors.mutedForeground }]}>
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </Text>
              {filtered.map((faq) => (
                <FaqItem key={faq.id} faq={faq} colors={colors} />
              ))}
            </>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <View key={cat}>
                <View style={styles.catHeader}>
                  <View style={[styles.catDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.catLabel, { color: colors.mutedForeground }]}>{cat.toUpperCase()}</Text>
                </View>
                {items.map((faq) => (
                  <FaqItem key={faq.id} faq={faq} colors={colors} />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "DMSans_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "DMSans_400Regular" },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "DMSans_400Regular", padding: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "DMSans_400Regular" },
  content: { padding: 16, gap: 10 },
  catHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 6 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catLabel: { fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 0.6 },
  faqItem: { borderRadius: 14, borderWidth: 1.5, overflow: "hidden", marginBottom: 2 },
  faqHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  qIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  qIconText: { fontSize: 13, fontFamily: "DMSans_700Bold" },
  question: { fontSize: 14, fontFamily: "DMSans_600SemiBold", lineHeight: 20 },
  answerWrap: { position: "absolute", left: 0, right: 0, top: 0 },
  answerDivider: { height: 1, marginHorizontal: 14 },
  answerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  aIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 1 },
  aIconText: { fontSize: 13, fontFamily: "DMSans_700Bold" },
  answer: { flex: 1, fontSize: 14, fontFamily: "DMSans_400Regular", lineHeight: 21 },
});
