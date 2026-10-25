import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { redirect } from 'next/navigation';
import AiChatConsole from './AiChatConsole';

export default async function AiPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) redirect('/login');

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6 font-sans">
      <div className="border-b border-[#DCE5EA] pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[#182B3D] flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-[#ECF6F5] border border-[#D7ECEA] flex items-center justify-center text-[#0B7780] text-xs font-bold font-mono">
            AI
          </span>
          Approval Intelligence Assistant
        </h1>
        <p className="text-xs text-[#526679] font-medium mt-1">
          Ask natural-language questions about your organization's approval data using secure, deterministic query templates.
        </p>
      </div>

      <AiChatConsole tenant={tenant} />
    </div>
  );
}
