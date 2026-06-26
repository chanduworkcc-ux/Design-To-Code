import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Product } from "@/data/products";

interface CartItem extends Product {
  quantity: number;
}

interface AppContextType {
  cart: CartItem[];
  wishlist: Product[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  isInCart: (id: string) => boolean;
  cartCount: number;
  wishlistCount: number;
  cartTotal: number;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [cartData, wishlistData] = await Promise.all([
        AsyncStorage.getItem("cart"),
        AsyncStorage.getItem("wishlist"),
      ]);
      if (cartData) setCart(JSON.parse(cartData));
      if (wishlistData) setWishlist(JSON.parse(wishlistData));
    } catch {}
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
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      saveCart(cart.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      saveCart([...cart, { ...product, quantity: 1 }]);
    }
  }

  function removeFromCart(id: string) {
    saveCart(cart.filter((i) => i.id !== id));
  }

  function updateQuantity(id: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      saveCart(cart.map((i) => i.id === id ? { ...i, quantity } : i));
    }
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

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const wishlistCount = wishlist.length;
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <AppContext.Provider value={{
      cart, wishlist, addToCart, removeFromCart, updateQuantity,
      addToWishlist, removeFromWishlist, isInWishlist, isInCart,
      cartCount, wishlistCount, cartTotal,
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
