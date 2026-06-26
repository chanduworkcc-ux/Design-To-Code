import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert, Appearance, Platform } from "react-native";
import { Product } from "@/data/products";

export type ThemeMode = "light" | "dark" | "system";

interface CartItem extends Product {
  quantity: 1;
}

interface AppContextType {
  cart: CartItem[];
  wishlist: Product[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  isInCart: (id: string) => boolean;
  cartCount: number;
  wishlistCount: number;
  cartTotal: number;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  resolvedTheme: "light" | "dark";
}

export const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  const systemScheme = Appearance.getColorScheme() ?? "light";
  const resolvedTheme: "light" | "dark" =
    themeMode === "system" ? systemScheme : themeMode;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [cartData, wishlistData, savedTheme] = await Promise.all([
        AsyncStorage.getItem("cart"),
        AsyncStorage.getItem("wishlist"),
        AsyncStorage.getItem("theme_mode"),
      ]);
      if (cartData) setCart(JSON.parse(cartData));
      if (wishlistData) setWishlist(JSON.parse(wishlistData));
      if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
        setThemeModeState(savedTheme as ThemeMode);
      }
    } catch {}
  }

  async function setThemeMode(mode: ThemeMode) {
    setThemeModeState(mode);
    await AsyncStorage.setItem("theme_mode", mode);
  }

  async function saveCart(newCart: CartItem[]) {
    setCart(newCart);
    await AsyncStorage.setItem("cart", JSON.stringify(newCart));
  }

  async function saveWishlist(newWishlist: Product[]) {
    setWishlist(newWishlist);
    await AsyncStorage.setItem("wishlist", JSON.stringify(newWishlist));
  }

  function addToCart(product: Product) {
    if (cart.length > 0 && cart[0].id === product.id) {
      return;
    }
    if (cart.length > 0) {
      const replace = () => saveCart([{ ...product, quantity: 1 }]);
      if (Platform.OS === "web") {
        replace();
      } else {
        Alert.alert(
          "Replace Cart Item?",
          `Your cart already has "${cart[0].name}". Only one item is allowed per order. Replace it with "${product.name}"?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Replace", style: "destructive", onPress: replace },
          ]
        );
      }
    } else {
      saveCart([{ ...product, quantity: 1 }]);
    }
  }

  function removeFromCart(id: string) {
    saveCart(cart.filter((i) => i.id !== id));
  }

  async function clearCart() {
    await saveCart([]);
  }

  function addToWishlist(product: Product) {
    if (!wishlist.find((i) => i.id === product.id)) {
      saveWishlist([...wishlist, product]);
    }
  }

  function removeFromWishlist(id: string) {
    saveWishlist(wishlist.filter((i) => i.id !== id));
  }

  function isInWishlist(id: string) {
    return !!wishlist.find((i) => i.id === id);
  }

  function isInCart(id: string) {
    return !!cart.find((i) => i.id === id);
  }

  const cartCount = cart.length;
  const wishlistCount = wishlist.length;
  const cartTotal = cart.reduce((sum, i) => sum + i.price, 0);

  return (
    <AppContext.Provider value={{
      cart, wishlist, addToCart, removeFromCart, clearCart,
      addToWishlist, removeFromWishlist, isInWishlist, isInCart,
      cartCount, wishlistCount, cartTotal,
      themeMode, setThemeMode, resolvedTheme,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
