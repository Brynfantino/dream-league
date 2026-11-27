/**
 * Supabase/PostgREST caps each response at 1000 rows by default.
 * All-time loads need every goal_event across seasons — page with .range().
 */

export type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

const DEFAULT_PAGE_SIZE = 1000;

/**
 * Fetch every row from a paged Supabase select.
 * `fetchPage(from, to)` must apply `.range(from, to)` (inclusive).
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<PageResult<T>> {
  const all: T[] = [];
  let from = 0;

  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) {
      return { data: all, error };
    }
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return { data: all, error: null };
}
