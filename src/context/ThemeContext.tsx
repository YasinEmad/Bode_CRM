"use client";

import React, { createContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

type ThemeContextType = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme") as Theme | null;
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
        document.documentElement.classList.toggle("light", saved === "light");
        return;
      }

      // fallback to prefers-color-scheme
      const prefersLight = window.matchMedia
        ? window.matchMedia("(prefers-color-scheme: light)").matches
        : false;
      const initial = prefersLight ? "light" : "dark";
      setThemeState(initial);
      document.documentElement.classList.toggle("light", initial === "light");
    } catch (e) {
      // ignore (SSR safety)
    }
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem("theme", t);
      document.documentElement.classList.toggle("light", t === "light");
    } catch (e) {
      // ignore
    }
  };

  const toggle = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
