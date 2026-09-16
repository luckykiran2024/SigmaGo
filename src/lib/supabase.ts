import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const createSafeStorage = () => {
  const inMemoryStore = new Map<string, string>();
  
  let canUseSessionStorage = false;
  try {
    if (typeof window !== 'undefined') {
      const testKey = '__sg_test__';
      window.sessionStorage.setItem(testKey, testKey);
      window.sessionStorage.removeItem(testKey);
      canUseSessionStorage = true;
    }
  } catch {
    canUseSessionStorage = false;
  }

  return {
    getItem(key: string): string | null {
      if (canUseSessionStorage) {
        try {
          return window.sessionStorage.getItem(key);
        } catch {
          canUseSessionStorage = false;
        }
      }
      return inMemoryStore.get(key) || null;
    },
    setItem(key: string, value: string): void {
      if (canUseSessionStorage) {
        try {
          window.sessionStorage.setItem(key, value);
          return;
        } catch {
          canUseSessionStorage = false;
        }
      }
      inMemoryStore.set(key, value);
    },
    removeItem(key: string): void {
      if (canUseSessionStorage) {
        try {
          window.sessionStorage.removeItem(key);
          return;
        } catch {
          canUseSessionStorage = false;
        }
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
