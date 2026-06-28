import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
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
import { useAuth } from "@/context/AuthContext";

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
  const { user, apiRequest } = useAuth();
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAskModal, setShowAskModal] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askDetails, setAskDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  function openAskModal() {
    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to ask a question.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/(auth)/login" as any) },
        ]
      );
      return;
    }
    setAskQuestion("");
    setAskDetails("");
    setSubmitted(false);
    setShowAskModal(true);
  }

  async function handleSubmit() {
    if (!askQuestion.trim()) {
      Alert.alert("Required", "Please enter your question.");
      return;
    }
    setSubmitting(true);
    try {
      const description = askDetails.trim()
        ? `${askQuestion.trim()}\n\nAdditional details:\n${askDetails.trim()}`
        : askQuestion.trim();

      const res = await apiRequest("/tickets", {
        method: "POST",
        body: JSON.stringify({
          category: "Q&A",
          title: askQuestion.trim(),
          description,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error ?? "Failed to submit. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
    setSubmitting(false);
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
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Q&A / Help</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Frequently asked questions</Text>
        </View>
        <Pressable style={[styles.askHeaderBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]} onPress={openAskModal}>
          <Feather name="send" size={14} color={colors.primary} />
          <Text style={[styles.askHeaderText, { color: colors.primary }]}>Ask</Text>
        </Pressable>
      </View>

      {/* Search */}
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

      {/* Content */}
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
            {search ? "Try a different search term" : "Be the first to ask a question!"}
          </Text>
          <Pressable style={[styles.emptyAskBtn, { backgroundColor: colors.primary }]} onPress={openAskModal}>
            <Feather name="send" size={14} color="#fff" />
            <Text style={styles.emptyAskText}>Ask a Question</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
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

          {/* Bottom banner */}
          <View style={[styles.askBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.askBannerIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="help-circle" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.askBannerTitle, { color: colors.text }]}>Didn't find your answer?</Text>
              <Text style={[styles.askBannerSub, { color: colors.mutedForeground }]}>Send us your question and we'll get back to you</Text>
            </View>
            <Pressable style={[styles.askBannerBtn, { backgroundColor: colors.primary }]} onPress={openAskModal}>
              <Text style={styles.askBannerBtnText}>Ask</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Floating Ask Button */}
      {!loading && filtered.length > 0 && (
        <Pressable
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={openAskModal}
        >
          <Feather name="send" size={20} color="#fff" />
          <Text style={styles.fabText}>Ask a Question</Text>
        </Pressable>
      )}

      {/* Ask a Question Modal */}
      <Modal visible={showAskModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAskModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowAskModal(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ask a Question</Text>
            <View style={{ width: 22 }} />
          </View>

          {submitted ? (
            <View style={styles.successWrap}>
              <View style={[styles.successIcon, { backgroundColor: "#10B98118" }]}>
                <Feather name="check-circle" size={52} color="#10B981" />
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>Question Submitted!</Text>
              <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
                Our team has received your question and will reply via the{" "}
                <Text style={{ fontFamily: "DMSans_600SemiBold", color: colors.text }}>Support Tickets</Text>{" "}
                section in your profile.
              </Text>
              <Pressable
                style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowAskModal(false)}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
              <Pressable
                style={[styles.viewTicketsBtn, { borderColor: colors.border }]}
                onPress={() => { setShowAskModal(false); router.push("/support-ticket" as any); }}
              >
                <Feather name="message-circle" size={14} color={colors.primary} />
                <Text style={[styles.viewTicketsBtnText, { color: colors.primary }]}>View My Tickets</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={[styles.tipBox, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
                <Feather name="info" size={14} color={colors.primary} />
                <Text style={[styles.tipText, { color: colors.primary }]}>
                  Our team will reply to your question. You'll see the response in Support Tickets.
                </Text>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>YOUR QUESTION *</Text>
              <TextInput
                style={[styles.questionInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. How long does delivery take to my city?"
                placeholderTextColor={colors.mutedForeground}
                value={askQuestion}
                onChangeText={setAskQuestion}
                multiline
                maxLength={300}
                textAlignVertical="top"
                autoFocus
              />
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{askQuestion.length}/300</Text>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ADDITIONAL DETAILS (optional)</Text>
              <TextInput
                style={[styles.detailsInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="Any extra context that might help us answer faster..."
                placeholderTextColor={colors.mutedForeground}
                value={askDetails}
                onChangeText={setAskDetails}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />

              <Pressable
                style={[styles.submitBtn, { backgroundColor: askQuestion.trim() ? colors.primary : colors.border, opacity: submitting ? 0.7 : 1 }]}
                onPress={handleSubmit}
                disabled={submitting || !askQuestion.trim()}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#fff" />
                    <Text style={styles.submitBtnText}>Submit Question</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "DMSans_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "DMSans_400Regular" },
  askHeaderBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  askHeaderText: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "DMSans_400Regular", padding: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontFamily: "DMSans_600SemiBold", textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center", lineHeight: 20 },
  emptyAskBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyAskText: { color: "#fff", fontSize: 14, fontFamily: "DMSans_600SemiBold" },
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
  askBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 8 },
  askBannerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  askBannerTitle: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  askBannerSub: { fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2, lineHeight: 16 },
  askBannerBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  askBannerBtnText: { color: "#fff", fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  fab: { position: "absolute", bottom: 24, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 30, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  fabText: { color: "#fff", fontSize: 15, fontFamily: "DMSans_600SemiBold" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "DMSans_700Bold" },
  modalContent: { padding: 20, gap: 6 },
  tipBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  tipText: { flex: 1, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 19 },
  fieldLabel: { fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 0.5, marginBottom: 8 },
  questionInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "DMSans_400Regular", minHeight: 110, lineHeight: 22 },
  charCount: { fontSize: 11, fontFamily: "DMSans_400Regular", textAlign: "right", marginBottom: 20 },
  detailsInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "DMSans_400Regular", minHeight: 80, lineHeight: 21, marginBottom: 24 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16 },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  successIcon: { width: 96, height: 96, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  successTitle: { fontSize: 22, fontFamily: "DMSans_700Bold", textAlign: "center" },
  successSub: { fontSize: 14, fontFamily: "DMSans_400Regular", textAlign: "center", lineHeight: 22 },
  doneBtn: { width: "100%", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  doneBtnText: { color: "#fff", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
  viewTicketsBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 20 },
  viewTicketsBtnText: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
});
