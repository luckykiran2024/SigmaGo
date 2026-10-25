'use client';

import { useState } from 'react';
import { createCategoryAction } from './actions';
import { Plus, Tag, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  default_sla_hours: number | null;
}

export default function CategoryManager({
  categories: initialCategories,
  tenantSubdomain,
  prefilledSla
}: {
  categories: Category[];
  tenantSubdomain: string;
  prefilledSla: number;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState('');
  const [slaHours, setSlaHours] = useState(prefilledSla);
  const [validityMode, setValidityMode] = useState<'NONE' | 'OPTIONAL' | 'REQUIRED'>('NONE');
  const [defaultValidityDays, setDefaultValidityDays] = useState<string>('');
  const [maxValidityDays, setMaxValidityDays] = useState<string>('');
  const [reviewOnly, setReviewOnly] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const created = await createCategoryAction(tenantSubdomain, name.trim(), Number(slaHours), {
        validity_mode: validityMode,
        default_validity_days: defaultValidityDays ? Number(defaultValidityDays) : null,
        max_validity_days: maxValidityDays ? Number(maxValidityDays) : null,
        review_only: reviewOnly
      });
      setName('');
      setSlaHours(prefilledSla);
      setValidityMode('NONE');
      setDefaultValidityDays('');
      setMaxValidityDays('');
      setReviewOnly(false);
      
      // Refresh router and state
      router.refresh();
      
      setCategories(prev => [...prev, created]);
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Create New Category Form */}
      <form onSubmit={handleCreate} className="bg-white border border-[#DCE5EA] shadow-xs rounded-xl p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#17324D] font-sans flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#0B7780]" />
            Create Request Category
          </h3>
          <p className="text-xs text-[#526679] mt-0.5">Add a new workflow category with default SLA parameters.</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#182B3D] uppercase tracking-wider">
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing Budget Approval"
              required
              className="appearance-none block w-full px-3 py-2 border border-[#DCE5EA] rounded-lg shadow-xs text-[#182B3D] placeholder-[#637587] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition text-xs font-medium bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#182B3D] uppercase tracking-wider">
              Default SLA (Hours)
            </label>
            <input
              type="number"
              value={slaHours}
              onChange={(e) => setSlaHours(Number(e.target.value))}
              min={1}
              required
              className="appearance-none block w-full px-3 py-2 border border-[#DCE5EA] rounded-lg shadow-xs text-[#182B3D] placeholder-[#637587] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition text-xs font-medium bg-white"
            />
          </div>
        </div>

        {/* Validity & Duration Rules */}
        <div className="border-t border-[#DCE5EA] pt-4 space-y-2.5">
          <label className="block text-xs font-bold text-[#182B3D] uppercase tracking-wider">
            Validity & Duration Settings
          </label>
          <p className="text-xs text-[#526679] font-medium">
            Use Required for exception-type categories — an exception with no end date becomes an unrecorded policy change.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#526679] uppercase tracking-wider mb-1">Requirement</label>
              <select
                value={validityMode}
                onChange={(e) => setValidityMode(e.target.value as any)}
                className="appearance-none block w-full px-3 py-2 border border-[#DCE5EA] rounded-lg shadow-xs text-[#182B3D] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] text-xs font-medium bg-white"
              >
                <option value="NONE">Not applicable (No end date)</option>
                <option value="OPTIONAL">Optional duration</option>
                <option value="REQUIRED">Required duration</option>
              </select>
            </div>

            {validityMode !== 'NONE' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-[#526679] uppercase tracking-wider mb-1">Default (Days)</label>
                  <input
                    type="number"
                    value={defaultValidityDays}
                    onChange={(e) => setDefaultValidityDays(e.target.value)}
                    placeholder="e.g. 90"
                    className="appearance-none block w-full px-3 py-2 border border-[#DCE5EA] rounded-lg shadow-xs text-[#182B3D] placeholder-[#637587] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] text-xs font-medium bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#526679] uppercase tracking-wider mb-1">Max Duration (Days)</label>
                  <input
                    type="number"
                    value={maxValidityDays}
                    onChange={(e) => setMaxValidityDays(e.target.value)}
                    placeholder="e.g. 365"
                    className="appearance-none block w-full px-3 py-2 border border-[#DCE5EA] rounded-lg shadow-xs text-[#182B3D] placeholder-[#637587] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] text-xs font-medium bg-white"
                  />
                </div>
              </>
            )}
          </div>

          {validityMode !== 'NONE' && (
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={reviewOnly}
                onChange={(e) => setReviewOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[#DCE5EA] text-[#0B7780] focus:ring-[#0B7780]"
              />
              <span className="text-xs font-medium text-[#182B3D]">Review date only (does not expire approval)</span>
            </label>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center px-4 py-2 bg-[#17324D] hover:bg-[#224564] text-white text-xs font-bold rounded-lg shadow-xs transition"
          >
            {submitting ? 'Creating...' : 'Create Category'}
          </button>
        </div>
      </form>

      {/* Category List */}
      <div className="bg-white border border-[#DCE5EA] shadow-xs rounded-xl p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#17324D] font-sans flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#0B7780]" />
            Active Categories
          </h3>
          <p className="text-xs text-[#526679] mt-0.5">List of all active workflow categories configured for this tenant.</p>
        </div>

        <div className="overflow-hidden border border-[#DCE5EA] rounded-lg">
          <table className="min-w-full divide-y divide-[#DCE5EA]">
            <thead className="bg-[#F6F8F9]">
              <tr>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-bold text-[#526679] uppercase tracking-wider">
                  Category Name
                </th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-bold text-[#526679] uppercase tracking-wider">
                  Slug
                </th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-bold text-[#526679] uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#0B7780]" />
                    Default SLA
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#DCE5EA]">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-[#F6F8F9] transition">
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs font-bold text-[#182B3D]">
                    {cat.name}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-[#526679]">
                    {cat.name.toLowerCase().replace(/\s+/g, '-')}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs font-bold text-[#17324D] font-mono">
                    {cat.default_sla_hours || prefilledSla} Hours
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
