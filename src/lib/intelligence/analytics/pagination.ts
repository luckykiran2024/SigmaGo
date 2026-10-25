/** Collect every PostgREST page so metrics never silently stop at its row limit. */
export async function collectPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 500
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new Error('Invalid page size');
  }

  const rows: T[] = [];
  for (let page = 0; page < 1000; page++) {
    const { data, error } = await fetchPage(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw new Error(`Intelligence data query failed: ${error.message}`);
    if (!data) throw new Error('Intelligence data query returned no rows payload');
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }

  throw new Error('Intelligence data exceeds the supported page count');
}
