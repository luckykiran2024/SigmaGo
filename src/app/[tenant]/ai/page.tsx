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
    <div className="max-w-4xl mx-auto py-4 space-y-6 font-ibmsans">
      <div>
        <h1 className="text-2xl font-display font-extrabold tracking-tight text-ink flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-sm font-bold font-ibmmono">
            AI
          </span>
          Approval Intelligence Assistant
        </h1>
        <p className="text-sm text-muted font-medium mt-1">
          Ask natural-language questions about your organization's approval data using secure, deterministic query templates.
        </p>
      </div>

      <AiChatConsole tenant={tenant} />
    </div>
  );
}
