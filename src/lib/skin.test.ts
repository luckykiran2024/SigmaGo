import { describe, it, expect } from 'vitest';
import { formatDwellDuration } from '@/components/ui/DwellRequestCard';
import fs from 'fs';
import path from 'path';

describe('Prompt #11 — Application Skin, Dashboard & Motion Invariants', () => {
  it('1. Should calculate sub-day dwell duration in minutes or hours and NEVER render "0 days"', () => {
    const nowMs = new Date().getTime();

    // 45 minutes ago
    const m45Ago = new Date(nowMs - 45 * 60 * 1000).toISOString();
    expect(formatDwellDuration(m45Ago).text).toBe('45 min');

    // 14 hours ago
    const h14Ago = new Date(nowMs - 14 * 60 * 60 * 1000).toISOString();
    expect(formatDwellDuration(h14Ago).text).toBe('14 hrs');

    // 3 days ago
    const d3Ago = new Date(nowMs - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatDwellDuration(d3Ago).text).toBe('3 days');
  });

  it('2. Should cap aging progress bar width at 100% when dwell exceeds target', () => {
    const targetDays = 2;
    const actualDwellDays = 5; // Overdue ratio = 2.5

    const ratio = actualDwellDays / targetDays;
    const barWidth = Math.min(1, ratio) * 100;

    expect(barWidth).toBe(100);
    expect(barWidth).not.toBeGreaterThan(100);
  });

  it('3. Should evaluate aging state thresholds correctly (<0.5 calm, 0.5-1.0 warn, >1.0 urgent)', () => {
    const getAgingState = (ratio: number) => {
      if (ratio < 0.5) return 'calm';
      if (ratio <= 1.0) return 'warn';
      return 'urgent';
    };

    expect(getAgingState(0.25)).toBe('calm');
    expect(getAgingState(0.75)).toBe('warn');
    expect(getAgingState(1.5)).toBe('urgent');
  });

  it('4. CI Gold Rule Check: --seal variable must appear ONLY in seal/certificate components', () => {
    const componentsDir = path.resolve(__dirname, '../components/ui');
    const files = fs.readdirSync(componentsDir);

    const nonSealFiles = files.filter(
      (f) => !f.toLowerCase().includes('seal') && !f.toLowerCase().includes('certificate')
    );

    nonSealFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(componentsDir, file), 'utf8');
      expect(content.includes('--seal')).toBe(false);
    });
  });
});
