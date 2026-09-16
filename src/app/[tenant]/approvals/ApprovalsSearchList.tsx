'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Inbox, FileText, ArrowRight, Archive, Calendar } from 'lucide-react';
import PersonPicker from '@/components/ui/PersonPicker';
import { getValidityInfo } from '@/lib/utils/validity';
import { VOCABULARY } from '@/lib/vocabulary/copy';

interface Category {
  id: string;
  name: string;
}

interface ApprovalsSearchListProps {
  raisedByMe: any[];
  involvedIn: any[];
  archivedRequests: any[];
  isAdmin: boolean;
  tenantSubdomain: string;
  categories: Category[];
  selectedOwner: { id: string; name: string } | null;
  hasActiveFilters: boolean;
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
  tenantSubdomain,
  categories = [],
  selectedOwner,
  hasActiveFilters
}: ApprovalsSearchListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Input states synchronized with searchParams
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category_id') || 'all');
  const [ownerFilter, setOwnerFilter] = useState(searchParams.get('owner_id') || null);
  const [fromDate, setFromDate] = useState(searchParams.get('from_date') || '');
  const [toDate, setToDate] = useState(searchParams.get('to_date') || '');
  const [datePreset, setDatePreset] = useState('custom');

  // Update query state if searchParams change externally
  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
    setStatusFilter(searchParams.get('status') || 'all');
    setCategoryFilter(searchParams.get('category_id') || 'all');
    setOwnerFilter(searchParams.get('owner_id') || null);
    setFromDate(searchParams.get('from_date') || '');
    setToDate(searchParams.get('to_date') || '');
  }, [searchParams]);

  // Debounced search query update
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery !== (searchParams.get('q') || '')) {
        updateFilters({ q: searchQuery });
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Helper to push new filter states to URL search parameters
  const updateFilters = (newFilters: { [key: string]: string | null }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val === null || val === 'all' || val === '') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    updateFilters({ status });
  };

  const handleCategoryChange = (catId: string) => {
    setCategoryFilter(catId);
    updateFilters({ category_id: catId });
  };

  const handleOwnerChange = (userId: string | null) => {
    setOwnerFilter(userId);
    updateFilters({ owner_id: userId });
  };

  const handleFromDateChange = (date: string) => {
    setFromDate(date);
    setDatePreset('custom');
    updateFilters({ from_date: date });
  };

  const handleToDateChange = (date: string) => {
    setToDate(date);
    setDatePreset('custom');
    updateFilters({ to_date: date });
  };

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    let from = '';
    let to = today.toISOString().split('T')[0];

    if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      from = d.toISOString().split('T')[0];
    } else if (preset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      from = d.toISOString().split('T')[0];
    } else if (preset === 'quarter') {
      const currentMonth = today.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const d = new Date(today.getFullYear(), quarterStartMonth, 1);
      from = d.toISOString().split('T')[0];
    } else if (preset === 'year') {
      from = `${today.getFullYear()}-01-01`;
    } else if (preset === 'all') {
      from = '';
      to = '';
    }

    setFromDate(from);
    setToDate(to);
    updateFilters({ from_date: from, to_date: to });
  };

  const clearFilter = (key: string) => {
    if (key === 'q') setSearchQuery('');
    if (key === 'status') setStatusFilter('all');
    if (key === 'category_id') setCategoryFilter('all');
    if (key === 'owner_id') setOwnerFilter(null);
    if (key === 'date') {
      setFromDate('');
      setToDate('');
      setDatePreset('custom');
      updateFilters({ from_date: null, to_date: null });
      return;
    }
    updateFilters({ [key]: null });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setOwnerFilter(null);
    setFromDate('');
    setToDate('');
    setDatePreset('custom');
    router.push(pathname);
  };

  // Count active filters
  let activeFilterCount = 0;
  if (searchQuery) activeFilterCount++;
  if (statusFilter !== 'all') activeFilterCount++;
  if (categoryFilter !== 'all') activeFilterCount++;
  if (ownerFilter) activeFilterCount++;
  if (fromDate || toDate) activeFilterCount++;

  const getStatusPillClasses = (status: string) => {
    const base = "inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium border ";
    if (status === 'approved') return base + "bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]";
    if (status === 'rejected') return base + "bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]";
    if (status === 'blocked') return base + "bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]";
    if (status === 'in_discussion') return base + "bg-[#F1FBFC] text-[#078899] border-[#DDF5F7]";
    return base + "bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]"; // pending
  };

  return (
    <div className="space-y-6 font-sans text-[#132238]">
      {/* Admin Tab Bar */}
      {isAdmin && (
        <div className="flex border-b border-[#DDE5EC] gap-6 font-sans">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 text-[14px] font-medium transition relative ${
              activeTab === 'active' ? 'text-[#012F6B] font-semibold' : 'text-[#526377] hover:text-[#012F6B]'
            }`}
          >
            Active Requests
            {activeTab === 'active' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#059DB0] rounded-sm" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`pb-3 text-[14px] font-medium transition relative ${
              activeTab === 'archived' ? 'text-[#012F6B] font-semibold' : 'text-[#526377] hover:text-[#012F6B]'
            }`}
          >
            Archived Requests
            {activeTab === 'archived' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#059DB0] rounded-sm" />
            )}
          </button>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-white border border-[#DDE5EC] rounded-[10px] shadow-xs p-4 space-y-4">
        <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#8190A0]" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-4 py-2 rounded-[6px] border border-[#DDE5EC] text-[13.5px] text-[#132238] placeholder-[#8190A0] focus:outline-none focus:ring-2 focus:ring-[#059DB0] transition bg-[#F7FAFC]"
              placeholder="Search subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Select */}
          <div className="w-full xl:w-40 shrink-0">
            <select
              className="block w-full px-3 py-2 rounded-[6px] border border-[#DDE5EC] text-[13px] text-[#132238] focus:outline-none focus:ring-2 focus:ring-[#059DB0] bg-white transition font-medium"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="in_discussion">In Discussion</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          {/* Category Select */}
          <div className="w-full xl:w-44 shrink-0">
            <select
              className="block w-full px-3 py-2 rounded-[6px] border border-[#DDE5EC] text-[13px] text-[#132238] focus:outline-none focus:ring-2 focus:ring-[#059DB0] bg-white transition font-medium"
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Raised by Owner */}
          <div className="w-full xl:w-56 shrink-0 relative">
            <PersonPicker
              tenant={tenantSubdomain}
              value={ownerFilter}
              onSelect={handleOwnerChange}
              placeholder="Filter by owner..."
            />
          </div>

          {/* Date range inputs & presets */}
          <div className="w-full xl:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 border border-[#DDE5EC] rounded-[6px] px-2.5 py-1.5 bg-white">
              <Calendar className="w-3.5 h-3.5 text-[#8190A0] shrink-0" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => handleFromDateChange(e.target.value)}
                className="text-[12px] text-[#132238] bg-transparent border-0 p-0 focus:ring-0 focus:outline-none font-mono"
              />
              <span className="text-[#8190A0] text-xs">-</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => handleToDateChange(e.target.value)}
                className="text-[12px] text-[#132238] bg-transparent border-0 p-0 focus:ring-0 focus:outline-none font-mono"
              />
            </div>

            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="px-3 py-2 rounded-[6px] border border-[#DDE5EC] text-[12.5px] font-medium text-[#526377] bg-white focus:outline-none focus:ring-2 focus:ring-[#059DB0] transition"
            >
              <option value="custom">Date Preset</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="quarter">This quarter</option>
              <option value="year">This year</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* Removable chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EAF0F4] text-[12px]">
            <span className="text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider mr-1">Active filters:</span>
            
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#F3F6F8] border border-[#DDE5EC] text-[#526377] rounded-[4px] transition cursor-pointer hover:bg-[#EDF2F6]" onClick={() => clearFilter('q')}>
                Search: &quot;{searchQuery}&quot;
                <span className="font-bold ml-1">×</span>
              </span>
            )}

            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#F3F6F8] border border-[#DDE5EC] text-[#526377] rounded-[4px] transition cursor-pointer hover:bg-[#EDF2F6]" onClick={() => clearFilter('status')}>
                Status: {statusFilter}
                <span className="font-bold ml-1">×</span>
              </span>
            )}

            {categoryFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#F3F6F8] border border-[#DDE5EC] text-[#526377] rounded-[4px] transition cursor-pointer hover:bg-[#EDF2F6]" onClick={() => clearFilter('category_id')}>
                Category: {categories.find(c => c.id === categoryFilter)?.name || 'Selected'}
                <span className="font-bold ml-1">×</span>
              </span>
            )}

            {selectedOwner && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#F3F6F8] border border-[#DDE5EC] text-[#526377] rounded-[4px] transition cursor-pointer hover:bg-[#EDF2F6]" onClick={() => clearFilter('owner_id')}>
                Owner: {selectedOwner.name}
                <span className="font-bold ml-1">×</span>
              </span>
            )}

            {(fromDate || toDate) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#F3F6F8] border border-[#DDE5EC] text-[#526377] rounded-[4px] transition cursor-pointer hover:bg-[#EDF2F6]" onClick={() => clearFilter('date')}>
                Date: {fromDate || '*'} to {toDate || '*'}
                <span className="font-bold ml-1">×</span>
              </span>
            )}

            {activeFilterCount >= 2 && (
              <button
                onClick={clearAllFilters}
                type="button"
                className="text-[12px] font-semibold text-[#012F6B] hover:text-[#033E79] hover:underline ml-2"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'active' ? (
        /* Two Buckets Layout (Active Requests) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Bucket A: Involved In */}
          <div className="bg-white border border-[#DDE5EC] rounded-[10px] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#DDE5EC] bg-[#F7FAFC] flex justify-between items-center">
              <div>
                <h3 className="text-[15px] font-semibold text-[#132238] font-sans">Involved in</h3>
                <p className="text-[12px] text-[#526377] mt-0.5">Requests where you are on the approval path</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#F1FBFC] text-[#012F6B] border border-[#DDF5F7]">
                {involvedIn.length} requests
              </span>
            </div>

            {involvedIn.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-2">
                <Inbox className="w-10 h-10 text-[#8190A0] mx-auto" />
                <h4 className="text-[15px] font-semibold text-[#132238] font-sans">
                  {hasActiveFilters ? 'No requests match your filters' : 'No requests found'}
                </h4>
                <p className="text-[13px] text-[#526377] max-w-sm mx-auto leading-relaxed">
                  {hasActiveFilters 
                    ? 'Try clearing some filters to broaden your search results.' 
                    : 'Inbox is clean! You have no pending requests to approve.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center justify-center px-3.5 py-1.5 border border-[#DDE5EC] text-[#132238] hover:bg-[#F7FAFC] rounded-[6px] text-[12px] font-medium transition"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#EAF0F4] max-h-[480px] overflow-y-auto">
                {involvedIn.map((req) => {
                  const catName = req.categories?.name || 'Uncategorized';
                  return (
                    <div key={req.id} className="p-4 hover:bg-[#F9FBFC] transition flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="text-[13.5px] font-medium text-[#132238] hover:text-[#012F6B] transition truncate block">
                          {req.subject}
                        </Link>
                        <div className="flex items-center gap-2 text-[12px] text-[#8190A0]">
                          <span className="font-medium text-[#526377]">{catName}</span>
                          <span>•</span>
                          <span className="font-mono">{formatDate(req.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={getStatusPillClasses(req.status)}>
                          {req.status === 'in_discussion' ? 'discuss' : req.status === 'pending' ? 'pending' : req.status}
                        </span>
                        <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="p-1 text-[#8190A0] hover:text-[#012F6B] transition">
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
          <div className="bg-white border border-[#DDE5EC] rounded-[10px] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#DDE5EC] bg-[#F7FAFC] flex justify-between items-center">
              <div>
                <h3 className="text-[15px] font-semibold text-[#132238] font-sans">Raised by me</h3>
                <p className="text-[12px] text-[#526377] mt-0.5">Requests you submitted for approval</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#F1FBFC] text-[#012F6B] border border-[#DDF5F7]">
                {raisedByMe.length} requests
              </span>
            </div>

            {raisedByMe.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-2">
                <FileText className="w-10 h-10 text-[#8190A0] mx-auto" />
                <h4 className="text-[15px] font-semibold text-[#132238] font-sans">
                  {hasActiveFilters ? 'No requests match your filters' : 'No requests found'}
                </h4>
                <p className="text-[13px] text-[#526377] max-w-sm mx-auto leading-relaxed">
                  {hasActiveFilters 
                    ? 'Try clearing some filters to broaden your search results.' 
                    : "You haven't submitted any requests."}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center justify-center px-3.5 py-1.5 border border-[#DDE5EC] text-[#132238] hover:bg-[#F7FAFC] rounded-[6px] text-[12px] font-medium transition"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#EAF0F4] max-h-[480px] overflow-y-auto">
                {raisedByMe.map((req) => {
                  const catName = req.categories?.name || 'Uncategorized';
                  return (
                    <div key={req.id} className="p-4 hover:bg-[#F9FBFC] transition flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="text-[13.5px] font-medium text-[#132238] hover:text-[#012F6B] transition truncate block">
                          {req.subject}
                        </Link>
                        <div className="flex items-center gap-2 text-[12px] text-[#8190A0]">
                          <span className="font-medium text-[#526377]">{catName}</span>
                          <span>•</span>
                          <span className="font-mono">{formatDate(req.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={getStatusPillClasses(req.status)}>
                          {req.status === 'in_discussion' ? 'discuss' : req.status === 'pending' ? 'pending' : req.status}
                        </span>
                        <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="p-1 text-[#8190A0] hover:text-[#012F6B] transition">
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
        <div className="bg-white border border-[#DDE5EC] rounded-[10px] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#DDE5EC] bg-[#F7FAFC] flex justify-between items-center">
            <div>
              <h3 className="text-[15px] font-semibold text-[#132238] font-sans">Archived Requests</h3>
              <p className="text-[12px] text-[#526377] mt-0.5">Requests belonging to inactive/exited employees</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#F1FBFC] text-[#012F6B] border border-[#DDF5F7]">
              {archivedRequests.length} requests
            </span>
          </div>

          {archivedRequests.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-2">
              <Archive className="w-10 h-10 text-[#8190A0] mx-auto" />
              <h4 className="text-[15px] font-semibold text-[#132238] font-sans">
                {hasActiveFilters ? 'No archived requests match your filters' : 'No archived requests'}
              </h4>
              <p className="text-[13px] text-[#526377] max-w-sm mx-auto leading-relaxed">
                {hasActiveFilters 
                  ? 'Try clearing some filters to broaden your search results.' 
                  : 'There are no archived requests.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center justify-center px-3.5 py-1.5 border border-[#DDE5EC] text-[#132238] hover:bg-[#F7FAFC] rounded-[6px] text-[12px] font-medium transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#EAF0F4] text-left text-sm font-sans">
                <thead className="bg-[#F7FAFC]">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider">Subject</th>
                    <th scope="col" className="px-6 py-3 text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider">Owner</th>
                    <th scope="col" className="px-6 py-3 text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider">Category</th>
                    <th scope="col" className="px-6 py-3 text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider">Created</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#EAF0F4]">
                  {archivedRequests.map((req) => {
                    const ownerName = req.owner?.name || 'Unknown';
                    const categoryName = req.categories?.name || 'Uncategorized';
                    return (
                      <tr key={req.id} className="hover:bg-[#F9FBFC] transition">
                        <td className="px-6 py-3.5 whitespace-nowrap text-[13.5px] font-medium text-[#132238]">{req.subject}</td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-[13px] text-[#526377]">{ownerName}</td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-[13px] text-[#526377]">{categoryName}</td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <span className={getStatusPillClasses(req.status)}>
                            {req.status === 'in_discussion' ? 'discuss' : req.status === 'pending' ? 'pending' : req.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-[#8190A0] font-mono">{formatDate(req.created_at)}</td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right text-[13px]">
                          <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="inline-flex items-center gap-1 text-[#012F6B] hover:text-[#033E79] font-medium transition">
                            View
                            <ArrowRight className="w-3.5 h-3.5" />
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

      {/* Footer */}
      <div className="pt-4 text-center text-[12px] font-mono text-[#8190A0]">
        {VOCABULARY.searchFooter(involvedIn.length + raisedByMe.length, '0.4s')}
      </div>
    </div>
  );
}
