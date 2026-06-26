import { useContext } from "react";
import { useColorScheme } from "react-native";
import { AppContext } from "@/context/AppContext";
import colors from "@/constants/colors";

export function useColors() {
  const ctx = useContext(AppContext);
  const systemScheme = useColorScheme() ?? "light";

  const scheme: "light" | "dark" = ctx
    ? ctx.themeMode === "system"
      ? systemScheme
      : ctx.themeMode
    : systemScheme;

  const palette = scheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
