import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProfileForAuthUser } from '@/lib/db/users';
import Link from 'next/link';
import { ShieldAlert, Plus, HelpCircle, FileText, ArrowRight } from 'lucide-react';
import { getUnrecordedRulesSkips } from '@/lib/db/reference_skips';

export default async function UnrecordedRulesAdminPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  const tenantSubdomain = resolvedParams.tenant;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) redirect('/login');

  const skips = await getUnrecordedRulesSkips(profile.tenant_id);

  // Group skips by described_rule / category
  const groupedSkips: Record<string, {
    described_rule: string;
    category_name: string;
    category_id: string;
    count: number;
    last_skipped_at: string;
    skips: any[];
  }> = {};

  skips.forEach((item: any) => {
    const key = item.described_rule ? item.described_rule.trim().toLowerCase() : `unnamed_${item.category_id}`;
    const ruleLabel = item.described_rule || 'Unrecorded rule (No text provided)';
    const categoryName = item.categories?.name || 'Uncategorized';

    if (!groupedSkips[key]) {
      groupedSkips[key] = {
        described_rule: ruleLabel,
        category_name: categoryName,
        category_id: item.category_id,
        count: 0,
        last_skipped_at: item.skipped_at,
        skips: []
      };
    }
    groupedSkips[key].count += 1;
    groupedSkips[key].skips.push(item);
  });

  const groupedList = Object.values(groupedSkips).sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-[1240px] mx-auto px-4 py-8 space-y-6 font-sans">
      <div className="border-b border-gray-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-brand" />
            <span>Admin Governance Queue</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink mt-1">
            Unrecorded Rules & Policy Gap Queue
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Decisions submitted where requesters indicated an unrecorded or missing governing rule.
          </p>
        </div>
      </div>

      {groupedList.length === 0 ? (
        <div className="p-8 text-center bg-white border border-gray-200 rounded-xl space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-ink">No Unrecorded Rule Skips</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            All submitted decisions have been linked to active governing rules.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {groupedList.length} Identified Policy Gaps
          </div>

          <div className="space-y-3">
            {groupedList.map((group, idx) => (
              <div
                key={idx}
                className="p-5 bg-white border border-gray-200 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-gray-300 transition"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 uppercase">
                      {group.category_name}
                    </span>
                    <span className="text-xs font-extrabold text-brand bg-brand/10 px-2 py-0.5 rounded">
                      {group.count} {group.count === 1 ? 'skip' : 'skips'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-ink">{group.described_rule}</h3>
                  <p className="text-xs text-gray-400">
                    Latest skipped on {new Date(group.last_skipped_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/${tenantSubdomain}/requests/new?stepType=PROCESS&title=${encodeURIComponent(group.described_rule)}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-deep transition shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record this rule</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
