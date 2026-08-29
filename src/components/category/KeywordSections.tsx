import Link from 'next/link';
import { type DocMeta } from '@/lib/docs';
import { type ResolvedKeywordSection } from '@/lib/category-curriculum';
import { CurriculumSection, CurriculumList } from '@/components/category/CurriculumSections';
import ExamMatrix, { type ExamMatrixRow } from '@/components/category/ExamMatrix';
import { getPublicDocPath } from '@/lib/content-routes';

// キーワード節（keyword group）を「必須科目I ブロック ＋ 選択科目 科目×種別マトリクス」で描画する。
// 35 本を 3 列カードグリッドに流すと 12 行（実測 2,600px）になり 1 画面に 3〜6 本しか入らないため、
// 同じページ下部の過去問マトリクスと同じ「自分の科目の行を横に読む」形に寄せた（2026-07-30）。
// 構造の真実源は config/category-curriculum.json の keywordSection、解決は resolveKeywordSection。
// editorial トークンのみ使用（生 hex なし・rounded/shadow 直書きなし）。

/** チップの表示ラベル（種別サフィックスは所属ブロックの見出しと重複するので落とす）。 */
const CHIP_SUFFIXES = [' 論点キーワード', ' 論文の論点', ' 論文'];

function chipLabel(doc: DocMeta): string {
  const title = doc.shortTitle || doc.title || '';
  for (const suffix of CHIP_SUFFIXES) {
    if (title.endsWith(suffix)) return title.slice(0, -suffix.length);
  }
  return title;
}

/**
 * キーワードチップ（白地＋罫線）。過去問の ExamChipLink（accent-fill 地）とは別実装:
 * 必須科目I は 12 枚を帯で並べるため、accent-fill だと面が青一色になる。
 * 読み上げには省略前の記事名を渡す（表示は chipLabel で圧縮済み）。
 */
function KeywordChip({ doc }: { doc: DocMeta }) {
  const full = doc.shortTitle || doc.title || '';
  return (
    <Link
      href={getPublicDocPath(doc.slug)}
      data-cta="nav"
      data-cta-label="keyword-chip"
      aria-label={full}
      className="focus-ring inline-flex items-center rounded-card-inline border border-[var(--rule-soft)] bg-[var(--paper)] px-3 py-1.5 text-sm text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-fill)] hover:text-[var(--accent)]"
    >
      {chipLabel(doc)}
    </Link>
  );
}

/** ブロック見出し（ラベル＋件数＋罫線）。CurriculumList の volume 区切りと同じ様式。 */
function BlockHeading({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-1 flex items-center gap-3">
      <span className="shrink-0 text-[13px] font-bold text-[var(--ink-body)]">{label}</span>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">{count}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-[var(--rule-soft)]" />
    </div>
  );
}

/** ブロック先頭に据える 1 本（出題テーマ分析）。左に accent の縦罫を立てて起点だと示す。 */
function LeadRow({ doc }: { doc: DocMeta }) {
  return (
    <Link
      href={getPublicDocPath(doc.slug)}
      data-cta="nav"
      data-cta-label="keyword-lead"
      className="focus-ring group mb-4 flex items-center gap-3 border border-[var(--rule-soft)] border-l-[3px] border-l-[var(--accent)] bg-[var(--paper)] px-3 py-2.5 transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-fill)]"
    >
      <span className="text-[15px] font-medium text-[var(--ink)] group-hover:text-[var(--accent)]">
        {doc.shortTitle || doc.title}
      </span>
      <span aria-hidden className="ml-auto text-[var(--accent)] transition-transform group-hover:translate-x-0.5">
        ›
      </span>
    </Link>
  );
}

export function KeywordSection({
  section,
  title,
  description,
}: {
  section: ResolvedKeywordSection;
  title: string;
  description?: string | undefined;
}) {
  const { required, selective, unassigned } = section;
  const requiredCount = (required?.theme ? 1 : 0) + (required?.groups.reduce((n, g) => n + g.docs.length, 0) ?? 0);
  const selectiveCount = selective?.rows.reduce((n, r) => n + r.docs.filter(Boolean).length, 0) ?? 0;

  const matrixRows: ExamMatrixRow[] = (selective?.rows ?? []).map((row) => ({
    key: row.key,
    label: row.label,
    labelTitle: row.labelTitle,
    cells: row.docs.map((doc, i) => ({ label: selective!.columns[i]?.cell ?? '', doc })),
  }));

  return (
    <CurriculumSection id="keyword" title={title} description={description}>
      {required && (
        <div className="mb-10">
          <BlockHeading label={required.label} count={requiredCount} />
          {required.note && <p className="mb-3 text-[13px] text-[var(--ink-muted)]">{required.note}</p>}
          {required.theme && <LeadRow doc={required.theme} />}
          {required.groups.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <p className="mb-2 text-[13px] text-[var(--ink-muted)]">
                {group.label}（{group.docs.length} テーマ）
              </p>
              <div className="flex flex-wrap gap-2">
                {group.docs.map((doc) => (
                  <KeywordChip key={doc.slug} doc={doc} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selective && (
        <div>
          <BlockHeading label={selective.label} count={selectiveCount} />
          {selective.note && <p className="mb-3 text-[13px] text-[var(--ink-muted)]">{selective.note}</p>}
          <ExamMatrix
            columns={selective.columns.map((c) => c.header)}
            rows={matrixRows}
            rowHeader="選択科目"
            rowLabelWidth="wide"
          />
        </div>
      )}

      {/* config 未割当（新規記事・追記漏れ）。必ず出す＝silent drop 防止。 */}
      {unassigned.length > 0 && (
        <div className="mt-10">
          <BlockHeading label="その他" count={unassigned.length} />
          <CurriculumList blocks={[{ docs: unassigned }]} />
        </div>
      )}
    </CurriculumSection>
  );
}
