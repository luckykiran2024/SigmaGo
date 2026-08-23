'use client';

import { useState } from 'react';
import { updateTicketStatusAction } from '../actions';
import { LifeBuoy, CheckCircle2, Clock, ShieldAlert, Filter, Search } from 'lucide-react';

export interface TicketItem {
  id: string;
  tenantName: string;
  subdomain: string;
  requesterEmail: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  resolutionNotes?: string | null;
  createdAt: string;
}

export default function TicketQueueManager({ initialTickets }: { initialTickets: TicketItem[] }) {
  const [tickets, setTickets] = useState<TicketItem[]>(initialTickets);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const filtered = tickets.filter((t) => {
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        t.requesterEmail.toLowerCase().includes(q) ||
        t.tenantName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleUpdateStatus = async (status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => {
    if (!selectedTicket) return;
    setUpdating(true);

    try {
      const res = await updateTicketStatusAction({
        ticketId: selectedTicket.id,
        status,
        resolutionNotes,
      });

      if (res.success) {
        setTickets(
          tickets.map((t) =>
            t.id === selectedTicket.id ? { ...t, status, resolutionNotes } : t
          )
        );
        setSelectedTicket(null);
        setResolutionNotes('');
      }
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Filters & Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#1E293B] border border-[#334155] p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickets by subject, requester, or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0F172A] border border-[#334155] text-white text-xs font-medium focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] text-white text-xs font-bold focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] text-white text-xs font-bold focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[#94A3B8] space-y-2">
            <LifeBuoy className="w-8 h-8 text-[#334155] mx-auto" />
            <p className="text-sm font-bold text-white">No support tickets found</p>
            <p className="text-xs">No issues match the selected search or status filters.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-[#E2E8F0]">
            <thead className="bg-[#0F172A] text-[#94A3B8] font-bold uppercase text-[10px] tracking-wider border-b border-[#334155]">
              <tr>
                <th className="py-3 px-4">Ticket Info</th>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created On</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {filtered.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-[#334155]/30 transition">
                  <td className="py-3.5 px-4 space-y-0.5">
                    <p className="font-bold text-white text-xs">{ticket.subject}</p>
                    <p className="text-[11px] text-[#94A3B8] font-mono">{ticket.requesterEmail}</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-bold text-white">{ticket.tenantName}</span>
                    <span className="block text-[10px] text-[#38BDF8] font-mono">/{ticket.subdomain}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ticket.priority === 'URGENT' || ticket.priority === 'HIGH'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-[#334155] text-[#94A3B8]'
                      }`}
                    >
                      {ticket.priority}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    {ticket.status === 'OPEN' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Open
                      </span>
                    )}
                    {ticket.status === 'IN_PROGRESS' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 inline-flex items-center gap-1">
                        <LifeBuoy className="w-3 h-3 animate-spin" />
                        In Progress
                      </span>
                    )}
                    {ticket.status === 'RESOLVED' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Resolved
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[#94A3B8] text-[11px]">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="px-3 py-1.5 rounded-lg bg-[#334155] hover:bg-[#475569] text-white text-xs font-bold transition"
                    >
                      Manage Ticket
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Ticket Management Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl max-w-lg w-full p-6 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <h3 className="font-bold text-sm text-[#38BDF8]">
                Manage Ticket #{selectedTicket.id.substring(0, 8)}
              </h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-[#94A3B8] hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 bg-[#0F172A] p-4 rounded-xl border border-[#334155]">
              <p className="text-xs font-bold text-white">{selectedTicket.subject}</p>
              <p className="text-2xs text-[#94A3B8]">
                From: <span className="text-white font-mono">{selectedTicket.requesterEmail}</span> ({selectedTicket.tenantName})
              </p>
              <p className="text-xs text-[#E2E8F0] pt-2 border-t border-[#334155] leading-relaxed">
                {selectedTicket.description}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#94A3B8] uppercase">
                Resolution Notes / Operator Response
              </label>
              <textarea
                rows={3}
                placeholder="State resolution steps or response..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#0F172A] border border-[#334155] text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
              <button
                onClick={() => handleUpdateStatus('IN_PROGRESS')}
                disabled={updating}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Set In Progress
              </button>
              <button
                onClick={() => handleUpdateStatus('RESOLVED')}
                disabled={updating}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
