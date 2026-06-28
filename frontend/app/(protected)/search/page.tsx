"use client";
import { useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FilterPanel } from "@/components/search/FilterPanel";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { searchApi, type SearchParams } from "@/lib/api/search";
import type { SearchResultItem } from "@/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialParams: SearchParams = {
    q: searchParams.get("q") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    venue: searchParams.get("venue") ?? undefined,
    product: searchParams.get("product") ?? undefined,
  };

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<SearchParams>(initialParams);

  const handleSearch = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    setCurrentParams(params);
    // Update URL
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) urlParams.set(k, v); });
    router.replace(`/search?${urlParams.toString()}`, { scroll: false });
    try {
      const data = await searchApi.search(params);
      setResults(data);
      setHasSearched(true);
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-muted-foreground mt-1">Search across all implementations, change requests, and product updates</p>
      </motion.div>

      <FilterPanel params={currentParams} onSearch={handleSearch} isLoading={isLoading} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && hasSearched && (
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            {results.length === 0 ? "No results found." : `${results.length} result${results.length !== 1 ? "s" : ""} found`}
          </p>
          <div className="space-y-2">
            {results.map((item, i) => (
              <motion.div
                key={`${item.item_type}-${item.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <SearchResultCard item={item} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {!hasSearched && !isLoading && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Use the filters above to search for items across all modules.
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
