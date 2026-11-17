import LinkTile from '@/components/ui/LinkTile/LinkTile';
import ArticleThumbRow from '@/components/ui/RelatedArticles/ArticleThumbRow';
import { type DocMeta } from '@/lib/docs';
import { type DocGroup } from '@/lib/category-groups';
import { getCardImage } from '@/lib/site-thumbnail';
import ExamMatrix, { type ExamMatrixRow } from '@/components/category/ExamMatrix';
import {
  PE_CONSTRUCTION_SUBJECTS,
  subjectDisplayLabel,
  subjectFullLabel,
} from '@/lib/pe-construction-subjects';
import { getPublicDocPath } from '@/lib/content-routes';
import { formatDotDate } from '@/lib/display-date';
import AdSlot from '@/components/ads/AdSlot';
import { withFeedAds } from '@/lib/feed-ads';
import { feedAdBudget } from '@/lib/feed-ads-budget';
import { compareExamYearDesc, examYearLabel, examYearRank } from '@/lib/exam-year.mjs';

/** カード表示用の更新日を YYYY.MM.DD で返す（取れなければ null）。LatestArticles と同じ整形。 */
function cardDate(doc: DocMeta): string | null {
  const iso = doc.updatedAt ?? doc.dateModified ?? doc.lastRewrittenAt ?? doc.publishedAt ?? doc.created;
  return formatDotDate(iso);
}

export function DocCard({ doc }: { doc: DocMeta }) {
  const displayTitle = doc.shortTitle || doc.title;
  const excerpt = doc.subtitle || doc.description;
  const date = cardDate(doc);
  return (
    <LinkTile
      href={getPublicDocPath(doc.slug)}
      size="lg"
      serif
      accentBar="var(--accent)"
      title={displayTitle}
      description={excerpt}
      headingLevel="h3"
      meta={
        <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
          <span>Read <span aria-hidden>→</span></span>
          {date && <span className="tabular-nums normal-case tracking-normal">{date}</span>}
        </span>
      }
      data={{ 'data-cta': 'nav', 'data-cta-label': 'category-card' }}
    />
  );
}

/**
 * 第1次検定の過去問をテーブル形式で表示（2級向け、前期/後期）
 * 年度ごとに前期・後期・第2次をまとめる
 */
