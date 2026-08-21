import { describe, it, expect } from 'vitest';
import { getOrdinalSuffix } from './ExceptionContextPanel';

describe('ExceptionContextPanel Ordinal Unit Tests (src/components/ui/ExceptionContextPanel.unit.test.ts)', () => {
  it('1. Formats ordinals correctly (1st, 2nd, 3rd, 4th, 21st, etc)', () => {
    expect(getOrdinalSuffix(1)).toBe('1st');
    expect(getOrdinalSuffix(2)).toBe('2nd');
    expect(getOrdinalSuffix(3)).toBe('3rd');
    expect(getOrdinalSuffix(4)).toBe('4th');
    expect(getOrdinalSuffix(11)).toBe('11th');
    expect(getOrdinalSuffix(12)).toBe('12th');
    expect(getOrdinalSuffix(21)).toBe('21st');
  });
});
