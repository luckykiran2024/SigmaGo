import { adminClient } from '@/lib/supabase/admin';
import ConfirmForm from './ConfirmForm';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

export default async function ConfirmActionPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string; token: string }>;
  searchParams: Promise<{ intent?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { tenant: tenantSubdomain, token } = resolvedParams;
  const initialIntent = (resolvedSearchParams.intent || 'approve') as 'approve' | 'reject' | 'discuss';

  // 1. Fetch token and verify
  const { data: tokenData, error: tokenError } = await adminClient
    .from('action_tokens')
    .select(`
      *,
      approver:users!approver_id( name, email ),
      step:approval_steps!step_id( status )
    `)
    .eq('token', token)
    .single();

  const isTokenValid = tokenData && 
    !tokenData.used_at && 
    new Date(tokenData.expires_at) >= new Date() && 
    tokenData.step?.status === 'pending';

  if (tokenError || !isTokenValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-100 shadow-xl rounded-3xl p-8 max-w-md w-full text-center space-y-6 font-body">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-red-50 flex items-center justify-center">
              <ShieldAlert className="w-16 h-16 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-display font-black text-ink">Action Link Invalid or Expired</h2>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            This request has already been acted upon, the token has expired, or it is no longer pending. Please log in to SigmaGo to view the status.
          </p>
          <div className="pt-2">
            <a href={`/${tenantSubdomain}`} className="inline-flex items-center justify-center bg-accent text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-accent-light transition">
              Open SigmaGo Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fetch request details
  const { data: request, error: requestError } = await adminClient
    .from('approval_requests')
    .select(`
      subject,
      body_json,
      categories ( name ),
      owner:users!owner_id ( name )
    `)
    .eq('id', tokenData.request_id)
    .single();

  if (requestError || !request) {
    return <div className="p-8 text-center text-red-600 font-bold">Request details not found.</div>;
  }

  const categoryName = (request.categories as any)?.name || 'General';
  const ownerName = (request.owner as any)?.name || 'Unknown';
  const approverUser = tokenData.approver as any;

  let justification = 'No justification provided.';
  try {
    const doc = request.body_json;
    if (doc && typeof doc === 'object') {
      justification = JSON.stringify(doc);
    }
  } catch (e) {}

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-display font-black text-ink tracking-tight uppercase">SigmaGo</h1>
        <p className="text-xs font-bold text-accent uppercase tracking-widest mt-1">Tenant Approval Portal</p>
      </div>
      <ConfirmForm
        tenantSubdomain={tenantSubdomain}
        token={token}
        initialIntent={initialIntent}
        approverName={approverUser?.name || 'Unknown'}
        approverEmail={approverUser?.email || ''}
        requestSubject={request.subject}
        justification={justification}
        categoryName={categoryName}
        ownerName={ownerName}
      />
    </div>
  );
}