function PrimaryExamTable2({ docs, secondaryDocs = [] }: { docs: DocMeta[]; secondaryDocs?: DocMeta[] | undefined }) {
  // 年度コードでグループ化
  // 平成27年度までは年1回（10月）の学科試験で slug に期が無い（primary-h26）。10月の列に「学科」として出す
  const yearMap = new Map<string, { zenki?: DocMeta; kouki?: DocMeta; single?: DocMeta }>();
  for (const doc of docs) {
    const match = doc.slug?.match(/primary-(r|h)(\d+)(?:-(zenki|kouki))?$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    const part = (match[3] ?? 'single') as 'zenki' | 'kouki' | 'single';
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
  const years = Array.from(yearMap.keys()).sort(compareExamYearDesc);

  const hasSecondary = secondaryMap.size > 0;

  const columns = ['前期（6月）', '後期（10月）', ...(hasSecondary ? ['第2次'] : [])];
  const rows: ExamMatrixRow[] = years.map((yearCode) => {
    const pair = yearMap.get(yearCode)!;
    return {
      key: yearCode,
      label: examYearLabel(yearCode),
      cells: [
        { label: '前期', doc: pair.zenki },
        pair.single ? { label: '学科', doc: pair.single } : { label: '後期', doc: pair.kouki },
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
  const years = Array.from(yearMap.keys()).sort(compareExamYearDesc);

  const hasSecondary = secondaryMap.size > 0;

  const columns = ['問題A', '問題B', ...(hasSecondary ? ['第2次'] : [])];
  const rows: ExamMatrixRow[] = years.map((yearCode) => {
    const pair = yearMap.get(yearCode)!;
    return {
      key: yearCode,
      label: examYearLabel(yearCode),
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

  const years = Array.from(yearMap.keys()).sort(compareExamYearDesc);

  const columns = ['択一式', '記述式'];
  const rows: ExamMatrixRow[] = years.map((yearCode) => {
    const pair = yearMap.get(yearCode)!;
    return {
      key: yearCode,
      label: examYearLabel(yearCode),
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
 * 年度ごとに適性科目・基礎科目・専門科目（建設部門・上下水道部門・水産部門）をまとめる
 */
type PeFirstStageSubject = 'aptitude' | 'basic' | 'construction' | 'water-supply' | 'fisheries';

function PeFirstStageExamTable({ docs }: { docs: DocMeta[] }) {
  const yearMap = new Map<string, Partial<Record<PeFirstStageSubject, DocMeta>>>();
  for (const doc of docs) {
    const match = doc.slug?.match(/(r|h)(\d+)(-retry)?-(aptitude|basic|construction|water-supply|fisheries)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}${match[3] ?? ''}`;
    const type = match[4] as PeFirstStageSubject;
    if (!yearMap.has(yearCode)) yearMap.set(yearCode, {});
    yearMap.get(yearCode)![type] = doc;
  }

  const years = Array.from(yearMap.keys()).sort((a, b) => {
    const valA = (examYearRank(a.replace(/-retry$/, '')) ?? 0) + (a.endsWith('-retry') ? 0.1 : 0);
    const valB = (examYearRank(b.replace(/-retry$/, '')) ?? 0) + (b.endsWith('-retry') ? 0.1 : 0);
    return valB - valA;
  });

  const columns = ['適性科目', '基礎科目', '専門科目（建設）', '専門科目（上下水道）', '専門科目（水産）'];
  const rows: ExamMatrixRow[] = years.map((yearCode) => {
    const row = yearMap.get(yearCode)!;
    return {
      key: yearCode,
      label: examYearLabel(yearCode.replace(/-retry$/, '')) + (yearCode.endsWith('-retry') ? '（再試験）' : ''),
      cells: [
        { label: '適性', doc: row.aptitude },
        { label: '基礎', doc: row.basic },
        { label: '建設', doc: row.construction },
        { label: '上下水道', doc: row['water-supply'] },
        { label: '水産', doc: row.fisheries },
      ],
    };
  });

  return <ExamMatrix columns={columns} rows={rows} />;
}

/**
 * 技術士第二次試験（建設部門）の過去問を 科目 × 年度 のマトリクスで表示。
 * 行 = 必須科目I + 11 選択科目、列 = 令和元年度以降。受験者は「必須 + 自分の選択科目1つ」を
 * 年度横断で追うため、年度×2-3列の他資格テーブルではなく科目行のマトリクスにする。
 *
 * 描画は全資格共通の ExamMatrix に委譲する（2026-07-30）。旧実装は独自の desktop 表＋モバイル
 * 科目カードを持っており、(1) `w-full` の表が枠内に縮んで科目列が 64px まで潰れ最長 5 行に折返す
 * （記事カラム 527px = 993〜1150px 帯）、(2) モバイルはカード 12 枚で 3,423px という 2 つの崩れが
 * あった。ExamMatrix 側の `min-w-full`＋行ラベル sticky＋`dense`＋チップリストで両方を解消する。
 * 行ラベルは PE_CONSTRUCTION_SUBJECTS（lib）が真実源＝キーワード節と同一表記・同一順。
 */
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

  // 年度は新しい順
  const years = Array.from(yearSet).sort(compareExamYearDesc);
  // 列見出しは「年度」を除いた短い形（令和7・令和元）
  const colLabel = (code: string) => examYearLabel(code).replace(/年度$/, '');
  // モバイルチップ用の短縮年度。7 個を横に並べるため「令和7」(4字) では 3 行に折返す。
  // R 表記はキーワード節のセル（"R01〜R07"）で既に使っている同一ページ内の語彙。
  const chipYear = (code: string) => {
    const num = parseInt(code.slice(1));
    return num === 1 ? 'R元' : `R${num}`;
  };

  // 定義順の科目のうちデータが存在するものだけ
  const subjects = PE_CONSTRUCTION_SUBJECTS.filter(s => map.has(s.key));

  const columns = years.map(y => colLabel(y));
  const rows: ExamMatrixRow[] = subjects.map(subject => {
    const yearMap = map.get(subject.key)!;
    return {
      key: subject.key,
      label: subjectDisplayLabel(subject),
      labelTitle: subjectFullLabel(subject),
      // デスクトップは列見出しが年度を示すのでセル文字は "問題"。モバイルは見出しが無く行ラベルが
      // 科目になるため、チップ側が年度を名乗る（chipLabel）。
      cells: years.map(y => ({ label: '問題', chipLabel: chipYear(y), doc: yearMap.get(y) })),
    };
  });

  // dense: 8 列（科目 + 7 年度）は既定の px-4 では狭い記事カラムで横に溢れるため余白を詰める。
  // tableFrom='wide': 表の自然幅 600px を記事カラムが満たすのは viewport ≥1,116px（内容幅 = V − 516）。
  // それ未満で table を出すと横スクロールになるので、既存ブレークポイント xl(1280px) を切替点にして
  // 993〜1279px はチップリストで見せる（横スクロールを全幅域で 0 にする）。
  return (
    <ExamMatrix columns={columns} rows={rows} rowHeader="科目" rowLabelWidth="wide" dense tableFrom="wide" />
  );
}

/**
 * OGP サムネ左＋タイトル右の1行（資格トップの一覧・よく読まれている記事）。見た目と計測は ArticleThumbRow の feed 型が持つ
 * （2026-11-16 にサムネイルの行の実装を 1 つにまとめた。インフィード広告もこの型に合わせる）。
 */
export function OgpThumbRow({ doc, rank, eager = false, headingLevel = 'h3' }: { doc: DocMeta; rank?: number; eager?: boolean; headingLevel?: 'h3' | 'h4' }) {
  return (
    <ArticleThumbRow
      variant="feed"
      href={getPublicDocPath(doc.slug)}
      title={doc.shortTitle || doc.title}
      caption={doc.subtitle || doc.description}
      image={getCardImage(doc)}
      {...(rank != null ? { rank } : {})}
      eager={eager}
      headingLevel={headingLevel}
    />
  );
}

export function DocSection({ group, layout, secondaryDocs }: { group: DocGroup; layout?: 'cards' | 'ogp-rows' | 'exam-table' | 'exam-table-2' | 'pe-exam-table' | 'pe-first-stage-table' | 'pe-construction-exam-table'; secondaryDocs?: DocMeta[] | undefined }) {
  return (
    <section id={`sec-${group.key}`} className="scroll-mt-24">
      <div className="mb-6">
        <h2 className="font-serif text-[22px] sm:text-[26px] font-black text-(--ink)">{group.title}</h2>
        <p className="text-[14px] text-(--ink-muted) mt-1">{group.description}</p>
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
        <ul className="flex flex-col" data-cta="nav" data-cta-label="category-rows">
          {withFeedAds(group.docs, { key: group.key, budget: feedAdBudget() }).map(e => e.kind === 'ad' ? (
            <AdSlot key={e.key} as="li" slot="inFeedThumb" className="border-b border-(--rule-soft) py-4" />
          ) : (
            <OgpThumbRow key={e.item.slug} doc={e.item} />
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
