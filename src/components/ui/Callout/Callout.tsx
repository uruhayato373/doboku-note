import type { ReactNode } from "react";
import {
  Info,
  Lightbulb,
  AlertTriangle,
  Ban,
  CheckCircle,
  Flag,
  Sigma,
  BookOpen,
  Beaker,
  Link2,
  MessageSquare,
  Quote,
} from "lucide-react";

/**
 * Callout の 12 種（Claude Design ハンドオフ準拠）。
 * 色は CSS 変数 --ct-{tone}-{bg|bd|fg} を真実源とし、ライト/ダークは globals.css で切替。
 *
 * 既存 MDX 6 件で使われる legacy エイリアスは LEGACY_ALIASES マップで吸収する。
 */
export type CalloutKind =
  | "note"
  | "tip"
  | "warn"
  | "danger"
  | "success"
  | "exam"
  | "formula"
  | "standard"
  | "example"
  | "reference"
  | "faq"
  | "quote";

/**
 * 旧 type からの移行マップ（2026-04-22 PR #96）。新規執筆では使わない。
 * この定数がランタイム変換と型（LegacyCalloutKind）の両方の真実源。
 */
const LEGACY_ALIASES = {
  info: "note",
  warning: "warn",
  caution: "warn",
  point: "tip",
  error: "danger",
} as const satisfies Record<string, CalloutKind>;

export type LegacyCalloutKind = keyof typeof LEGACY_ALIASES;

interface CalloutProps {
  /** 未知の文字列は許容しない閉じた union。MDX 側の型 typo は content lint（scripts/check-callout-types.mjs）が検出する。 */
  type?: CalloutKind | LegacyCalloutKind;
  title?: string;
  children: ReactNode;
}

interface ToneConfig {
  label: string;
  jp: string;
  icon: typeof Info;
}

const CALLOUT_CONFIG: Record<CalloutKind, ToneConfig> = {
  note: { label: "NOTE", jp: "メモ", icon: Info },
  tip: { label: "POINT", jp: "ポイント", icon: Lightbulb },
  warn: { label: "CAUTION", jp: "注意", icon: AlertTriangle },
  danger: { label: "DANGER", jp: "重大リスク", icon: Ban },
  success: { label: "OK", jp: "合格ライン", icon: CheckCircle },
  exam: { label: "EXAM", jp: "出題頻度", icon: Flag },
  formula: { label: "FORMULA", jp: "公式", icon: Sigma },
  standard: { label: "STANDARD", jp: "基準・規格", icon: BookOpen },
  example: { label: "EXAMPLE", jp: "実例", icon: Beaker },
  reference: { label: "REFERENCE", jp: "参考文献", icon: Link2 },
  faq: { label: "FAQ", jp: "よくある質問", icon: MessageSquare },
  quote: { label: "QUOTE", jp: "引用", icon: Quote },
};

/**
 * 型・legacy alias・不明値のフォールバックを1関数に集約する。
 * MDX から渡る `type` は TypeScript の閉じた union で検査できない（.mdx はコンパイル時に
 * この props 型と突き合わされない）ため、静的な typo 検出は content lint
 * （scripts/check-callout-types.mjs）が担う。ここでのフォールバックはキャッシュ済み
 * MDX やレガシー呼び出し向けの実行時安全網。
 */
export function resolveCalloutKind(type: unknown): CalloutKind {
  const t = String(type ?? "note");
  if (t in LEGACY_ALIASES) return LEGACY_ALIASES[t as LegacyCalloutKind];
  if (t in CALLOUT_CONFIG) return t as CalloutKind;
  return "note";
}

export default function Callout({ type = "note", title, children }: CalloutProps) {
  const resolved = resolveCalloutKind(type);
  const config = CALLOUT_CONFIG[resolved];
  const IconComponent = config.icon;

  const panelStyle = {
    background: `var(--ct-${resolved}-bg)`,
    borderLeftColor: `var(--ct-${resolved}-bd)`,
  };
  const iconStyle = { background: `var(--ct-${resolved}-bd)` };
  const titleStyle = { color: `var(--ct-${resolved}-fg)` };

  return (
    <aside
      data-callout={resolved}
      aria-label={`${config.label}: ${config.jp}`}
      className="relative my-6 border-l-[3px] rounded-card-inline pl-5 pr-5 py-4"
      style={panelStyle}
    >
      <div
        className="absolute left-3.5 top-4 flex h-[22px] w-[22px] items-center justify-center rounded-full text-white"
        style={iconStyle}
        aria-hidden
      >
        <IconComponent className="h-3.5 w-3.5" />
      </div>

      {title && (
        <div className="mb-1.5 pl-9 text-[15px] font-bold" style={titleStyle}>
          {title}
        </div>
      )}

      <div
        className={`callout-body text-[1em] leading-relaxed text-[var(--ink-body)] ${title ? "" : "pl-9"}`}
      >
        {children}
      </div>
    </aside>
  );
}
