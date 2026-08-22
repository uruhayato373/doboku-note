/**
 * SpecSheetList — 土木ノート仕様書調リストコンポーネント
 *
 * doboku-note の CustomUnorderedList / CustomOrderedList を統合するための
 * 単一コンポーネント案。ordered / unordered 両対応。
 *
 * Editorial tokens (globals.css) 準拠:
 *   --ink / --ink-body / --rule-soft / --accent
 *   --paper / --accent-fill / --radius-card-content
 *
 * @example
 * ```tsx
 * <SpecSheetList
 *   title="コンクリート構造物の点検項目"
 *   items={["ひび割れの発生状況", "中性化深さ", "鉄筋腐食の確認"]}
 *   ordered
 * />
 *
 * <SpecSheetList
 *   title="施工時の留意事項"
 *   items={["重機稼働範囲への立入禁止", "墜落防止措置の徹底"]}
 *   ordered={false}
 *   marker="dot"
 * />
 * ```
 */

import katex from "katex";
import type { ReactNode } from "react";
import styles from "./SpecSheetList.module.css";

type ListItem = { content: ReactNode } | string | ReactNode;

export type SpecSheetListProps = {
  /** リストのタイトル。省略可能。 */
  title?: string;
  /** 任意のサブタイトル。title 直下にマーカー風ハイライトで表示される。title 省略時は描画されない。 */
  subtitle?: string;
  /** リストアイテム。string / ReactNode / { content: ReactNode } を受け付ける。 */
  items: ListItem[];
  /** true なら <ol> + 連番 (01, 02, ...)、false なら <ul> + marker。 */
  ordered?: boolean;
  /** unordered 時のマーカー形状。ordered 時は無視される。 */
  marker?: "dot" | "dash" | "square";
  /** 上罫線の色アクセント。default（既定=ink）または brand（accent）。 */
  accent?: "default" | "brand";
  /** 追加クラス名。 */
  className?: string;
};

/**
 * `**bold**` と `` `code` `` のインライン記法を React ノードに変換する簡易パーサ。
 */
function parseInlineBoldCode(text: string): ReactNode {
  const boldRegex = /(\*\*[^*]+\*\*)/g;
  const parts = text.split(boldRegex);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`b-${i}`}>{parseInlineCode(part.slice(2, -2), i)}</strong>;
    }
    return parseInlineCode(part, i);
  });
}

/**
 * `$...$` インライン数式を KaTeX でレンダリングし、bold / code も処理する。
 * JSX プロップ文字列は remark-math パイプラインを通らないため、ここで処理する。
 */
function parseInlineMarkdown(text: string): ReactNode {
  const parts = text.split(/(\$[^$\n]+\$)/g);
  if (parts.length === 1) return parseInlineBoldCode(text);
  return parts.map((part, i) => {
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      const html = katex.renderToString(part.slice(1, -1), { throwOnError: false });
      return <span key={`m-${i}`} dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return <span key={`t-${i}`}>{parseInlineBoldCode(part)}</span>;
  });
}

function parseInlineCode(text: string, parentIdx: number): ReactNode {
  const codeRegex = /(`[^`]+`)/g;
  const parts = text.split(codeRegex);
  if (parts.length === 1) return text;
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`") && p.length > 2) {
      return <code key={`c-${parentIdx}-${i}`}>{p.slice(1, -1)}</code>;
    }
    return p;
  });
}

function getContent(item: ListItem): ReactNode {
  if (typeof item === "object" && item !== null && "content" in item) {
    return (item as { content: ReactNode }).content;
  }
  if (typeof item === "string") {
    return parseInlineMarkdown(item);
  }
  return item as ReactNode;
}

export default function SpecSheetList({
  title,
  subtitle,
  items,
  ordered = true,
  marker = "dot",
  accent = "default",
  className = "",
}: SpecSheetListProps) {
  if (!items || !Array.isArray(items) || items.length === 0) return null;

  const ListTag = ordered ? "ol" : "ul";

  const renderMarker = (i: number) => {
    if (ordered) {
      return (
        <span className={styles.idx}>
          {String(i + 1).padStart(2, "0")}
        </span>
      );
    }
    if (marker === "dash") {
      return (
        <span
          className={`${styles.idx} ${styles.idxGlyph}`}
          aria-hidden="true"
        >
          —
        </span>
      );
    }
    if (marker === "square") {
      return (
        <span
          className={`${styles.idx} ${styles.idxGlyph}`}
          aria-hidden="true"
        >
          ▪
        </span>
      );
    }
    // dot (default)
    return (
      <span
        className={`${styles.idx} ${styles.idxDot}`}
        aria-hidden="true"
      />
    );
  };

  const accentClass = accent === "brand" ? styles.rootAccentBrand : "";

  return (
    <section data-spec-sheet-list className={`${styles.root} ${accentClass} ${className}`}>
      {title && (
        <header className={styles.head}>
          <div className={styles.headRow}>
            {/* 意図的に h* タグではなく div を使用: これはコンポーネント内部の
                ラベルであり、記事の見出し階層（TOC / a11y heading navigation）
                とは別概念。MDX の `###` 見出しと混在しないようにする。 */}
            <div className={styles.title} role="heading" aria-level={4}>
              {title}
            </div>
          </div>
          {subtitle && (
            <p className={styles.subtitle}>
              <span className={styles.subtitleHighlight}>{subtitle}</span>
            </p>
          )}
        </header>
      )}
      <ListTag className={styles.list}>
        {items.map((item, i) => (
          <li key={i} className={styles.row}>
            {renderMarker(i)}
            <span className={styles.text}>{getContent(item)}</span>
          </li>
        ))}
      </ListTag>
    </section>
  );
}
