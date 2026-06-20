import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { create } from "zustand";
import type { ThemeMode } from "../types";

interface ThemeState {
  themeMode: ThemeMode;
  resolvedTheme: "light" | "dark";
  setThemeMode: (mode: ThemeMode) => void;
}

const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: "auto",
  resolvedTheme: "dark",
  setThemeMode: (mode) => {
    const resolvedTheme = resolveTheme(mode);
    set({ themeMode: mode, resolvedTheme });
    persistTheme(mode);
  },
}));

const ThemeContext = createContext<ThemeState | null>(null);

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "light" || mode === "dark") {
    return mode;
  }
  const stored = localStorage.getItem("skillstake-theme") as ThemeMode | null;
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  const hour = new Date().getHours();
  const afterHours = hour >= 19 || hour < 7;
  return prefersDark || afterHours ? "dark" : "light";
}

function persistTheme(mode: ThemeMode) {
  localStorage.setItem("skillstake-theme", mode);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const themeStore = useThemeStore();

  useEffect(() => {
    const stored = (localStorage.getItem("skillstake-theme") as ThemeMode | null) ?? "auto";
    const resolvedTheme = resolveTheme(stored);
    useThemeStore.setState({ themeMode: stored, resolvedTheme });
    setReady(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", themeStore.resolvedTheme === "dark");
    root.setAttribute("data-theme", themeStore.resolvedTheme);
  }, [themeStore.resolvedTheme]);

  const value = useMemo(() => themeStore, [themeStore]);

  if (!ready) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return useThemeStore();
  }
  return context;
}
