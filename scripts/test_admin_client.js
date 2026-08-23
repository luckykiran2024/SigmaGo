import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing with SUPABASE_SERVICE_ROLE_KEY...');
const admin = createClient(url, serviceKey);

async function test() {
  const { data, error } = await admin.from('intelligence_grants').select('count', { count: 'exact' });
  console.log('Service role query result:', { data, error });

  console.log('Testing with NEXT_PUBLIC_SUPABASE_ANON_KEY...');
  const anon = createClient(url, anonKey);
  const { data: data2, error: error2 } = await anon.from('intelligence_grants').select('count', { count: 'exact' });
  console.log('Anon key query result:', { data: data2, error: error2 });
}

test();
