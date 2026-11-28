import { GlobalSearch } from "@/components/search/global-search";
import { loadSearchIndex } from "@/lib/league/load-search-index";

/** Server island: loads the compact search index for TopNav type-ahead. */
export async function GlobalSearchLoader() {
  const result = await loadSearchIndex();
  if (result.status !== "ok") {
    return <GlobalSearch entries={[]} />;
  }
  return <GlobalSearch entries={result.index.entries} />;
}
