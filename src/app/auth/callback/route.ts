import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (code) {
    const supabase = await createClient();
    const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && exchangeData?.user) {
      // Resolve user profile to find their tenant subdomain
      const profile = await getProfileForAuthUser(exchangeData.user.id, exchangeData.user.email || '');
      
      let redirectPath = '/meridian';
      if (profile) {
        const { data: tenant } = await adminClient
          .from('tenants')
          .select('subdomain')
          .eq('id', profile.tenant_id)
          .single();

        if (tenant) {
          redirectPath = `/${tenant.subdomain}`;
        }
      }
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?message=Could not authenticate user`);
}
