const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase environment variables are required");
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase
    .from('decision_references')
    .select(`
      id,
      tenant_id,
      source_id,
      target_id,
      relationship,
      approval_requests!decision_references_target_id_fkey(id, ref, subject)
    `)
    .eq('source_id', 'd3cde03d-bda7-42dd-a72d-269b6729d320');
  
  console.log('Outgoing references query:', data, error);
}
test().catch(console.error);
