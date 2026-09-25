#!/usr/bin/env tsx
/**
 * exam-expansion.mts — 展開対象試験カタログの一覧・優先順位を出す／整合を検査する。
 *
 *   npm run exam-expansion              # 対応中・展開候補（優先順）・見送りを Markdown 表で出力
 *   npm run exam-expansion -- --json    # 同じ内容を JSON で出力
 *   npm run check-exam-expansion        # 整合検査だけ（exit 1 = 不整合）
 *
 * SSOT: .claude/config/exam-expansion-catalog.json（評点・競合・候補の数値）
 * 対応状況は実物から数える: content/site/**（MDX の published）・src/lib/note-magazines.ts・
 * src/lib/coconala-services.ts・scripts/kindle-published/catalog.json。
 * 判定・採点ロジックは scripts/lib/exam-expansion.mjs に集約する。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { NOTE_MAGAZINES } from '../src/lib/note-magazines';
import { COCONALA_SERVICES } from '../src/lib/coconala-services';
import { EXAM_BRAND, examKeyOf } from '../src/lib/exam-brand';
import { CATALOG_PATH, buildCoverage, countSiteDocs, rankCatalog, validateCatalog } from './lib/exam-expansion.mjs';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const readJson = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));

try {
  const catalog = readJson(CATALOG_PATH);
  const examStats = readJson('.claude/config/exam-stats.json');
  const profile = readFileSync(join(root, 'content/note/プロフィール.md'), 'utf8');
  const personaBlock = /personaQualifications:\s*\n((?:\s+-\s+.+\n)+)/.exec(profile)?.[1] ?? '';
  const profileQualifications = [...personaBlock.matchAll(/-\s+(.+)/g)].map((m) => m[1].trim());
  if (profileQualifications.length === 0) throw new Error('プロフィール.md の personaQualifications を読めない');
  const scopeUnion = /export type CoconalaExamScope =([^;]+);/.exec(readFileSync(join(root, 'src/lib/coconala-services.ts'), 'utf8'))?.[1] ?? '';
  const coconalaScopes = [...scopeUnion.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const books = readJson('scripts/kindle-published/catalog.json').books as { series: string; status: string }[];
  const siteRoot = join(root, 'content/site');
  const siteDirs = readdirSync(siteRoot).filter((d) => statSync(join(siteRoot, d)).isDirectory());
  const examSiteDirs = (readJson('src/config/categories.json') as { slug: string; area: string }[]).filter((c) => c.area === 'exam').map((c) => c.slug);

  const errors = validateCatalog(catalog, {
    examStats,
    profileQualifications,
    noteExamKeys: Object.keys(EXAM_BRAND),
    coconalaScopes,
    kindleSeries: [...new Set(books.map((b) => b.series))],
    siteDirs,
    examSiteDirs,
  });
  if (args.has('--check') || errors.length > 0) {
    const counts = catalog.exams.reduce((a: Record<string, number>, e: { status: string }) => ({ ...a, [e.status]: (a[e.status] ?? 0) + 1 }), {});
    console.log(`[exam-expansion] ${errors.length ? 'FAIL' : 'PASS'}: ${catalog.exams.length}試験を検査（対応中 ${counts.active ?? 0}・候補 ${counts.candidate ?? 0}・見送り ${counts.rejected ?? 0}）`);
    for (const e of errors) console.error(`  ${e}`);
    if (errors.length) process.exitCode = 1;
    process.exit();
  }

  const inputs = {
    site: Object.fromEntries(siteDirs.filter((d) => existsSync(join(siteRoot, d))).map((d) => [d, countSiteDocs(root, d)])),
    magazines: Object.values(NOTE_MAGAZINES).map((m) => ({ examKey: examKeyOf(m.id), published: m.published })),
    coconala: Object.values(COCONALA_SERVICES).map((s) => ({ scopes: [...s.examScope], status: s.status })),
    kindle: books,
  };
  const ranked = rankCatalog(catalog, examStats);
  const withCoverage = Object.fromEntries(Object.entries(ranked).map(([k, rows]) => [k, rows.map((r) => ({ ...r, coverage: buildCoverage(r.exam, inputs) }))]));

  if (args.has('--json')) {
    const out = Object.fromEntries(Object.entries(withCoverage).map(([k, rows]) => [k, rows.map(({ exam, ...r }) => ({ label: exam.label, ...r, competition: exam.competition, nextAction: exam.nextAction }))]));
    console.log(JSON.stringify({ verifiedAt: catalog.verifiedAt, ...out }, null, 2));
    process.exit();
  }

  const fmtN = (n: number | null) => (n == null ? '未確認' : n.toLocaleString('ja-JP'));
  const essay: Record<string, string> = { experience: '経験記述', general: '論文・記述', short: '短答記述', none: 'なし' };
  const comp: Record<string, string> = { low: '薄い', mid: '中', high: '濃い', unknown: '未調査' };
  const s = (r: { exam: { scores: Record<string, number> }; market: number | null }) => {
    const x = r.exam.scores;
    return `${x.wtp}/${x.authenticity}/${x.competitionGap}/${x.assetReuse}/${r.market ?? '-'}/${x.evergreen}`;
  };
  const note = (r: { gates: string[]; flags: string[] }) => [...r.gates.map((g) => `✕${g}`), ...r.flags].join('・');
  const cov = (c: ReturnType<typeof buildCoverage>) => `サイト ${c.site.published}${c.site.unpublished ? `(+下書き${c.site.unpublished})` : ''} / note ${c.note.published} / ココナラ ${c.coconala.listed} / Kindle ${c.kindle.live}`;
  const lines = [
    `# 展開対象試験カタログ（評点 ${catalog.verifiedAt} 時点）`,
    '',
    '評点の並び: 有料需要/真正性/競合の隙/資産流用/市場/毎年売れるか（各0〜3・市場は受験者数から自動）。重み・基準は exam-expansion-catalog.json の scoring。',
    '',
    '## 展開候補（優先順）',
    '',
    '| 順 | 試験 | スコア | 評点 | 受験者 | 論文 | 競合 | 注記 | 次の一手 |',
    '|---:|---|---:|---|---:|---|---|---|---|',
    ...withCoverage.candidate.map((r, i) => `| ${i + 1} | ${r.exam.label} | ${r.score} | ${s(r)} | ${fmtN(r.examinees)} | ${essay[r.exam.essay.type]} | ${comp[r.exam.competition.level]} | ${note(r)} | ${r.exam.nextAction} |`),
    '',
    '## 対応中（スコア順）',
    '',
    '| 試験 | スコア | 評点 | 受験者 | 対応状況（公開数） | 次の一手 |',
    '|---|---:|---|---:|---|---|',
    ...withCoverage.active.map((r) => `| ${r.exam.label} | ${r.score} | ${s(r)} | ${fmtN(r.examinees)} | ${cov(r.coverage)} | ${r.exam.nextAction} |`),
    '',
    '## 見送り',
    '',
    '| 試験 | スコア | 注記 | 理由 |',
    '|---|---:|---|---|',
    ...withCoverage.rejected.map((r) => `| ${r.exam.label} | ${r.score} | ${note(r)} | ${r.exam.rationale} |`),
  ];
  console.log(lines.join('\n'));
} catch (e) {
  console.error(`[exam-expansion] FAIL: ${(e as Error).message}`);
  process.exitCode = 1;
}
