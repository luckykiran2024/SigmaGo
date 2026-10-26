const { createClient } = require('@supabase/supabase-js');
const url = 'https://mawiqviucthalwyfvmfr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hd2lxdml1Y3RoYWx3eWZ2bWZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYyMzEzOSwiZXhwIjoyMDk3MTk5MTM5fQ.MoVXbld1BV1-tnDWRjlKZTc_ZVsBS1GkS0VxcWNfElQ';
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
