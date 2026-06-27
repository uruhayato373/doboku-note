import { Suspense } from "react";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import SearchPageClient from "./SearchPageClient";

export default function SearchPage() {
  return (
    <PageShell variant="content" rail="860">
      <PageHeader
        variant="inline"
        titleSize="lg"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Search" }]}
        title="記事検索"
        lead="キーワードを入力して記事・キーワードページを探す"
        className="mb-6"
      />
      <Suspense
        fallback={
          <p className="font-mono text-[12px] text-[var(--ink-muted)]">Loading…</p>
        }
      >
        <SearchPageClient />
      </Suspense>
    </PageShell>
  );
}
