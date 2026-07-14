import Link from 'next/link';
import { type DocMeta } from '@/lib/docs';
import { type DocGroup } from '@/lib/category-groups';

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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base border-collapse">
        <thead>
          <tr className="border-b-2 border-[var(--rule-soft)]">
            <th className="text-left py-3 px-4 font-semibold text-[var(--ink-body)]">年度</th>
            <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">第1次 前期（6月）</th>
            <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">第1次 後期（10月）</th>
            {hasSecondary && (
              <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">第2次検定</th>
            )}
          </tr>
        </thead>
        <tbody>
          {years.map(yearCode => {
            const pair = yearMap.get(yearCode)!;
            const secondary = secondaryMap.get(yearCode);
            return (
              <tr key={yearCode} className="border-b border-[var(--rule-soft)] hover:bg-[var(--accent-fill)] transition-colors">
                <td className="py-3 px-4 font-medium text-[var(--ink)]">{yearLabel(yearCode)}</td>
                <td className="py-3 px-4 text-center">
                  {pair.zenki ? (
                    <Link href={`/docs/${pair.zenki.slug}`} className="text-[var(--accent)] hover:underline">
                      前期
                    </Link>
                  ) : <span className="text-[var(--ink-muted)] opacity-50">—</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  {pair.kouki ? (
                    <Link href={`/docs/${pair.kouki.slug}`} className="text-[var(--accent)] hover:underline">
                      後期
                    </Link>
                  ) : <span className="text-[var(--ink-muted)] opacity-50">—</span>}
                </td>
                {hasSecondary && (
                  <td className="py-3 px-4 text-center">
                    {secondary ? (
                      <Link href={`/docs/${secondary.slug}`} className="text-[var(--accent)] hover:underline">
                        第2次
                      </Link>
                    ) : <span className="text-[var(--ink-muted)] opacity-50">—</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base border-collapse">
        <thead>
          <tr className="border-b-2 border-[var(--rule-soft)]">
            <th className="text-left py-3 px-4 font-semibold text-[var(--ink-body)]">年度</th>
            <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">第1次 問題A</th>
            <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">第1次 問題B</th>
            {hasSecondary && (
              <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">第2次検定</th>
            )}
          </tr>
        </thead>
        <tbody>
          {years.map(yearCode => {
            const pair = yearMap.get(yearCode)!;
            const secondary = secondaryMap.get(yearCode);
            return (
              <tr key={yearCode} className="border-b border-[var(--rule-soft)] hover:bg-[var(--accent-fill)] transition-colors">
                <td className="py-3 px-4 font-medium text-[var(--ink)]">{yearLabel(yearCode)}</td>
                <td className="py-3 px-4 text-center">
                  {pair.a ? (
                    <Link href={`/docs/${pair.a.slug}`} className="text-[var(--accent)] hover:underline">
                      問題A
                    </Link>
                  ) : <span className="text-[var(--ink-muted)] opacity-50">—</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  {pair.b ? (
                    <Link href={`/docs/${pair.b.slug}`} className="text-[var(--accent)] hover:underline">
                      問題B
                    </Link>
                  ) : <span className="text-[var(--ink-muted)] opacity-50">—</span>}
                </td>
                {hasSecondary && (
                  <td className="py-3 px-4 text-center">
                    {secondary ? (
                      <Link href={`/docs/${secondary.slug}`} className="text-[var(--accent)] hover:underline">
                        第2次
                      </Link>
                    ) : <span className="text-[var(--ink-muted)] opacity-50">—</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base border-collapse">
        <thead>
          <tr className="border-b-2 border-[var(--rule-soft)]">
            <th className="text-left py-3 px-4 font-semibold text-[var(--ink-body)]">年度</th>
            <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">択一式</th>
            <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">記述式</th>
          </tr>
        </thead>
        <tbody>
          {years.map(yearCode => {
            const pair = yearMap.get(yearCode)!;
            const era = yearCode[0];
            const yearNum = parseInt(yearCode.slice(1));
            const label = era === 'r'
              ? (yearNum === 1 ? '令和元年度' : `令和${yearNum}年度`)
              : `平成${yearNum}年度`;
            return (
              <tr key={yearCode} className="border-b border-[var(--rule-soft)] hover:bg-[var(--accent-fill)] transition-colors">
                <td className="py-3 px-4 font-medium text-[var(--ink)]">{label}</td>
                <td className="py-3 px-4 text-center">
                  {pair.primary ? (
                    <Link href={`/docs/${pair.primary.slug}`} className="text-[var(--accent)] hover:underline">
                      択一式
                    </Link>
                  ) : <span className="text-[var(--ink-muted)] opacity-50">—</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  {pair.secondary ? (
                    <Link href={`/docs/${pair.secondary.slug}`} className="text-[var(--accent)] hover:underline">
                      記述式
                    </Link>
                  ) : <span className="text-[var(--ink-muted)] opacity-50">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base border-collapse">
        <thead>
          <tr className="border-b-2 border-[var(--rule-soft)]">
            <th className="text-left py-3 px-4 font-semibold text-[var(--ink-body)]">年度</th>
            <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">適性科目</th>
            <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">基礎科目</th>
            <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">専門科目（建設）</th>
          </tr>
        </thead>
        <tbody>
          {years.map(yearCode => {
            const row = yearMap.get(yearCode)!;
            return (
              <tr key={yearCode} className="border-b border-[var(--rule-soft)] hover:bg-[var(--accent-fill)] transition-colors">
                <td className="py-3 px-4 font-medium text-[var(--ink)]">{yearLabel(yearCode)}</td>
                <td className="py-3 px-4 text-center">
                  {row.aptitude ? (
                    <Link href={`/docs/${row.aptitude.slug}`} className="text-[var(--accent)] hover:underline">
                      適性科目
                    </Link>
                  ) : <span className="text-[var(--ink-muted)] opacity-50">—</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  {row.basic ? (
                    <Link href={`/docs/${row.basic.slug}`} className="text-[var(--accent)] hover:underline">
                      基礎科目
                    </Link>
                  ) : <span className="text-[var(--ink-muted)] opacity-50">—</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  {row.construction ? (
                    <Link href={`/docs/${row.construction.slug}`} className="text-[var(--accent)] hover:underline">
                      専門科目
                    </Link>
                  ) : <span className="text-[var(--ink-muted)] opacity-50">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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
                    <Link
                      key={y}
                      href={`/docs/${doc.slug}`}
                      className="inline-flex items-center rounded-card-inline border border-[var(--rule-soft)] bg-[var(--accent-fill)] px-3 py-2 text-sm font-medium text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                    >
                      {colLabel(y)}
                    </Link>
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

export function DocSection({ group, layout, secondaryDocs }: { group: DocGroup; layout?: 'cards' | 'exam-table' | 'exam-table-2' | 'pe-exam-table' | 'pe-first-stage-table' | 'pe-construction-exam-table'; secondaryDocs?: DocMeta[] | undefined }) {
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
