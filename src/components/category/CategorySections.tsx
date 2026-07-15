import Link from 'next/link';
import Image from 'next/image';
import { type DocMeta } from '@/lib/docs';
import { type DocGroup } from '@/lib/category-groups';
import { getOgpImageUrl } from '@/lib/r2-image-loader';
import ExamMatrix, { ExamChipLink, type ExamMatrixRow } from '@/components/category/ExamMatrix';

/** カード表示用の更新日を YYYY.MM.DD で返す（取れなければ null）。LatestArticles と同じ整形。 */
function cardDate(doc: DocMeta): string | null {
  const iso = doc.updatedAt ?? doc.dateModified ?? doc.lastRewrittenAt ?? doc.publishedAt ?? doc.created;
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function DocCard({ doc }: { doc: DocMeta }) {
  const displayTitle = doc.shortTitle || doc.title;
  const excerpt = doc.subtitle || doc.description;
  const date = cardDate(doc);
  return (
    <Link
      href={`/docs/${doc.slug}`}
      data-cta="nav"
      data-cta-label="category-card"
      className="group relative flex flex-col overflow-hidden border border-[var(--rule-soft)] bg-[var(--paper)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-fill)]"
    >
      {/* ブランド色の上端アクセント（mockup の category band を mono 化＝硬質エディトリアル維持）。
          ガイドカバー写真（guide-cover.ts）は dormant: メタガイドに literal 機械写真が不一致のため撤回（PR #276→revert）。 */}
      <span aria-hidden className="block h-[3px] w-full bg-[var(--accent)] opacity-70 transition-opacity group-hover:opacity-100" />
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <h3 className="font-serif text-lg font-bold text-[var(--ink)] group-hover:text-[var(--accent)] line-clamp-2 transition-colors">
          {displayTitle}
        </h3>
        {excerpt && (
          <p className="text-sm text-[var(--ink-muted)] line-clamp-2">
            {excerpt}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-dashed border-[var(--rule-soft)]">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)] group-hover:text-[var(--accent)] transition-colors">
            Read <span aria-hidden>→</span>
          </span>
          {date && (
            <span className="font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">{date}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * 年度コードから表示名に変換（例: "r07" → "令和7年度", "h26" → "平成26年度"）
 */
function yearLabel(code: string): string {
  const match = code.match(/^(r|h)(\d+)$/);
  if (!match) return code;
  const era = match[1] === 'r' ? '令和' : '平成';
  return `${era}${match[2]}年度`;
}

/**
 * 第1次検定の過去問をテーブル形式で表示（2級向け、前期/後期）
 * 年度ごとに前期・後期・第2次をまとめる
 */
function PrimaryExamTable2({ docs, secondaryDocs = [] }: { docs: DocMeta[]; secondaryDocs?: DocMeta[] | undefined }) {
  // 年度コードでグループ化
  const yearMap = new Map<string, { zenki?: DocMeta; kouki?: DocMeta }>();
  for (const doc of docs) {
    const match = doc.slug?.match(/(r|h)(\d+)-(zenki|kouki)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    const part = match[3] as 'zenki' | 'kouki';
    if (!yearMap.has(yearCode)) yearMap.set(yearCode, {});
    yearMap.get(yearCode)![part] = doc;
  }

  // 第2次検定のマップ
  const secondaryMap = new Map<string, DocMeta>();
  if (secondaryDocs) {
    for (const doc of secondaryDocs) {
      const match = doc.slug?.match(/(r|h)(\d+)$/);
      if (match) {
        secondaryMap.set(`${match[1]}${match[2]}`, doc);
      }
    }
  }

  // 年度ソート（新しい順）
  const years = Array.from(yearMap.keys()).sort((a, b) => {
    const valA = (a.startsWith('r') ? 100 : 0) + parseInt(a.slice(1));
    const valB = (b.startsWith('r') ? 100 : 0) + parseInt(b.slice(1));
    return valB - valA;
  });

  const hasSecondary = secondaryMap.size > 0;

  const columns = ['前期（6月）', '後期（10月）', ...(hasSecondary ? ['第2次'] : [])];
  const rows: ExamMatrixRow[] = years.map((yearCode) => {
    const pair = yearMap.get(yearCode)!;
    return {
      key: yearCode,
      label: yearLabel(yearCode),
      cells: [
        { label: '前期', doc: pair.zenki },
        { label: '後期', doc: pair.kouki },
        ...(hasSecondary ? [{ label: '第2次', doc: secondaryMap.get(yearCode) }] : []),
      ],
    };
  });

  return <ExamMatrix columns={columns} rows={rows} />;
}

/**
 * 第1次検定の過去問をテーブル形式で表示
 * 年度ごとに問題A・問題Bをまとめる
 */
function PrimaryExamTable({ docs, secondaryDocs = [] }: { docs: DocMeta[]; secondaryDocs?: DocMeta[] | undefined }) {
  // 年度コードでグループ化
  const yearMap = new Map<string, { a?: DocMeta; b?: DocMeta }>();
  for (const doc of docs) {
    const match = doc.slug?.match(/(r|h)(\d+)-(a|b)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    const part = match[3] as 'a' | 'b';
    if (!yearMap.has(yearCode)) yearMap.set(yearCode, {});
    yearMap.get(yearCode)![part] = doc;
  }

  // 第2次検定のマップ
  const secondaryMap = new Map<string, DocMeta>();
  if (secondaryDocs) {
    for (const doc of secondaryDocs) {
      const match = doc.slug?.match(/(r|h)(\d+)$/);
      if (match) {
        secondaryMap.set(`${match[1]}${match[2]}`, doc);
      }
    }
  }

  // 年度ソート（新しい順）
  const years = Array.from(yearMap.keys()).sort((a, b) => {
    const valA = (a.startsWith('r') ? 100 : 0) + parseInt(a.slice(1));
    const valB = (b.startsWith('r') ? 100 : 0) + parseInt(b.slice(1));
    return valB - valA;
  });

  const hasSecondary = secondaryMap.size > 0;

  const columns = ['問題A', '問題B', ...(hasSecondary ? ['第2次'] : [])];
  const rows: ExamMatrixRow[] = years.map((yearCode) => {
    const pair = yearMap.get(yearCode)!;
    return {
      key: yearCode,
      label: yearLabel(yearCode),
      cells: [
        { label: '問題A', doc: pair.a },
        { label: '問題B', doc: pair.b },
        ...(hasSecondary ? [{ label: '第2次', doc: secondaryMap.get(yearCode) }] : []),
      ],
    };
  });

  return <ExamMatrix columns={columns} rows={rows} />;
}

/**
 * PE過去問をテーブル形式で表示
 * 年度ごとに択一式・記述式をまとめる
 */
function PeExamTable({ docs }: { docs: DocMeta[] }) {
  const yearMap = new Map<string, { primary?: DocMeta; secondary?: DocMeta }>();
  for (const doc of docs) {
    const match = doc.slug?.match(/(r|h)(\d+)-(primary|secondary)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    const type = match[3] as 'primary' | 'secondary';
    if (!yearMap.has(yearCode)) yearMap.set(yearCode, {});
    yearMap.get(yearCode)![type] = doc;
  }

  const toWesternYear = (code: string) => {
    const era = code[0];
    const num = parseInt(code.slice(1));
    return era === 'r' ? 2018 + num : 1988 + num;
  };

  const years = Array.from(yearMap.keys()).sort((a, b) => {
    return toWesternYear(b) - toWesternYear(a);
  });

  const columns = ['択一式', '記述式'];
  const rows: ExamMatrixRow[] = years.map((yearCode) => {
    const pair = yearMap.get(yearCode)!;
    const era = yearCode[0];
    const yearNum = parseInt(yearCode.slice(1));
    const label = era === 'r'
      ? (yearNum === 1 ? '令和元年度' : `令和${yearNum}年度`)
      : `平成${yearNum}年度`;
    return {
      key: yearCode,
      label,
      cells: [
        { label: '択一式', doc: pair.primary },
        { label: '記述式', doc: pair.secondary },
      ],
    };
  });

  return <ExamMatrix columns={columns} rows={rows} />;
}

/**
 * 技術士第一次試験の過去問をテーブル形式で表示
 * 年度ごとに適性科目・基礎科目・専門科目（建設部門）をまとめる
 */
function PeFirstStageExamTable({ docs }: { docs: DocMeta[] }) {
  const yearMap = new Map<string, { aptitude?: DocMeta; basic?: DocMeta; construction?: DocMeta }>();
  for (const doc of docs) {
    const match = doc.slug?.match(/(r|h)(\d+)-(aptitude|basic|construction)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    const type = match[3] as 'aptitude' | 'basic' | 'construction';
    if (!yearMap.has(yearCode)) yearMap.set(yearCode, {});
    yearMap.get(yearCode)![type] = doc;
  }

  const years = Array.from(yearMap.keys()).sort((a, b) => {
    const valA = (a.startsWith('r') ? 100 : 0) + parseInt(a.slice(1));
    const valB = (b.startsWith('r') ? 100 : 0) + parseInt(b.slice(1));
    return valB - valA;
  });

  const columns = ['適性科目', '基礎科目', '専門科目（建設）'];
  const rows: ExamMatrixRow[] = years.map((yearCode) => {
    const row = yearMap.get(yearCode)!;
    return {
      key: yearCode,
      label: yearLabel(yearCode),
      cells: [
        { label: '適性', doc: row.aptitude },
        { label: '基礎', doc: row.basic },
        { label: '専門', doc: row.construction },
      ],
    };
  });

  return <ExamMatrix columns={columns} rows={rows} />;
}

/**
 * 技術士第二次試験（建設部門）の過去問を 科目 × 年度 のマトリクスで表示。
 * 行 = 必須科目I + 11 選択科目、列 = 令和元〜7年度。受験者は「必須 + 自分の選択科目1つ」を
 * 年度横断で追うため、年度×2-3列の他資格テーブルではなく専用マトリクスにする。
 */
const PE_CONSTRUCTION_SUBJECTS: { key: string; label: string }[] = [
  { key: 'required', label: '必須科目I' },
  { key: 'geotechnical', label: '土質及び基礎' },
  { key: 'steel-concrete', label: '鋼構造及びコンクリート' },
  { key: 'urban-planning', label: '都市及び地方計画' },
  { key: 'river-coast', label: '河川、砂防及び海岸・海洋' },
  { key: 'port-airport', label: '港湾及び空港' },
  { key: 'power-civil', label: '電力土木' },
  { key: 'road', label: '道路' },
  { key: 'railway', label: '鉄道' },
  { key: 'tunnel', label: 'トンネル' },
  { key: 'construction-planning', label: '施工計画、施工設備及び積算' },
  { key: 'environment', label: '建設環境' },
];

function PeConstructionExamTable({ docs }: { docs: DocMeta[] }) {
  // 科目key → 年度code → Doc
  const map = new Map<string, Map<string, DocMeta>>();
  const yearSet = new Set<string>();
  for (const doc of docs) {
    const m = doc.slug?.match(/r(\d+)-([a-z-]+)$/);
    if (!m) continue;
    const yearCode = `r${m[1]}`;
    const subject = m[2]!;
    yearSet.add(yearCode);
    if (!map.has(subject)) map.set(subject, new Map());
    map.get(subject)!.set(yearCode, doc);
  }

  // 年度は新しい順（令和7 → 令和元）
  const years = Array.from(yearSet).sort((a, b) => parseInt(b.slice(1)) - parseInt(a.slice(1)));
  const colLabel = (code: string) => {
    const num = parseInt(code.slice(1));
    return num === 1 ? '令和元' : `令和${num}`;
  };

  // 定義順の科目のうちデータが存在するものだけ
  const rows = PE_CONSTRUCTION_SUBJECTS.filter(s => map.has(s.key));

  return (
    <>
      {/* モバイル: 科目カード縦積み + 年度ボタングリッド（8列テーブルの横スクロールを回避） */}
      <div className="zenn-desktop:hidden space-y-4">
        {rows.map(subject => {
          const yearMap = map.get(subject.key)!;
          return (
            <div key={subject.key} className="rounded-card-content border border-[var(--rule-soft)] p-4">
              <h4 className="font-semibold text-[var(--ink)] mb-3">{subject.label}</h4>
              <div className="flex flex-wrap gap-2">
                {years.map(y => {
                  const doc = yearMap.get(y);
                  return doc ? (
                    <ExamChipLink key={y} href={`/docs/${doc.slug}`}>
                      {colLabel(y)}
                    </ExamChipLink>
                  ) : null;
                })}
              </div>
            </div>
          );
        })}
      </div>
      {/* デスクトップ: 現状マトリクス */}
      <div className="hidden zenn-desktop:block overflow-x-auto">
        <table className="w-full text-base border-collapse">
          <thead>
            <tr className="border-b-2 border-[var(--rule-soft)]">
              <th className="text-left py-3 px-4 font-semibold text-[var(--ink-body)]">科目</th>
              {years.map(y => (
                <th key={y} className="text-center py-3 px-3 font-semibold text-[var(--ink-body)] whitespace-nowrap">{colLabel(y)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(subject => {
              const yearMap = map.get(subject.key)!;
              return (
                <tr key={subject.key} className="border-b border-[var(--rule-soft)] hover:bg-[var(--accent-fill)] transition-colors">
                  <td className="py-3 px-4 font-medium text-[var(--ink)]">{subject.label}</td>
                  {years.map(y => {
                    const doc = yearMap.get(y);
                    return (
                      <td key={y} className="py-3 px-3 text-center">
                        {doc ? (
                          <Link href={`/docs/${doc.slug}`} className="text-[var(--accent)] hover:underline">問題</Link>
                        ) : <span className="text-[var(--ink-muted)] opacity-50">—</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * OGP サムネ左＋タイトル右の1行（全資格・カテゴリ hub 共通の唯一の実装）。
 * 「よく読まれている記事」（rank 付き）と各セクションの OGP 行（rank 無し）で共用する。
 * サムネの縦横比は self-start で保つ（下記コメント参照）。
 */
export function OgpThumbRow({ doc, rank }: { doc: DocMeta; rank?: number }) {
  const title = doc.shortTitle || doc.title;
  const excerpt = doc.subtitle || doc.description;
  return (
    <li className="border-b border-[var(--rule-soft)] last:border-b-0">
      <Link href={`/docs/${doc.slug}`} className="group flex gap-3 sm:gap-4 py-4">
        {/* self-start 必須: 親 flex の align-items:stretch がサムネをテキスト列の高さに
            引き伸ばし aspect-[1200/630] を無効化する（縦伸び事故の根治・2026-07-15）。 */}
        <div className="relative aspect-[1200/630] w-[124px] sm:w-[168px] shrink-0 self-start overflow-hidden border border-[var(--rule-soft)] bg-[var(--bg)]">
          <Image
            src={getOgpImageUrl(doc.slug)}
            alt=""
            width={336}
            height={176}
            unoptimized
            loading="lazy"
            sizes="(max-width: 640px) 124px, 168px"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-1 gap-2.5">
          {rank != null && (
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-card-inline bg-[var(--accent-fill)] font-mono text-xs font-bold tabular-nums text-[var(--accent)]">
              {rank}
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="font-serif text-[15px] sm:text-lg font-bold leading-snug text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
              {title}
            </h3>
            {excerpt && (
              <p className="text-[13px] sm:text-sm text-[var(--ink-muted)] line-clamp-2">{excerpt}</p>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

export function DocSection({ group, layout, secondaryDocs }: { group: DocGroup; layout?: 'cards' | 'ogp-rows' | 'exam-table' | 'exam-table-2' | 'pe-exam-table' | 'pe-first-stage-table' | 'pe-construction-exam-table'; secondaryDocs?: DocMeta[] | undefined }) {
  return (
    <section id={`sec-${group.key}`} className="scroll-mt-24">
      <div className="mb-6">
        <h2 className="font-serif text-[22px] sm:text-[26px] font-black text-[var(--ink)]">{group.title}</h2>
        <p className="text-[14px] text-[var(--ink-muted)] mt-1">{group.description}</p>
      </div>
      {layout === 'exam-table' ? (
        <PrimaryExamTable docs={group.docs} secondaryDocs={secondaryDocs} />
      ) : layout === 'exam-table-2' ? (
        <PrimaryExamTable2 docs={group.docs} secondaryDocs={secondaryDocs} />
      ) : layout === 'pe-exam-table' ? (
        <PeExamTable docs={group.docs} />
      ) : layout === 'pe-first-stage-table' ? (
        <PeFirstStageExamTable docs={group.docs} />
      ) : layout === 'pe-construction-exam-table' ? (
        <PeConstructionExamTable docs={group.docs} />
      ) : layout === 'ogp-rows' ? (
        <ul className="flex flex-col">
          {group.docs.map(doc => (
            <OgpThumbRow key={doc.slug} doc={doc} />
          ))}
        </ul>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {group.docs.map(doc => (
            <DocCard key={doc.slug} doc={doc} />
          ))}
        </div>
      )}
    </section>
  );
}
