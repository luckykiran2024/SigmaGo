import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminClient = createClient(url, key);

async function updateBucketLimit() {
  console.log('Updating avatars bucket size limit to 10MB...');
  const { data, error } = await adminClient.storage.updateBucket('avatars', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'],
  });
  console.log('Bucket update result:', data, error);
}

updateBucketLimit();
