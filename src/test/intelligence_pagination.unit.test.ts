import { describe, expect, it, vi } from 'vitest';
import { collectPages } from '@/lib/intelligence/analytics/pagination';

describe('intelligence data pagination', () => {
  it('includes records beyond the default API row cap', async () => {
    const source = Array.from({ length: 1201 }, (_, id) => ({ id }));
    const fetchPage = vi.fn((from: number, to: number) => Promise.resolve({
      data: source.slice(from, to + 1), error: null,
    }));

    const rows = await collectPages(fetchPage, 500);

    expect(rows).toHaveLength(1201);
    expect(rows.at(-1)).toEqual({ id: 1200 });
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('fails instead of displaying incomplete metrics when a later page errors', async () => {
    const fetchPage = vi.fn((from: number) => Promise.resolve(from === 0
      ? { data: [{ id: 1 }], error: null }
      : { data: null, error: { message: 'connection failed' } }));
    await expect(collectPages(fetchPage, 1)).rejects.toThrow('connection failed');
  });
});
