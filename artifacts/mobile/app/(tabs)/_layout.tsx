import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useNotifications } from "@/context/NotificationContext";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TABS = [
  { name: "index",    label: "Shop",    icon: "home-outline",         activeIcon: "home"                },
  { name: "search",   label: "Search",  icon: "search-outline",       activeIcon: "search"              },
  { name: "wishlist", label: "Wishlist", icon: "heart-outline",        activeIcon: "heart"               },
  { name: "cart",     label: "Cart",    icon: "cart-outline",         activeIcon: "cart"                },
  { name: "profile",  label: "Profile", icon: "person-outline",       activeIcon: "person"              },
] as const;

const TAB_COUNT = TABS.length;

interface TabItemProps {
  tab: typeof TABS[number];
  isActive: boolean;
  onPress: () => void;
  badge?: number;
}

const TAB_KEY_MAP: Record<string, "home" | "search" | "wishlist" | "cart" | "profile"> = {
  index: "home", search: "search", wishlist: "wishlist", cart: "cart", profile: "profile",
};

function TabItem({ tab, isActive, onPress, badge }: TabItemProps) {
  const colors = useColors();
  const { t } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const activeAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(activeAnim, {
      toValue: isActive ? 1 : 0,
      damping: 16,
      stiffness: 220,
      useNativeDriver: false,
    }).start();
  }, [isActive]);

  function handlePressIn() {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.82, damping: 20, stiffness: 450, useNativeDriver: true }),
      Animated.timing(translateYAnim, { toValue: -3, duration: 100, useNativeDriver: true }),
    ]).start();
  }

  function handlePressOut() {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, damping: 12, stiffness: 220, useNativeDriver: true }),
      Animated.spring(translateYAnim, { toValue: 0, damping: 10, stiffness: 180, useNativeDriver: true }),
    ]).start();
  }

  const pillOpacity = activeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const pillScale  = activeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  const iconColor  = isActive ? colors.primary : colors.mutedForeground;
  const labelColor = isActive ? colors.primary : colors.mutedForeground;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabItem}
      hitSlop={4}
    >
      <Animated.View
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
        }}
      >
        {/* Active pill background */}
        <Animated.View
          style={[
            styles.activePill,
            {
              backgroundColor: colors.primary + "1A",
              opacity: pillOpacity,
              transform: [{ scale: pillScale }],
            },
          ]}
        />

        {/* Icon with optional badge */}
        <View style={{ position: "relative" }}>
          <Ionicons
            name={(isActive ? tab.activeIcon : tab.icon) as any}
            size={23}
            color={iconColor}
          />
          {badge !== undefined && badge > 0 && (
            <View style={styles.badgeDot}>
              <Text style={styles.badgeDotText}>{badge > 9 ? "9+" : badge}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.tabLabel, { color: labelColor }]}>
          {t(TAB_KEY_MAP[tab.name] ?? "home")}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();
  const { cartCount, wishlistCount } = useApp();
  const { unreadCount } = useNotifications();

  const tabWidth = SCREEN_WIDTH / TAB_COUNT;
  const accentOffset = useRef(tabWidth * 0.275).current;

  const pillarAnim = useRef(new Animated.Value(state.index * tabWidth)).current;
  const pillarOffsetAnim = useRef(new Animated.Value(accentOffset)).current;
  const translateXAnim = useRef(
    Animated.add(pillarAnim, pillarOffsetAnim)
  ).current;

  useEffect(() => {
    Animated.spring(pillarAnim, {
      toValue: state.index * tabWidth,
      damping: 18,
      stiffness: 260,
      useNativeDriver: true,
    }).start();
  }, [state.index]);

  const tabHeight = isWeb ? 84 : 62 + insets.bottom;

  function getBadge(name: string) {
    if (name === "cart")     return cartCount    > 0 ? cartCount    : undefined;
    if (name === "wishlist") return wishlistCount > 0 ? wishlistCount : undefined;
    if (name === "profile")  return unreadCount   > 0 ? unreadCount   : undefined;
    return undefined;
  }

  return (
    <View
      style={[
        styles.tabBar,
        {
          height: tabHeight,
          borderTopColor: colors.border,
          shadowColor: isDark ? "#000" : colors.primary,
        },
      ]}
    >
      {/* Background */}
      {isIOS ? (
        <BlurView
          intensity={90}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
      )}

      {/* Animated sliding top-accent line */}
      <Animated.View
        style={[
          styles.slideAccent,
          {
            width: tabWidth * 0.45,
            backgroundColor: colors.primary,
            transform: [{ translateX: translateXAnim }],
          },
        ]}
      />

      {/* Tab items */}
      <View style={styles.tabRow}>
        {TABS.map((tab, i) => {
          const isFocused = state.index === i;
          const route = state.routes[i];

          function onPress() {
            if (!route) return;
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          return (
            <TabItem
              key={tab.name}
              tab={tab}
              isActive={isFocused}
              onPress={onPress}
              badge={getBadge(tab.name)}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="wishlist" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  slideAccent: {
    position: "absolute",
    top: 0,
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  tabRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  activePill: {
    position: "absolute",
    width: 52,
    height: 38,
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
    letterSpacing: 0.2,
  },
  badgeDot: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeDotText: {
    color: "#fff",
    fontSize: 8,
    fontFamily: "DMSans_700Bold",
  },
});
