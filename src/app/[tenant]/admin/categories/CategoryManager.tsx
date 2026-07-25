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
  tenantId,
  prefilledSla
}: {
  categories: Category[];
  tenantId: string;
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
      await createCategoryAction(tenantId, name.trim(), Number(slaHours), {
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
      
      // Let's optimistic update the local state
      setCategories(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          name: name.trim(),
          default_sla_hours: Number(slaHours)
        }
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Create New Category Form */}
      <form onSubmit={handleCreate} className="bg-white border border-gray-100 shadow-sm rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-ink font-sans flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand" />
            Create Request Category
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Add a new workflow category with default SLA parameters.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing Budget Approval"
              required
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-xs font-bold bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
              Default SLA (Hours)
            </label>
            <input
              type="number"
              value={slaHours}
              onChange={(e) => setSlaHours(Number(e.target.value))}
              min={1}
              required
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-xs font-bold bg-white"
            />
          </div>
        </div>

        
        {/* Validity & Duration Rules */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
            Validity & Duration Settings
          </label>
          <p className="text-2xs text-gray-500 font-medium">
            Use Required for exception-type categories — an exception with no end date becomes an unrecorded policy change.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">Requirement</label>
              <select
                value={validityMode}
                onChange={(e) => setValidityMode(e.target.value as any)}
                className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent sm:text-xs font-bold bg-white"
              >
                <option value="NONE">Not applicable (No end date)</option>
                <option value="OPTIONAL">Optional duration</option>
                <option value="REQUIRED">Required duration</option>
              </select>
            </div>

            {validityMode !== 'NONE' && (
              <>
                <div>
                  <label className="block text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">Default (Days)</label>
                  <input
                    type="number"
                    value={defaultValidityDays}
                    onChange={(e) => setDefaultValidityDays(e.target.value)}
                    placeholder="e.g. 90"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent sm:text-xs font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">Max Duration (Days)</label>
                  <input
                    type="number"
                    value={maxValidityDays}
                    onChange={(e) => setMaxValidityDays(e.target.value)}
                    placeholder="e.g. 365"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent sm:text-xs font-bold bg-white"
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
                className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-accent"
              />
              <span className="text-xs font-semibold text-ink">Review date only (does not expire approval)</span>
            </label>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-brand hover:bg-brand-light text-white text-xs font-bold rounded-xl shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {submitting ? 'Creating...' : 'Create Category'}
          </button>
        </div>
      </form>

      {/* Category List */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-ink font-sans flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand" />
            Active Categories
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">List of all active workflow categories configured for this tenant.</p>
        </div>

        <div className="overflow-hidden border border-gray-100 rounded-xl">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Category Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Default SLA
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-ink">
                    {cat.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                    {cat.name.toLowerCase().replace(/\s+/g, '-')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600">
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
