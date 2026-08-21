'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface CategoryOption {
  id: string;
  name: string;
  domain?: string | null;
  requester_description?: string | null;
  step_type?: string;
  governing_policy_id?: string | null;
}

interface GroupedCategoryPickerProps {
  categories: CategoryOption[];
  selectedCategoryId: string;
  onSelectCategory: (category: CategoryOption | null) => void;
}

export default function GroupedCategoryPicker({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: GroupedCategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCat = categories.find((c) => c.id === selectedCategoryId);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter categories by search term (matching name or description)
  const filtered = categories.filter((cat) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = cat.name.toLowerCase().includes(q);
    const descMatch = (cat.requester_description || '').toLowerCase().includes(q);
    return nameMatch || descMatch;
  });

  // Group by domain
  const domainOrder = ['PEOPLE', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'GOVERNANCE', 'OTHER'];
  const domainLabels: Record<string, string> = {
    PEOPLE: 'PEOPLE',
    FINANCE: 'FINANCE',
    COMMERCIAL: 'COMMERCIAL',
    OPERATIONS: 'OPERATIONS',
    GOVERNANCE: 'GOVERNANCE',
    OTHER: 'OTHER',
  };

  const grouped: Record<string, CategoryOption[]> = {};

  filtered.forEach((cat) => {
    const d = (cat.domain || 'OTHER').toUpperCase();
    const groupName = domainLabels[d] || 'OTHER';
    if (!grouped[groupName]) {
      grouped[groupName] = [];
    }
    grouped[groupName].push(cat);
  });

  const availableDomains = domainOrder.filter((d) => grouped[d] && grouped[d].length > 0);

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      <label className="block text-sm font-bold text-ink mb-1.5">
        WHAT KIND OF DECISION IS THIS?
      </label>

      {/* Hidden input for form submission compatibility */}
      <input type="hidden" name="category" value={selectedCategoryId} />

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-gray-200 py-3 px-4 text-ink shadow-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition text-left"
      >
        {selectedCat ? (
          <div>
            <div className="text-sm font-bold text-ink">{selectedCat.name}</div>
            <div className="text-xs text-gray-500 font-medium truncate max-w-md mt-0.5">
              {selectedCat.requester_description || selectedCat.name}
            </div>
          </div>
        ) : (
          <span className="text-sm font-medium text-gray-400">Select decision type...</span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-3 space-y-3 max-h-96 overflow-y-auto animate-in fade-in duration-150">
          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category or description..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
          </div>

          {availableDomains.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400 font-bold">
              No matching decision types found.
            </div>
          ) : (
            <div className="space-y-4">
              {availableDomains.map((domain) => (
                <div key={domain} className="space-y-1">
                  <div className="text-[11px] font-extrabold tracking-wider uppercase text-gray-400 px-2">
                    {domain}
                  </div>
                  <div className="space-y-0.5">
                    {grouped[domain].map((cat) => {
                      const isSelected = cat.id === selectedCategoryId;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            onSelectCategory(cat);
                            setIsOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition flex items-start justify-between group ${
                            isSelected
                              ? 'bg-brand/10 text-brand font-bold'
                              : 'hover:bg-gray-50 text-ink'
                          }`}
                        >
                          <div className="pr-2">
                            <div className="text-xs font-bold flex items-center gap-1.5">
                              <span className="text-brand font-bold">▸</span>
                              <span>{cat.name}</span>
                            </div>
                            {cat.requester_description && (
                              <div className="text-[11px] text-gray-500 font-medium mt-0.5 leading-snug">
                                {cat.requester_description}
                              </div>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
