'use client';

import { useEffect } from 'react';
import { useTheme, ThemeMode } from './ThemeProvider';

export default function ThemeInitializer({ userTheme }: { userTheme?: ThemeMode }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    let savedTheme: ThemeMode | null = null;
    try {
      if (typeof window !== 'undefined') {
        savedTheme = localStorage.getItem('sigmago_theme') as ThemeMode | null;
      }
    } catch {
      // Storage access blocked
    }

    if (savedTheme && ['light', 'dark', 'midnight', 'forest'].includes(savedTheme)) {
      setTheme(savedTheme);
    } else if (userTheme && ['light', 'dark', 'midnight', 'forest'].includes(userTheme)) {
      setTheme(userTheme);
    }
  }, [userTheme, setTheme]);

  return null;
}
