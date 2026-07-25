import { adminClient } from '../supabase/admin';

export interface ResolvedIntent {
  matched: boolean;
  templateId: string;
  params: Record<string, any>;
  confidence: number;
  unsupportedMessage?: string;
}

export async function resolveUserIntent(
  question: string,
  tenantId: string
): Promise<ResolvedIntent> {
  const q = question.toLowerCase().trim();

  // 1. Resolve relative dates
  let dateFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  let dateTo = new Date().toISOString();
  let resolvedRangeText = 'Last 1 Year';

  if (q.includes('quarter') || q.includes('this quarter')) {
    const now = new Date();
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    dateFrom = new Date(now.getFullYear(), qStartMonth, 1).toISOString();
    resolvedRangeText = 'This Quarter';
  } else if (q.includes('month') || q.includes('last 30 days') || q.includes('this month')) {
    dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    resolvedRangeText = 'Last 30 Days';
  } else if (q.includes('year') || q.includes('last year') || q.includes('1 year')) {
    dateFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    resolvedRangeText = 'Last 1 Year';
  }

  // 2. Search categories for fuzzy match
  const { data: categories } = await adminClient
    .from('categories')
    .select('id, name')
    .eq('tenant_id', tenantId);

  let matchedCategory: { id: string; name: string } | null = null;
  for (const cat of categories || []) {
    const catLower = cat.name.toLowerCase();
    // Match abbreviation or full name
    if (q.includes(catLower) || (catLower.includes('work from home') && q.includes('wfh'))) {
      matchedCategory = cat;
      break;
    }
  }

  // 3. Pattern Matching Templates
  
  if (q.includes('based on') || q.includes('citing') || q.includes('authority') || q.includes('references')) {
    return {
      matched: true,
      templateId: 'T13',
      params: { question },
      confidence: 0.92
    };
  }

  if (q.includes('exceptions to') || q.includes('deviations from') || q.includes('exception basis') || q.includes('how many times')) {
    return {
      matched: true,
      templateId: 'T14',
      params: { question },
      confidence: 0.92
    };
  }

  if (q.includes('pending') && (q.includes('longest') || q.includes('oldest'))) {
    return {
      matched: true,
      templateId: 'T5',
      params: { limit: 5 },
      confidence: 0.95
    };
  }

  if (q.includes('exception') || q.includes('in force')) {
    return {
      matched: true,
      templateId: 'T8',
      params: { asOf: new Date().toISOString() },
      confidence: 0.95
    };
  }

  if (q.includes('expiring') || q.includes('expiry') || q.includes('expire')) {
    return {
      matched: true,
      templateId: 'T9',
      params: { days: 30 },
      confidence: 0.90
    };
  }

  if (q.includes('average') || q.includes('cycle time') || q.includes('approval time') || q.includes('how long')) {
    return {
      matched: true,
      templateId: 'T3',
      params: { dateFrom, dateTo, resolvedRangeText },
      confidence: 0.90
    };
  }

  if (q.includes('status') || q.includes('breakdown')) {
    return {
      matched: true,
      templateId: 'T2',
      params: { dateFrom, dateTo, resolvedRangeText },
      confidence: 0.88
    };
  }

  if (q.includes('how many') || q.includes('total') || q.includes('count') || matchedCategory) {
    return {
      matched: true,
      templateId: 'T1',
      params: {
        dateFrom,
        dateTo,
        resolvedRangeText,
        categoryId: matchedCategory?.id,
        categoryName: matchedCategory?.name
      },
      confidence: 0.85
    };
  }

  // Default fallback for general questions
  return {
    matched: false,
    templateId: 'T12',
    params: { dateFrom, dateTo, resolvedRangeText },
    confidence: 0.40,
    unsupportedMessage: "I can't answer that query directly — here are questions I can answer right now:"
  };
}
