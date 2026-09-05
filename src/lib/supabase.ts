import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

// For frontend / standard client requests (anon key, user-session scope)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createSafeStorage(),
    persistSession: typeof window !== 'undefined',
  },
});

/**
 * @deprecated Use `import { adminClient } from '@/lib/supabase/admin'` instead.
 * This re-export exists only for backward compatibility during migration.
 */
export { adminClient as supabaseAdmin } from '@/lib/supabase/admin';
