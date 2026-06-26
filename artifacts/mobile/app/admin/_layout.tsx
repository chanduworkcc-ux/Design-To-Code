import { Stack } from "expo-router";
import React from "react";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="users" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="tickets" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
