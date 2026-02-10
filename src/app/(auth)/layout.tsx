'use client';

import { useEffect } from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Force dark mode for auth pages
    const el = document.documentElement;
    el.classList.add("dark");
    el.classList.remove("light");

    // Ensure other code (ThemeProvider) cannot re-add 'light' while on auth pages
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "attributes" && r.attributeName === "class") {
          if (el.classList.contains("light")) {
            el.classList.remove("light");
          }
          if (!el.classList.contains("dark")) {
            el.classList.add("dark");
          }
        }
      }
    });
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });

    return () => {
      mo.disconnect();
      // Restore original state when leaving auth pages
      el.classList.remove("dark");
    };
  }, []);

  return <>{children}</>;
}
