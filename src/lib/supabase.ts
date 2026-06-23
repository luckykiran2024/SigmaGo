import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// For frontend / standard client requests
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For secure backend operations (e.g., uploading files to Storage, bypassing Auth rules if needed)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);