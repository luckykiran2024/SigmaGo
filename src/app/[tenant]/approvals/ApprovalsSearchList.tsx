"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Inbox, FileText, ArrowRight, Archive } from 'lucide-react';

interface ApprovalsSearchListProps {
  raisedByMe: any[];
  involvedIn: any[];
  archivedRequests: any[];
  isAdmin: boolean;
  tenantSubdomain: string;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }).format(new Date(dateStr));
}

export default function ApprovalsSearchList({
  raisedByMe,
  involvedIn,
  archivedRequests = [],
  isAdmin,
  tenantSubdomain
}: ApprovalsSearchListProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter helper matching query and status
  const filterRequest = (req: any) => {
    const subjectMatch = (req.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    const categoryName = req.categories?.name || '';
    const categoryMatch = categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    const statusTextMatch = (req.status || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesQuery = subjectMatch || categoryMatch || statusTextMatch;

    const matchesStatus = statusFilter === 'all' || (req.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesQuery && matchesStatus;
  };

  // Live filter and sort Raised by Me
  const filteredRaised = useMemo(() => {
    return raisedByMe
      .filter(filterRequest)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [raisedByMe, searchQuery, statusFilter]);

  // Live filter and sort Involved in
  const filteredInvolved = useMemo(() => {
    return involvedIn
      .filter(filterRequest)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [involvedIn, searchQuery, statusFilter]);

  // Live filter and sort Archived requests
  const filteredArchived = useMemo(() => {
    return archivedRequests
      .filter(filterRequest)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [archivedRequests, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      
      {/* Admin Tab Bar */}
      {isAdmin && (
        <div className="flex border-b border-gray-100 gap-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 text-sm font-bold transition relative ${
              activeTab === 'active' ? 'text-accent' : 'text-gray-500 hover:text-ink'
            }`}
          >
            Active Requests
            {activeTab === 'active' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`pb-3 text-sm font-bold transition relative ${
              activeTab === 'archived' ? 'text-accent' : 'text-gray-500 hover:text-ink'
            }`}
          >
            Archived Requests
            {activeTab === 'archived' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent rounded-full" />
            )}
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
            placeholder="Search by subject, category, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter Dropdown */}
        <div className="w-full sm:w-48">
          <select
            className="block w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white transition"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="in_discussion">In Discussion</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {activeTab === 'active' ? (
        /* Two Buckets Layout (Active Requests) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Bucket A: Involved In */}
          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-ink font-display">Involved in</h3>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">Requests where you are on the approval path</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/5 text-accent border border-accent/10">
                {filteredInvolved.length} requests
              </span>
            </div>

            {filteredInvolved.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-ink">No requests found</h4>
                <p className="text-xs text-gray-400 mt-1">You are not involved in any requests matching your filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
                {filteredInvolved.map((req) => {
                  const catName = req.categories?.name || 'Uncategorized';
                  return (
                    <div key={req.id} className="p-5 hover:bg-gray-50/30 transition flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="text-sm font-bold text-ink hover:text-accent transition truncate block">
                          {req.subject}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">{catName}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-2xs text-gray-400 font-semibold">{formatDate(req.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-3xs font-black uppercase tracking-widest ${
                          req.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                          req.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                          req.status === 'blocked' ? 'bg-red-50 text-red-700 border border-red-100 animate-pulse' :
                          req.status === 'in_discussion' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-yellow-50 text-yellow-700 border border-yellow-100'
                        }`}>
                          {req.status}
                        </span>
                        <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="p-1 text-gray-400 hover:text-accent transition">
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bucket B: Raised by Me */}
          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-ink font-display">Raised by me</h3>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">Requests you submitted for approval</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/5 text-accent border border-accent/10">
                {filteredRaised.length} requests
              </span>
            </div>

            {filteredRaised.length === 0 ? (
              <div className="text-center py-16 px-4">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-ink">No requests found</h4>
                <p className="text-xs text-gray-400 mt-1">You haven't submitted any requests matching your filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
                {filteredRaised.map((req) => {
                  const catName = req.categories?.name || 'Uncategorized';
                  return (
                    <div key={req.id} className="p-5 hover:bg-gray-50/30 transition flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="text-sm font-bold text-ink hover:text-accent transition truncate block">
                          {req.subject}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">{catName}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-2xs text-gray-400 font-semibold">{formatDate(req.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-3xs font-black uppercase tracking-widest ${
                          req.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                          req.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                          req.status === 'blocked' ? 'bg-red-50 text-red-700 border border-red-100 animate-pulse' :
                          req.status === 'in_discussion' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-yellow-50 text-yellow-700 border border-yellow-100'
                        }`}>
                          {req.status}
                        </span>
                        <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="p-1 text-gray-400 hover:text-accent transition">
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Archived Requests Table */
        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-ink font-display">Archived Requests</h3>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Requests belonging to inactive/exited employees</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/5 text-accent border border-accent/10">
              {filteredArchived.length} requests
            </span>
          </div>

          {filteredArchived.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Archive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-ink">No archived requests</h4>
              <p className="text-xs text-gray-400 mt-1">There are no archived requests matching your query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Owner</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                    <th scope="col" className="relative px-6 py-3.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredArchived.map((req) => {
                    const ownerName = req.owner?.name || 'Unknown';
                    const categoryName = req.categories?.name || 'Uncategorized';
                    return (
                      <tr key={req.id} className="hover:bg-gray-50/30 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-ink">{req.subject}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-ink">{ownerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-500">{categoryName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-3xs font-black uppercase tracking-widest ${
                            req.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                            req.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                            req.status === 'blocked' ? 'bg-red-50 text-red-700 border border-red-100 animate-pulse' :
                            req.status === 'in_discussion' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-yellow-50 text-yellow-700 border border-yellow-100'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-semibold">{formatDate(req.created_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                          <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="inline-flex items-center gap-1 text-accent hover:text-accent-light transition">
                            View
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
