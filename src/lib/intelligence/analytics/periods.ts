/**
 * Period Resolution & Comparable-Period Baseline Engine
 * Rule: Executive anomaly baseline comparator MUST be the same named period/quarter in the prior year
 * (e.g. AMJ 2026 vs AMJ 2025). Previous quarter is strictly an optional descriptive trend.
 */

export type NamedQuarter = 'JFM' | 'AMJ' | 'JAS' | 'OND';

export interface PeriodInfo {
  periodKey: string;             // e.g. "2026-AMJ"
  year: number;                  // 2026
  quarter: NamedQuarter;         // AMJ
  displayName: string;           // "AMJ 2026 (Apr - Jun)"
  startDate: string;             // ISO date string
  endDate: string;               // ISO date string
  comparatorPeriodKey: string;   // "2025-AMJ" (Mandatory primary comparator: same period prior year)
  optionalPriorPeriodKey: string; // "2026-JFM" (Descriptive sequential trend only)
}

export function getQuarterFromMonth(monthZeroIndexed: number): NamedQuarter {
  if (monthZeroIndexed >= 0 && monthZeroIndexed <= 2) return 'JFM'; // Jan - Mar
  if (monthZeroIndexed >= 3 && monthZeroIndexed <= 5) return 'AMJ'; // Apr - Jun
  if (monthZeroIndexed >= 6 && monthZeroIndexed <= 8) return 'JAS'; // Jul - Sep
  return 'OND'; // Oct - Dec
}

export function resolvePeriodKey(date: Date = new Date()): PeriodInfo {
  const year = date.getFullYear();
  const quarter = getQuarterFromMonth(date.getMonth());
  const periodKey = `${year}-${quarter}`;

  // Primary comparator: Same quarter prior year
  const comparatorPeriodKey = `${year - 1}-${quarter}`;

  // Optional sequential prior quarter
  let priorQuarter: NamedQuarter;
  let priorYear = year;
  if (quarter === 'JFM') {
    priorQuarter = 'OND';
    priorYear = year - 1;
  } else if (quarter === 'AMJ') {
    priorQuarter = 'JFM';
  } else if (quarter === 'JAS') {
    priorQuarter = 'AMJ';
  } else {
    priorQuarter = 'JAS';
  }
  const optionalPriorPeriodKey = `${priorYear}-${priorQuarter}`;

  const quarterLabels: Record<NamedQuarter, string> = {
    JFM: 'Jan - Mar',
    AMJ: 'Apr - Jun',
    JAS: 'Jul - Sep',
    OND: 'Oct - Dec',
  };

  const quarterRanges: Record<NamedQuarter, { startMonth: number; endMonth: number; endDay: number }> = {
    JFM: { startMonth: 0, endMonth: 2, endDay: 31 },
    AMJ: { startMonth: 3, endMonth: 5, endDay: 30 },
    JAS: { startMonth: 6, endMonth: 8, endDay: 30 },
    OND: { startMonth: 9, endMonth: 11, endDay: 31 },
  };

  const range = quarterRanges[quarter];
  const startDate = new Date(Date.UTC(year, range.startMonth, 1)).toISOString();
  const endDate = new Date(Date.UTC(year, range.endMonth, range.endDay, 23, 59, 59, 999)).toISOString();

  return {
    periodKey,
    year,
    quarter,
    displayName: `${quarter} ${year} (${quarterLabels[quarter]})`,
    startDate,
    endDate,
    comparatorPeriodKey,
    optionalPriorPeriodKey,
  };
}

export function isComparablePeriod(currentKey: string, comparatorKey: string): boolean {
  // Enforces that comparison is like-with-like (same quarter)
  const currentQuarter = currentKey.split('-')[1];
  const comparatorQuarter = comparatorKey.split('-')[1];
  return Boolean(currentQuarter && comparatorQuarter && currentQuarter === comparatorQuarter);
}

export function getPeriodDateRange(periodKey: string): { startDate: string; endDate: string } {
  const parts = periodKey.split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const quarter = (parts[1] || 'AMJ') as NamedQuarter;

  const quarterRanges: Record<NamedQuarter, { startMonth: number; endMonth: number; endDay: number }> = {
    JFM: { startMonth: 0, endMonth: 2, endDay: 31 },
    AMJ: { startMonth: 3, endMonth: 5, endDay: 30 },
    JAS: { startMonth: 6, endMonth: 8, endDay: 30 },
    OND: { startMonth: 9, endMonth: 11, endDay: 31 },
  };

  const range = quarterRanges[quarter] || { startMonth: 0, endMonth: 11, endDay: 31 };
  const startDate = new Date(Date.UTC(year, range.startMonth, 1)).toISOString();
  const endDate = new Date(Date.UTC(year, range.endMonth, range.endDay, 23, 59, 59, 999)).toISOString();

  return { startDate, endDate };
}
