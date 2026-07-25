import { adminClient } from '../supabase/admin';

export interface AiQueryResult {
  templateId: string;
  summary: string;
  resolvedRange?: string;
  count: number;
  data: Array<Record<string, any>>;
  columns: Array<{ key: string; label: string }>;
  deepLink: string;
}

export async function executeTemplateQuery(
  templateId: string,
  tenantId: string,
  tenantSubdomain: string,
  params: Record<string, any>
): Promise<AiQueryResult> {
  const dateFrom = params.dateFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = params.dateTo || new Date().toISOString();

  switch (templateId) {
    case 'T1': {
      // count_by_category
      let query = adminClient
        .from('approval_requests')
        .select('id, categories(name)', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (params.categoryId) query = query.eq('category_id', params.categoryId);

      const { data, count } = await query;
      const categoryCounts: Record<string, number> = {};
      for (const r of data || []) {
        const name = (r.categories as any)?.name || 'Uncategorized';
        categoryCounts[name] = (categoryCounts[name] || 0) + 1;
      }

      const rows = Object.entries(categoryCounts).map(([cat, cnt]) => ({ category: cat, count: cnt }));
      const catName = params.categoryName ? ` "${params.categoryName}"` : '';

      return {
        templateId: 'T1',
        summary: `Found ${count || 0}${catName} approval requests during this period.`,
        resolvedRange: params.resolvedRangeText || 'Last 1 Year',
        count: count || 0,
        data: rows,
        columns: [
          { key: 'category', label: 'Category' },
          { key: 'count', label: 'Total Requests' }
        ],
        deepLink: `/${tenantSubdomain}/approvals?${params.categoryId ? `category_id=${params.categoryId}` : ''}`
      };
    }

    case 'T2': {
      // count_by_status
      const { data } = await adminClient
        .from('approval_requests')
        .select('id, status')
        .eq('tenant_id', tenantId)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      const statusCounts: Record<string, number> = {};
      for (const r of data || []) {
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      }

      const rows = Object.entries(statusCounts).map(([st, cnt]) => ({ status: st.toUpperCase(), count: cnt }));
      return {
        templateId: 'T2',
        summary: `Approval volume breakdown by status across ${data?.length || 0} total requests.`,
        resolvedRange: params.resolvedRangeText || 'Last 1 Year',
        count: data?.length || 0,
        data: rows,
        columns: [
          { key: 'status', label: 'Status' },
          { key: 'count', label: 'Requests' }
        ],
        deepLink: `/${tenantSubdomain}/approvals`
      };
    }

    case 'T3': {
      // avg_cycle_time
      const { data } = await adminClient
        .from('approval_requests')
        .select('created_at, finalized_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .not('finalized_at', 'is', null)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      let totalHours = 0;
      let validCount = 0;

      for (const r of data || []) {
        const start = new Date(r.created_at).getTime();
        const end = new Date(r.finalized_at).getTime();
        const hrs = (end - start) / (1000 * 60 * 60);
        if (hrs >= 0) {
          totalHours += hrs;
          validCount++;
        }
      }

      const avgHours = validCount > 0 ? (totalHours / validCount).toFixed(1) : '0';
      const avgDays = validCount > 0 ? (totalHours / validCount / 24).toFixed(1) : '0';

      return {
        templateId: 'T3',
        summary: `Average cycle time is ${avgHours} hours (${avgDays} days) across ${validCount} finalized approvals.`,
        resolvedRange: params.resolvedRangeText || 'Last 1 Year',
        count: validCount,
        data: [
          { metric: 'Average Hours', value: `${avgHours} hrs` },
          { metric: 'Average Days', value: `${avgDays} days` },
          { metric: 'Sample Size', value: `${validCount} approvals` }
        ],
        columns: [
          { key: 'metric', label: 'Metric' },
          { key: 'value', label: 'Value' }
        ],
        deepLink: `/${tenantSubdomain}/approvals?status=approved`
      };
    }

    case 'T5': {
      // oldest_pending
      const limit = params.limit || 5;
      const { data } = await adminClient
        .from('approval_requests')
        .select('id, ref, subject, created_at, categories(name), users!owner_id(name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

      const rows = (data || []).map(r => {
        const ageDays = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return {
          ref: r.ref,
          subject: r.subject,
          requester: (r.users as any)?.name || 'Unknown',
          category: (r.categories as any)?.name || 'General',
          age: `${ageDays} days`
        };
      });

      return {
        templateId: 'T5',
        summary: `Showing the top ${rows.length} oldest pending approval requests.`,
        resolvedRange: 'Current Pending Queue',
        count: rows.length,
        data: rows,
        columns: [
          { key: 'ref', label: 'Ref' },
          { key: 'subject', label: 'Subject' },
          { key: 'requester', label: 'Requester' },
          { key: 'category', label: 'Category' },
          { key: 'age', label: 'Pending Age' }
        ],
        deepLink: `/${tenantSubdomain}/approvals?status=pending`
      };
    }

    case 'T8': {
      // exceptions_in_force
      const { data } = await adminClient
        .from('approval_requests')
        .select('id, ref, subject, valid_from, valid_until, categories(name), users!owner_id(name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .not('valid_until', 'is', null)
        .gte('valid_until', new Date().toISOString())
        .order('valid_until', { ascending: true });

      const rows = (data || []).map(r => ({
        ref: r.ref,
        subject: r.subject,
        requester: (r.users as any)?.name || 'Unknown',
        category: (r.categories as any)?.name || 'Exception',
        expires: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(r.valid_until))
      }));

      return {
        templateId: 'T8',
        summary: `Currently ${rows.length} exception approvals are active and in force.`,
        resolvedRange: 'Active In Force',
        count: rows.length,
        data: rows,
        columns: [
          { key: 'ref', label: 'Ref' },
          { key: 'subject', label: 'Subject' },
          { key: 'requester', label: 'Requester' },
          { key: 'category', label: 'Category' },
          { key: 'expires', label: 'Valid Until' }
        ],
        deepLink: `/${tenantSubdomain}/admin/register`
      };
    }

    case 'T9': {
      // expiring_soon
      const days = params.days || 30;
      const untilDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await adminClient
        .from('approval_requests')
        .select('id, ref, subject, valid_until, categories(name), users!owner_id(name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .gte('valid_until', new Date().toISOString())
        .lte('valid_until', untilDate)
        .order('valid_until', { ascending: true });

      const rows = (data || []).map(r => ({
        ref: r.ref,
        subject: r.subject,
        requester: (r.users as any)?.name || 'Unknown',
        category: (r.categories as any)?.name || 'General',
        validUntil: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(r.valid_until))
      }));

      return {
        templateId: 'T9',
        summary: `Found ${rows.length} approvals expiring within the next ${days} days.`,
        resolvedRange: `Next ${days} Days`,
        count: rows.length,
        data: rows,
        columns: [
          { key: 'ref', label: 'Ref' },
          { key: 'subject', label: 'Subject' },
          { key: 'requester', label: 'Requester' },
          { key: 'category', label: 'Category' },
          { key: 'validUntil', label: 'Expiry Date' }
        ],
        deepLink: `/${tenantSubdomain}/approvals?validity=expiring`
      };
    }

    default: {
      // Fallback summary (T12 top categories)
      const { data } = await adminClient
        .from('categories')
        .select('id, name, approval_requests(id)')
        .eq('tenant_id', tenantId);

      const rows = (data || []).map(c => ({
        category: c.name,
        requests: (c.approval_requests as any[])?.length || 0
      })).sort((a, b) => b.requests - a.requests);

      return {
        templateId: 'T12',
        summary: `Top active workflow categories by total request volume.`,
        resolvedRange: 'All Time',
        count: rows.length,
        data: rows,
        columns: [
          { key: 'category', label: 'Category' },
          { key: 'requests', label: 'Total Volume' }
        ],
        deepLink: `/${tenantSubdomain}/approvals`
      };
    }
  }
}
