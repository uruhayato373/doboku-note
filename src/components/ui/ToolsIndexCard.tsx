import Link from "next/link";

/** ツール一覧（/tools）へ戻るカード。各ツールの末尾の関連リンク欄で使う（2026-10-27 に 7 つのツールの直書きを集約） */
const TOOLS_INDEX = { href: "/tools", label: "無料ツール一覧" } as const;

export default function ToolsIndexCard({ description }: { description: string }) {
  return (
    <Link
      href={TOOLS_INDEX.href}
      className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-(--accent)"
    >
      <div className="font-bold text-(--ink)">{TOOLS_INDEX.label}</div>
      <div className="text-sm text-(--ink-body) mt-1">{description}</div>
    </Link>
  );
}
