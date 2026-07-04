'use client';

import { useState, useEffect, useRef } from 'react';
import { searchUsersAction, getUserByIdAction, PickableUser } from './personPickerActions';
import { Search, X } from 'lucide-react';

interface PersonPickerProps {
  tenant: string;
  exclude?: string[];
  activeOnly?: boolean;
  value?: string | null;
  onSelect?: (userId: string | null) => void;
  placeholder?: string;
  name?: string;
}

export default function PersonPicker({
  tenant,
  exclude = [],
  activeOnly = true,
  value = null,
  onSelect,
  placeholder = "Search employee by name, email, or ID...",
  name
}: PersonPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickableUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<PickableUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Load user details on mount / value change to pre-fill name
  useEffect(() => {
    if (value) {
      if (selectedUser && selectedUser.id === value) return; // already loaded
      setLoading(true);
      getUserByIdAction(value)
        .then((user) => {
          setSelectedUser(user);
          setQuery(user ? user.name : '');
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setSelectedUser(null);
      setQuery('');
    }
  }, [value]);

  // 2. Debounce and trigger search
  useEffect(() => {
    if (!isOpen) return;
    
    // If query matches the currently selected user name, don't re-trigger search
    if (selectedUser && query === selectedUser.name) {
      return;
    }

    const trimmed = query.trim();
    
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      searchUsersAction(trimmed, tenant, exclude, activeOnly)
        .then((users) => {
          setResults(users);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [query, isOpen, tenant, activeOnly, JSON.stringify(exclude)]);

  // 3. Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery(selectedUser ? selectedUser.name : '');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedUser]);

  const handleSelect = (user: PickableUser) => {
    setSelectedUser(user);
    setQuery(user.name);
    setIsOpen(false);
    if (onSelect) onSelect(user.id);
  };

  const handleClear = () => {
    setSelectedUser(null);
    setQuery('');
    setResults([]);
    if (onSelect) onSelect(null);
  };

  // Capped at 8 results max for display
  const displayResults = results.slice(0, 8);
  const hasMore = results.length > 8;

  return (
    <div className="relative w-full font-body" ref={containerRef}>
      {name && (
        <input type="hidden" name={name} value={selectedUser ? selectedUser.id : ''} />
      )}
      
      <div className="relative rounded-xl shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4.5 h-4.5" />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-sm font-medium bg-white"
          placeholder={placeholder}
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute w-full mt-1.5 bg-white border border-gray-100 rounded-xl shadow-lg z-50 p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
          {loading && results.length === 0 && (
            <div className="text-center py-4 text-xs font-semibold text-gray-400 animate-pulse">
              Searching employee database...
            </div>
          )}
          
          {!loading && results.length === 0 && (
            <div className="text-center py-4 text-xs font-semibold text-gray-400">
              No matching employee
            </div>
          )}

          {displayResults.map((user) => {
            const desig = user.designation || 'Staff';
            const empId = user.employee_id ? `Emp ID: ${user.employee_id}` : 'No ID';
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 flex flex-col transition duration-75"
              >
                <span className="text-sm font-bold text-ink">
                  {user.name} <span className="text-xs font-medium text-gray-400">— {desig} ({empId})</span>
                </span>
                <span className="text-xs text-gray-400 font-semibold">{user.email}</span>
              </button>
            );
          })}

          {hasMore && (
            <div className="text-center py-1.5 border-t border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 rounded-b-lg">
              Keep typing to narrow matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}
