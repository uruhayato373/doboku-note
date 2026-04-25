import { Suspense } from "react";
import SearchPageClient from "./SearchPageClient";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
          <p className="font-mono text-[12px] text-[var(--ink-muted)]">Loading…</p>
        </div>
      }
    >
      <SearchPageClient />
    </Suspense>
  );
}
