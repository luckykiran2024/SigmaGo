'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'midnight' | 'forest';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
});

export function ThemeProvider({
  children,
  initialTheme = 'light',
}: {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
}) {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let savedTheme: ThemeMode | null = null;
    try {
      if (typeof window !== 'undefined') {
        savedTheme = localStorage.getItem('sigmago_theme') as ThemeMode | null;
      }
    } catch {
      // Storage access blocked by browser security policy (e.g. iframe or third-party cookies disabled)
    }

    if (savedTheme && ['light', 'dark', 'midnight', 'forest'].includes(savedTheme)) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme(initialTheme);
    }
  }, [initialTheme]);

  const applyTheme = (newTheme: ThemeMode) => {
    try {
      const root = document.documentElement;
      root.classList.remove('dark', 'midnight', 'forest', 'light');
      if (newTheme !== 'light') {
        root.classList.add(newTheme);
      }
    } catch {
      // Ignore if document not accessible
    }
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sigmago_theme', newTheme);
      }
    } catch {
      // Storage access blocked
    }
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
