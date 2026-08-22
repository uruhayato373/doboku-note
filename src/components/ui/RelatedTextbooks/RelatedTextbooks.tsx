/**
 * 関連テキスト（Civil第1次/第2次検定問題用）
 *
 * 2 つの経路でランキング:
 *   1. civil-exam-textbook-index{,-2}.json (build-civil-exam-textbook-index.mjs 生成)
 *      → 過去問の各問題セクション本文と textbook タイトルの照合スコア
 *   2. tags 共通数 (フォールバック)
 *
 * civil-construction-1/2 の primary/secondary 過去問は通常 tags が空に近いため、
 * (1) の index 経由を優先する。それでも 0 件なら (2) を試す。
 * 1級と2級でそれぞれ別 index を持つ（civil-exam-textbook-index.json / -2.json）。
 */
import Link from 'next/link';
import type { DocMeta } from '@/lib/docs';
import { classifyDoc } from '@/lib/doc-classifier';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import examTextbookIndex from '@/config/civil-exam-textbook-index.json';
import examTextbookIndex2 from '@/config/civil-exam-textbook-index-2.json';

interface RelatedTextbooksProps {
  currentMeta: DocMeta;
  categoryArticles: DocMeta[];
}

interface TextbookMatch {
  slug: string;
  title: string;
  score: number;
}

interface QuestionToTextbooks {
  [questionId: string]: TextbookMatch[];
}

interface IndexShape {
  questionToTextbooks: Record<string, QuestionToTextbooks>;
  textbookToQuestions: Record<string, unknown>;
}

const INDEX_1 = examTextbookIndex as unknown as IndexShape;
const INDEX_2 = examTextbookIndex2 as unknown as IndexShape;

const CIVIL_INDEX_MAP: Record<string, { index: IndexShape; prefix: string }> = {
  'civil-construction-1': { index: INDEX_1, prefix: 'civil-construction-1-' },
  'civil-construction-2': { index: INDEX_2, prefix: 'civil-construction-2-' },
};

/** civil-construction-{1,2}-primary-r07-a → primary-r07-a に正規化（category 別 prefix で削除） */
function toShortSlug(fullSlug: string, prefix: string): string {
  if (fullSlug.startsWith(prefix)) return fullSlug.slice(prefix.length);
  return fullSlug;
}

function rankByIndex(currentSlug: string, category: string): { slug: string; title: string; score: number }[] {
  const config = CIVIL_INDEX_MAP[category];
  if (!config) return [];
  const shortSlug = toShortSlug(currentSlug, config.prefix);
  const examMap = config.index.questionToTextbooks?.[shortSlug];
  if (!examMap) return [];

  // 各問題の textbook を集約してスコア合算
  const scoreMap = new Map<string, { title: string; score: number }>();
  for (const matches of Object.values(examMap)) {
    for (const m of matches) {
      const existing = scoreMap.get(m.slug);
      if (existing) {
        existing.score += m.score;
      } else {
        scoreMap.set(m.slug, { title: m.title, score: m.score });
      }
    }
  }

  return Array.from(scoreMap.entries())
    .map(([slug, { title, score }]) => ({ slug, title, score: Math.round(score * 100) / 100 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function rankByTags(currentMeta: DocMeta, categoryArticles: DocMeta[]): { slug: string; title: string; description?: string }[] {
  const currentTags = new Set((currentMeta.tags || []).filter((t) => t !== 'primary' && t !== 'secondary' && t !== 'past-questions'));
  if (currentTags.size === 0) return [];

  const textbooks = categoryArticles.filter((m) => classifyDoc(m) === 'textbook');
  const scored = textbooks
    .map((tb) => {
      const tbTags = (tb.tags || []).filter((t) => t !== 'textbook');
      const commonCount = tbTags.filter((t) => currentTags.has(t)).length;
      return { doc: tb, score: commonCount };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => {
      const e: { slug: string; title: string; description?: string } = {
        slug: s.doc.slug,
        title: s.doc.title,
      };
      if (s.doc.description) e.description = s.doc.description;
      return e;
    });

  return scored;
}

export default function RelatedTextbooks({ currentMeta, categoryArticles }: RelatedTextbooksProps) {
  const category = currentMeta.category || 'civil-construction-1';
  const civilConfig = CIVIL_INDEX_MAP[category];
  const prefix = civilConfig?.prefix || 'civil-construction-1-';

  // 1) 過去問→教材インデックスを優先
  const indexed = rankByIndex(currentMeta.slug, category);
  let entries: { slug: string; title: string; description?: string }[];

  if (indexed.length > 0) {
    // index のショート slug をフル slug に変換し、description も取得
    const textbookMap = new Map<string, DocMeta>();
    for (const m of categoryArticles) {
      const short = toShortSlug(m.slug, prefix);
      textbookMap.set(short, m);
    }
    entries = indexed
      .map((item) => {
        const fullMeta = textbookMap.get(item.slug);
        const e: { slug: string; title: string; description?: string } = {
          slug: fullMeta?.slug || `${prefix}${item.slug}`,
          title: fullMeta?.title || item.title,
        };
        if (fullMeta?.description) e.description = fullMeta.description;
        return e;
      });
  } else {
    // 2) フォールバック: tags ベース
    entries = rankByTags(currentMeta, categoryArticles);
  }

  if (entries.length === 0) return null;

  return (
    <MetaCard trackNav="related-textbooks">
      <h2 className="text-lg font-bold text-[var(--ink)] mb-1">
        この試験で扱われた教材
      </h2>
      <p className="text-sm text-[var(--ink-muted)] mb-4">
        問題の分野に関連する教科書の章 ({entries.length} 件)
      </p>
      <ul className="space-y-2">
        {entries.map((doc) => (
          <li key={doc.slug}>
            <Link
              href={`/docs/${doc.slug}`}
              className="block rounded-card-content border border-[var(--rule-soft)] px-4 py-3 transition-colors hover:border-[var(--accent)]"
            >
              <div className="text-sm font-semibold text-[var(--accent)]">{doc.title}</div>
              {doc.description && (
                <div className="text-xs text-[var(--ink-body)] mt-1 line-clamp-2">{doc.description}</div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
