"use client";

import { ReactNode, useMemo } from "react";
import {
  Info,
  Lightbulb,
  AlertTriangle,
  Ban,
  CheckCircle,
  Sigma,
  BookOpen,
  Beaker,
  Link2,
  MessageSquare,
  Quote,
} from "lucide-react";

/**
 * Callout の 11 種（2026-04-22 Claude Design ハンドオフで定義）
 *
 * zip `CALLOUT_KINDS` 準拠。12 種から exam を除外（ExamPoint コンポーネントと役割重複のため）。
 * 旧 9 種（info/warning/error/success/note/tip/question/caution/danger）は本 PR で削除。
 * 既存 MDX の移行マッピング: info→note / warning→warn / caution→warn
 */
export type CalloutKind =
  | "note"
  | "tip"
  | "warn"
  | "danger"
  | "success"
  | "formula"
  | "standard"
  | "example"
  | "reference"
  | "faq"
  | "quote";

interface CalloutProps {
  type?: CalloutKind;
  title?: string;
  children: ReactNode;
}

interface ToneConfig {
  label: string;
  jp: string;
  icon: typeof Info;
  // 左アクセントボーダー + 円形アイコン背景（共通）
  accent: string;
  // asideパネル背景
  panel: string;
  // 小タグ（LABEL uppercase）の色
  tag: string;
}

const CALLOUT_CONFIG: Record<CalloutKind, ToneConfig> = {
  note: {
    label: "NOTE",
    jp: "メモ",
    icon: Info,
    accent: "bg-blue-500 dark:bg-blue-400",
    panel: "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 dark:border-blue-400",
    tag: "text-blue-700 dark:text-blue-300",
  },
  tip: {
    label: "POINT",
    jp: "ポイント",
    icon: Lightbulb,
    accent: "bg-emerald-500 dark:bg-emerald-400",
    panel:
      "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-400",
    tag: "text-emerald-700 dark:text-emerald-300",
  },
  warn: {
    label: "CAUTION",
    jp: "注意",
    icon: AlertTriangle,
    accent: "bg-amber-500 dark:bg-amber-400",
    panel:
      "bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 dark:border-amber-400",
    tag: "text-amber-700 dark:text-amber-300",
  },
  danger: {
    label: "DANGER",
    jp: "重大リスク",
    icon: Ban,
    accent: "bg-red-500 dark:bg-red-400",
    panel: "bg-red-50/70 dark:bg-red-950/40 border-red-500 dark:border-red-400",
    tag: "text-red-700 dark:text-red-300",
  },
  success: {
    label: "OK",
    jp: "合格ライン",
    icon: CheckCircle,
    accent: "bg-green-500 dark:bg-green-400",
    panel:
      "bg-green-50/70 dark:bg-green-950/40 border-green-500 dark:border-green-400",
    tag: "text-green-700 dark:text-green-300",
  },
  formula: {
    label: "FORMULA",
    jp: "公式",
    icon: Sigma,
    accent: "bg-indigo-500 dark:bg-indigo-400",
    panel:
      "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400",
    tag: "text-indigo-700 dark:text-indigo-300",
  },
  standard: {
    label: "STANDARD",
    jp: "基準・規格",
    icon: BookOpen,
    accent: "bg-violet-500 dark:bg-violet-400",
    panel:
      "bg-violet-50/70 dark:bg-violet-950/40 border-violet-500 dark:border-violet-400",
    tag: "text-violet-700 dark:text-violet-300",
  },
  example: {
    label: "EXAMPLE",
    jp: "実例",
    icon: Beaker,
    accent: "bg-cyan-600 dark:bg-cyan-400",
    panel:
      "bg-cyan-50/70 dark:bg-cyan-950/40 border-cyan-600 dark:border-cyan-400",
    tag: "text-cyan-700 dark:text-cyan-300",
  },
  reference: {
    label: "REFERENCE",
    jp: "参考文献",
    icon: Link2,
    accent: "bg-slate-500 dark:bg-slate-400",
    panel:
      "bg-slate-50/70 dark:bg-slate-800/60 border-slate-500 dark:border-slate-400",
    tag: "text-slate-700 dark:text-slate-300",
  },
  faq: {
    label: "FAQ",
    jp: "よくある質問",
    icon: MessageSquare,
    accent: "bg-yellow-600 dark:bg-yellow-400",
    panel:
      "bg-yellow-50/70 dark:bg-yellow-950/40 border-yellow-600 dark:border-yellow-400",
    tag: "text-yellow-700 dark:text-yellow-300",
  },
  quote: {
    label: "QUOTE",
    jp: "引用",
    icon: Quote,
    accent: "bg-zinc-400 dark:bg-zinc-400",
    panel: "bg-zinc-50/70 dark:bg-zinc-800/60 border-zinc-400 dark:border-zinc-400",
    tag: "text-zinc-600 dark:text-zinc-300",
  },
};

/**
 * Callout コンポーネント（2026-04-22 全面リデザイン、Claude Design ハンドオフ準拠）
 *
 * デザイン:
 * - 左アクセントボーダー 3px（トーン別）
 * - 左上に円形アイコン（22px, トーンの強色背景 + 白アイコン）
 * - 小タグ「LABEL · jp」が先頭に並び、タイトル（任意）は ink-strong で続く
 * - 本文は通常 ink-body 色
 *
 * 使い分けガイドは `.claude/content-principles.md` を参照。
 */
export default function Callout({ type = "note", title, children }: CalloutProps) {
  const config = useMemo(
    () => CALLOUT_CONFIG[type] ?? CALLOUT_CONFIG.note,
    [type],
  );
  const IconComponent = config.icon;

  return (
    <aside
      data-callout={type}
      className={`relative my-6 border-l-[3px] rounded-md pl-14 pr-5 py-4 ${config.panel}`}
    >
      {/* 円形アイコン（左上固定） */}
      <div
        className={`absolute left-3.5 top-4 flex h-[22px] w-[22px] items-center justify-center rounded-full text-white ${config.accent}`}
        aria-hidden
      >
        <IconComponent className="h-3.5 w-3.5" />
      </div>

      {/* ラベル行: タグ（英） · jp · 任意タイトル */}
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={`text-[11px] font-bold uppercase tracking-[0.1em] ${config.tag}`}
        >
          {config.label}
        </span>
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
          {config.jp}
        </span>
        {title && (
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {title}
          </span>
        )}
      </div>

      {/* 本文 */}
      <div className="callout-body text-[0.95em] leading-7 text-gray-700 dark:text-gray-300">
        {children}
      </div>
    </aside>
  );
}
