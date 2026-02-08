"use client";

import React from "react";
import useTheme from "@/hooks/useTheme";

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      aria-label="Toggle theme"
      onClick={toggle}
      className={className}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "inherit",
      }}
    >
      {theme === "light" ? "🌞" : "🌙"}
    </button>
  );
}
