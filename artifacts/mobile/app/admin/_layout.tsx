import { Stack, useRouter, usePathname } from "expo-router";
import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Allow unauthenticated users to visit the login page only
    if (loading) return;
    if (pathname === "/admin" || pathname === "/admin/index") return;
    if (!user || user.role !== "admin") {
      router.replace("/admin");
    }
  }, [user, loading, pathname]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="users" />
      <Stack.Screen name="products" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="tickets" />
      <Stack.Screen name="coupons" />
      <Stack.Screen name="withdrawals" />
      <Stack.Screen name="banners" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
