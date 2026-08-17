import { createBrowserClient } from '@supabase/ssr'

const createSafeStorage = () => {
  const inMemoryStore = new Map<string, string>();

  return {
    getItem(key: string): string | null {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          return window.sessionStorage.getItem(key);
        }
      } catch {
        // Storage access blocked by browser security policy
      }
      return inMemoryStore.get(key) || null;
    },
    setItem(key: string, value: string): void {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(key, value);
          return;
        }
      } catch {
        // Storage access blocked by browser security policy
      }
      inMemoryStore.set(key, value);
    },
    removeItem(key: string): void {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(key);
          return;
        }
      } catch {
        // Storage access blocked by browser security policy
      }
      inMemoryStore.delete(key);
    },
  };
};

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: createSafeStorage(),
      },
    }
  )

