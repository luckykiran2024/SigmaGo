'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Inbox, FileText, ArrowRight, Archive, Calendar } from 'lucide-react';
import PersonPicker from '@/components/ui/PersonPicker';

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
    const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-3xs font-black uppercase tracking-widest border font-ibmmono ";
    if (status === 'approved') return base + "bg-ok/10 text-ok border-ok/20";
    if (status === 'rejected') return base + "bg-err/10 text-err border-err/20";
    if (status === 'blocked') return base + "bg-err/10 text-err border-err/20 animate-pulse";
    if (status === 'in_discussion') return base + "bg-info/10 text-info border-info/20";
    return base + "bg-warn/10 text-warn border-warn/20"; // pending
  };

  return (
    <div className="space-y-6 font-ibmsans text-ink">
      
      {/* Admin Tab Bar */}
      {isAdmin && (
        <div className="flex border-b border-hair gap-4 font-ibmsans">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 text-sm font-bold transition relative ${
              activeTab === 'active' ? 'text-accent' : 'text-muted hover:text-ink'
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
              activeTab === 'archived' ? 'text-accent' : 'text-muted hover:text-ink'
            }`}
          >
            Archived Requests
            {activeTab === 'archived' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent rounded-full" />
            )}
          </button>
        </div>
      )}

      {/* FILTER BAR - Single Row responsive layout */}
      <div className="bg-paper border border-hair rounded-[14px] shadow-[0_10px_28px_rgba(60,55,30,0.10)] p-4 space-y-4">
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center">
          {/* Search (existing) */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-4 py-2.5 rounded-xl border border-hair text-xs text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-transparent transition bg-white"
              placeholder="Search subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Select */}
          <div className="w-full xl:w-40 shrink-0">
            <select
              className="block w-full px-3 py-2.5 rounded-xl border border-hair text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-transparent bg-white transition font-bold"
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
              className="block w-full px-3 py-2.5 rounded-xl border border-hair text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-transparent bg-white transition font-bold"
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Raised by Owner (PersonPicker searchable typeahead) */}
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
            <div className="flex items-center gap-1.5 border border-hair rounded-xl px-3 py-1.5 bg-white">
              <Calendar className="w-3.5 h-3.5 text-muted shrink-0" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => handleFromDateChange(e.target.value)}
                className="text-xs font-bold text-ink bg-transparent border-0 p-0 focus:ring-0 focus:outline-none font-ibmmono"
              />
              <span className="text-muted text-xs">-</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => handleToDateChange(e.target.value)}
                className="text-xs font-bold text-ink bg-transparent border-0 p-0 focus:ring-0 focus:outline-none font-ibmmono"
              />
            </div>

            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-hair text-xs font-bold text-muted bg-white focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-transparent transition"
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
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-hair font-ibmmono">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider mr-1">Active filters:</span>
            
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-panel border border-hair hover:bg-panel/80 text-muted text-[10px] font-bold rounded-lg transition cursor-pointer" onClick={() => clearFilter('q')}>
                Search: "{searchQuery}"
                <span className="text-muted font-extrabold ml-1">×</span>
              </span>
            )}

            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-panel border border-hair hover:bg-panel/80 text-muted text-[10px] font-bold rounded-lg transition cursor-pointer" onClick={() => clearFilter('status')}>
                Status: {statusFilter}
                <span className="text-muted font-extrabold ml-1">×</span>
              </span>
            )}

            {categoryFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-panel border border-hair hover:bg-panel/80 text-muted text-[10px] font-bold rounded-lg transition cursor-pointer" onClick={() => clearFilter('category_id')}>
                Category: {categories.find(c => c.id === categoryFilter)?.name || 'Selected'}
                <span className="text-muted font-extrabold ml-1">×</span>
              </span>
            )}

            {selectedOwner && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-panel border border-hair hover:bg-panel/80 text-muted text-[10px] font-bold rounded-lg transition cursor-pointer" onClick={() => clearFilter('owner_id')}>
                Owner: {selectedOwner.name}
                <span className="text-muted font-extrabold ml-1">×</span>
              </span>
            )}

            {(fromDate || toDate) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-panel border border-hair hover:bg-panel/80 text-muted text-[10px] font-bold rounded-lg transition cursor-pointer" onClick={() => clearFilter('date')}>
                Date: {fromDate || '*'} to {toDate || '*'}
                <span className="text-muted font-extrabold ml-1">×</span>
              </span>
            )}

            {activeFilterCount >= 2 && (
              <button
                onClick={clearAllFilters}
                type="button"
                className="text-[10px] font-extrabold text-accent hover:text-accent-deep hover:underline ml-2"
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
          <div className="bg-paper border border-hair rounded-[14px] shadow-[0_10px_28px_rgba(60,55,30,0.10)] overflow-hidden">
            <div className="px-6 py-5 border-b border-hair bg-panel/50 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-ink font-ibmserif">Involved in</h3>
                <p className="text-xs text-muted font-semibold mt-0.5">Requests where you are on the approval path</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/10 text-accent border border-accent/20 font-ibmmono">
                {involvedIn.length} requests
              </span>
            </div>

            {involvedIn.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <Inbox className="w-12 h-12 text-muted mx-auto" />
                <h4 className="text-sm font-bold text-ink font-ibmserif">
                  {hasActiveFilters ? 'No requests match your filters' : 'No requests found'}
                </h4>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  {hasActiveFilters 
                    ? 'Try clearing some filters to broaden your search results.' 
                    : 'Inbox is clean! You have no pending requests to approve.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center justify-center px-4 py-2 border border-hair text-ink bg-transparent hover:bg-panel rounded-full text-xs font-bold transition shadow-3xs"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-hair max-h-[480px] overflow-y-auto">
                {involvedIn.map((req) => {
                  const catName = req.categories?.name || 'Uncategorized';
                  return (
                    <div key={req.id} className="p-5 hover:bg-panel/30 transition flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="text-sm font-bold text-ink hover:text-accent transition truncate block">
                          {req.subject}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-2xs font-semibold text-muted uppercase tracking-wider font-ibmmono">{catName}</span>
                          <span className="text-hair">•</span>
                          <span className="text-2xs text-muted font-semibold font-ibmmono">{formatDate(req.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={getStatusPillClasses(req.status)}>
                          {req.status === 'in_discussion' ? 'discuss' : req.status === 'pending' ? 'pending' : req.status}
                        </span>
                        <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="p-1 text-muted hover:text-accent transition">
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
          <div className="bg-paper border border-hair rounded-[14px] shadow-[0_10px_28px_rgba(60,55,30,0.10)] overflow-hidden">
            <div className="px-6 py-5 border-b border-hair bg-panel/50 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-ink font-ibmserif">Raised by me</h3>
                <p className="text-xs text-muted font-semibold mt-0.5">Requests you submitted for approval</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/10 text-accent border border-accent/20 font-ibmmono">
                {raisedByMe.length} requests
              </span>
            </div>

            {raisedByMe.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <FileText className="w-12 h-12 text-muted mx-auto" />
                <h4 className="text-sm font-bold text-ink font-ibmserif">
                  {hasActiveFilters ? 'No requests match your filters' : 'No requests found'}
                </h4>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  {hasActiveFilters 
                    ? 'Try clearing some filters to broaden your search results.' 
                    : "You haven't submitted any requests."}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center justify-center px-4 py-2 border border-hair text-ink bg-transparent hover:bg-panel rounded-full text-xs font-bold transition shadow-3xs"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-hair max-h-[480px] overflow-y-auto">
                {raisedByMe.map((req) => {
                  const catName = req.categories?.name || 'Uncategorized';
                  return (
                    <div key={req.id} className="p-5 hover:bg-panel/30 transition flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="text-sm font-bold text-ink hover:text-accent transition truncate block">
                          {req.subject}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-2xs font-semibold text-muted uppercase tracking-wider font-ibmmono">{catName}</span>
                          <span className="text-hair">•</span>
                          <span className="text-2xs text-muted font-semibold font-ibmmono">{formatDate(req.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={getStatusPillClasses(req.status)}>
                          {req.status === 'in_discussion' ? 'discuss' : req.status === 'pending' ? 'pending' : req.status}
                        </span>
                        <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="p-1 text-muted hover:text-accent transition">
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
        <div className="bg-paper border border-hair rounded-[14px] shadow-[0_10px_28px_rgba(60,55,30,0.10)] overflow-hidden">
          <div className="px-6 py-5 border-b border-hair bg-panel/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-ink font-ibmserif">Archived Requests</h3>
              <p className="text-xs text-muted font-semibold mt-0.5">Requests belonging to inactive/exited employees</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/10 text-accent border border-accent/20 font-ibmmono">
              {archivedRequests.length} requests
            </span>
          </div>

          {archivedRequests.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <Archive className="w-12 h-12 text-muted mx-auto" />
              <h4 className="text-sm font-bold text-ink font-ibmserif">
                {hasActiveFilters ? 'No archived requests match your filters' : 'No archived requests'}
              </h4>
              <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                {hasActiveFilters 
                  ? 'Try clearing some filters to broaden your search results.' 
                  : 'There are no archived requests.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center justify-center px-4 py-2 border border-hair text-ink bg-transparent hover:bg-panel rounded-full text-xs font-bold transition shadow-3xs"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-hair text-left text-sm">
                <thead className="bg-panel">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-xs font-bold text-muted uppercase tracking-wider font-ibmmono">Subject</th>
                    <th scope="col" className="px-6 py-3.5 text-xs font-bold text-muted uppercase tracking-wider font-ibmmono">Owner</th>
                    <th scope="col" className="px-6 py-3.5 text-xs font-bold text-muted uppercase tracking-wider font-ibmmono">Category</th>
                    <th scope="col" className="px-6 py-3.5 text-xs font-bold text-muted uppercase tracking-wider font-ibmmono">Status</th>
                    <th scope="col" className="px-6 py-3.5 text-xs font-bold text-muted uppercase tracking-wider font-ibmmono">Created</th>
                    <th scope="col" className="relative px-6 py-3.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-paper divide-y divide-hair">
                  {archivedRequests.map((req) => {
                    const ownerName = req.owner?.name || 'Unknown';
                    const categoryName = req.categories?.name || 'Uncategorized';
                    return (
                      <tr key={req.id} className="hover:bg-panel/30 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-ink">{req.subject}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-ink">{ownerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-muted">{categoryName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getStatusPillClasses(req.status)}>
                            {req.status === 'in_discussion' ? 'discuss' : req.status === 'pending' ? 'pending' : req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted font-semibold font-ibmmono">{formatDate(req.created_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                          <Link href={`/${tenantSubdomain}/requests/${req.id}`} className="inline-flex items-center gap-1 text-accent hover:text-accent-deep transition">
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
