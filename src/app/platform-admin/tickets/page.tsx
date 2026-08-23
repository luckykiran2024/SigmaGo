import { adminClient } from '@/lib/supabase/admin';
import TicketQueueManager, { TicketItem } from './TicketQueueManager';
import { LifeBuoy } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SupportTicketsQueuePage() {
  const { data: dbTickets } = await adminClient
    .from('support_tickets')
    .select('*, tenants(name, subdomain)')
    .order('created_at', { ascending: false });

  const initialTickets: TicketItem[] = (dbTickets || []).map((t: any) => ({
    id: t.id,
    tenantName: t.tenants?.name || 'Unknown Tenant',
    subdomain: t.tenants?.subdomain || 'unknown',
    requesterEmail: t.requester_email,
    subject: t.subject,
    description: t.description,
    priority: t.priority || 'MEDIUM',
    status: t.status || 'OPEN',
    resolutionNotes: t.resolution_notes,
    createdAt: t.created_at,
  }));

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b border-[#334155] pb-6">
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <LifeBuoy className="w-6 h-6 text-[#F59E0B]" />
          Global Tenant Support Tickets Queue
        </h1>
        <p className="text-xs text-[#94A3B8] mt-1">
          Centralized ticket queue displaying issues, feature requests, and system tickets raised by users across all onboarded tenants.
        </p>
      </div>

      <TicketQueueManager initialTickets={initialTickets} />
    </div>
  );
}
