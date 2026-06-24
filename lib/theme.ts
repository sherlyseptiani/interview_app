export const THEME_STORAGE_KEY = "sherlyInterviewTheme";

export const THEME_COLORS = {
  dark: "#07070f",
  light: "#f7f8fc",
} as const;

export type ThemeMode = keyof typeof THEME_COLORS;

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light";
}
