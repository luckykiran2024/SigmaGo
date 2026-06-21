"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Inbox, FileText } from 'lucide-react';

interface ApprovalsSearchListProps {
  raisedByMe: any[];
  involvedIn: any[];
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
  tenantSubdomain
}: ApprovalsSearchListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter helper matching query and status
  const filterRequest = (req: any) => {
    // 1. Search Query Filter (subject, category name, or status)
    const subjectMatch = (req.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    const categoryName = req.categories?.name || '';
    const categoryMatch = categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    const statusTextMatch = (req.status || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesQuery = subjectMatch || categoryMatch || statusTextMatch;

    // 2. Status Dropdown Filter
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

  return (
    <div className="space-y-6">
      
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
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* Two Buckets Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Bucket A: Involved In */}
        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-ink font-display">Involved in</h3>
              <p className="text-2xs text-gray-400 font-semibold uppercase tracking-wider mt-0.5">As Direct, Parallel, or Reference Approver</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-accent/5 text-accent border border-accent/10">
              {filteredInvolved.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredInvolved.length > 0 ? (
              filteredInvolved.map((req: any) => {
                const isDirect = req.user_role === 'GENERAL';
                const isParallel = req.user_role === 'PARALLEL';
                const isReference = req.user_role === 'REFERENCE';

                let roleBadgeClass = 'bg-gray-50 text-gray-700 border-gray-200';
                let roleLabel = req.user_role;
                if (isDirect) {
                  roleBadgeClass = 'bg-blue-50 text-blue-700 border-blue-150';
                  roleLabel = 'Direct';
                } else if (isParallel) {
                  roleBadgeClass = 'bg-purple-50 text-purple-700 border-purple-150';
                  roleLabel = 'Parallel';
                } else if (isReference) {
                  roleBadgeClass = 'bg-orange-50 text-orange-700 border-orange-150';
                  roleLabel = 'Reference';
                }

                return (
                  <Link 
                    key={req.id} 
                    href={`/${tenantSubdomain}/requests/${req.id}`}
                    className="block px-6 py-4.5 hover:bg-gray-50/50 transition duration-150"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <p className="text-sm font-bold text-ink truncate hover:text-accent transition">{req.subject}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 font-medium">
                          <span>{req.categories?.name || 'Uncategorized'}</span>
                          <span>•</span>
                          <span>{formatDate(req.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wider border ${
                          req.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                          req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                          req.status === 'blocked' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                          'bg-yellow-50 text-yellow-700 border-yellow-100'
                        }`}>
                          {req.status}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${roleBadgeClass}`}>
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-2">
                <Inbox className="w-8 h-8 text-gray-300" />
                <span className="font-semibold text-gray-500">No requests found</span>
                <span className="text-xs text-gray-400">Try adjusting your filters or search query.</span>
              </div>
            )}
          </div>
        </div>

        {/* Bucket B: Raised by Me */}
        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-ink font-display">Raised by me</h3>
              <p className="text-2xs text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Requests submitted by you</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-accent/5 text-accent border border-accent/10">
              {filteredRaised.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredRaised.length > 0 ? (
              filteredRaised.map((req: any) => (
                <Link 
                  key={req.id} 
                  href={`/${tenantSubdomain}/requests/${req.id}`}
                  className="block px-6 py-4.5 hover:bg-gray-50/50 transition duration-150"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-sm font-bold text-ink truncate hover:text-accent transition">{req.subject}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 font-medium">
                        <span>{req.categories?.name || 'Uncategorized'}</span>
                        <span>•</span>
                        <span>{formatDate(req.created_at)}</span>
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wider border shrink-0 ${
                      req.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                      req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                      req.status === 'blocked' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                      'bg-yellow-50 text-yellow-700 border-yellow-100'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-2">
                <FileText className="w-8 h-8 text-gray-300" />
                <span className="font-semibold text-gray-500">No requests found</span>
                <span className="text-xs text-gray-400">Try adjusting your filters or search query.</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
