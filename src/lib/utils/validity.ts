export type ValidityState = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NOT_APPLICABLE' | 'REVIEW_ONLY';

export interface ValidityInfo {
  state: ValidityState;
  label: string;
  badgeClass: string;
  daysRemaining: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export function getValidityInfo(request: {
  status?: string | null;
  valid_until?: string | null;
  valid_from?: string | null;
  review_date?: string | null;
}): ValidityInfo {
  const isApproved = request.status === 'approved';
  
  if (request.review_date && !request.valid_until) {
    const reviewDate = new Date(request.review_date);
    const formatted = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(reviewDate);
    return {
      state: 'REVIEW_ONLY',
      label: `Review on ${formatted}`,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      daysRemaining: null,
      isExpired: false,
      isExpiringSoon: false
    };
  }

  if (!request.valid_until) {
    return {
      state: 'NOT_APPLICABLE',
      label: 'No expiry',
      badgeClass: 'bg-gray-50 text-gray-600 border-gray-200',
      daysRemaining: null,
      isExpired: false,
      isExpiringSoon: false
    };
  }

  const now = new Date();
  const until = new Date(request.valid_until);
  const diffMs = until.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      state: 'EXPIRED',
      label: `Expired ${Math.abs(diffDays)}d ago`,
      badgeClass: 'bg-red-100 text-red-800 border-red-300 font-bold',
      daysRemaining: diffDays,
      isExpired: true,
      isExpiringSoon: false
    };
  }

  if (diffDays <= 30) {
    return {
      state: 'EXPIRING_SOON',
      label: `Expires in ${diffDays}d`,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold animate-pulse',
      daysRemaining: diffDays,
      isExpired: false,
      isExpiringSoon: true
    };
  }

  return {
    state: 'ACTIVE',
    label: `Valid (${diffDays}d left)`,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    daysRemaining: diffDays,
    isExpired: false,
    isExpiringSoon: false
  };
}
