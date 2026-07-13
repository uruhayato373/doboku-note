#!/usr/bin/env node
/**
 * quality-audit.mjs — コード・記事・画像/SVG の機械チェックを横断実行する統合 orchestrator。
 *
 * 既存の check-* / lint / test / build 系スクリプトを宣言的な CHECKS 配列で束ね、
 * 各チェックの pass/fail/skip/timeout・所要時間・stdout 要約を1回で収集する。
 * pre-commit（staged ゲート）や個別 npm script を置き換えるものではなく、
 * 「いま全部通るか」を1コマンドで俯瞰し、レポート化するための上位ランナー。
 *
 * 使い方:
 *   node scripts/quality-audit.mjs         # 全チェック実行 → .claude/state/quality/audit-latest.{json,md}
 *   node scripts/quality-audit.mjs --ci    # ci:true の厳格サブセットのみ・fail/timeout で exit 1・レポート書込なし
 *   node scripts/quality-audit.mjs --json  # 結果 JSON を stdout に出す（レポートファイルも書く）
 *
 * 設計:
 *   - 各チェックは spawnSync で独立プロセス実行。timeout 到達で SIGTERM → status='timeout'（ハング対策完結）。
 *   - `ci: true` = マージ前に守るべき厳格チェック（型・テスト・MDX・lint・ラチェット・リンク・台帳整合）。
 *   - `ci: false` = report-only（棚卸し・情報提供。census/knip/env-inventory 等。--ci では実行しない）。
 *   - `skip(env)` が理由文字列を返したらスキップ（dev server 必須・build 成果物必須など）。
 *   - 外部 API・公開更新（note/R2/deploy/fetch-*）は定義に載せない（副作用ゼロを保証）。
 *   - 存在しない npm script は skip 扱い（新チェックの段階導入に耐える）。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const OUT_DIR = join(ROOT, '.claude', 'state', 'quality');
const JSON_OUT = join(OUT_DIR, 'audit-latest.json');
const MD_OUT = join(OUT_DIR, 'audit-latest.md');
const CENSUS = join(OUT_DIR, 'census.json');

const argv = process.argv.slice(2);
const CI = argv.includes('--ci');
const EMIT_JSON = argv.includes('--json');

function readJson(p, fallback) {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; }
}

const PKG = readJson(join(ROOT, 'package.json'), { scripts: {} });

// localhost:port が LISTEN しているか（dev server 検出）。500ms で諦める。
function portOpen(port) {
  return new Promise((res) => {
    const sock = net.connect({ host: '127.0.0.1', port }, () => { sock.destroy(); res(true); });
    sock.on('error', () => res(false));
    sock.setTimeout(500, () => { sock.destroy(); res(false); });
  });
}

// ---- チェック定義 ---------------------------------------------------------
// npm: package.json の script 名 / cmd: 直接コマンド配列。どちらか一方。
const CHECKS = [
  // ── ci:true 厳格ゲート ──
  { id: 'type-check', npm: 'type-check', timeout: 240_000, ci: true },
  { id: 'unit-tests', npm: 'test', timeout: 180_000, ci: true },
  { id: 'eslint', npm: 'lint', timeout: 180_000, ci: true },
  { id: 'validate-mdx', npm: 'validate-mdx', timeout: 180_000, ci: true },
  { id: 'content-quality-ratchet', npm: 'check-content-quality:ci', timeout: 240_000, ci: true, note: 'latest-report.md を上書き' },
  { id: 'frontmatter', cmd: ['node', '.claude/scripts/lint-frontmatter.mjs', '--all'], timeout: 180_000, ci: true },
  { id: 'svg-audit', npm: 'audit-svg:ci', timeout: 180_000, ci: true, note: 'svg-audit.json を上書き' },
  { id: 'image-assets', npm: 'check-image-assets:ci', timeout: 120_000, ci: true },
  { id: 'orphan-figures', npm: 'check-orphan-figures', timeout: 90_000, ci: true },
  { id: 'orphan-ogp', npm: 'check-orphan-ogp', timeout: 90_000, ci: true },
  { id: 'guide-length', npm: 'check-guide-length', timeout: 90_000, ci: true },
  { id: 'home-exam-coverage', npm: 'check-home-exam-coverage', timeout: 60_000, ci: true },
  { id: 'category-curriculum', npm: 'check-category-curriculum', timeout: 60_000, ci: true },
  { id: 'note-funnel', npm: 'check-note-funnel', timeout: 90_000, ci: true },
  { id: 'doc-refs', npm: 'check-doc-refs', timeout: 90_000, ci: true },
  { id: 'katex-warnings', npm: 'audit-katex:ci', timeout: 240_000, ci: true, note: 'build の KaTeX strict 警告を数式単位で検出（remark-math パイプライン。0 件を維持）' },

  // ── report-only（棚卸し・情報提供。--ci では実行しない） ──
  // 既存の未解消問題のため report-only（gate に入れると既存債務で CI が赤になる）:
  //   internal-links = concrete-chief 等の RelatedKeywords に存在しない slug（定期監査は link-audit.yml が担当）
  //   note-meta-lint = note:fs/promises の glob import が Node20 で未提供（スクリプト側の既存バグ・要修正）
  { id: 'internal-links', npm: 'check-links', timeout: 180_000, ci: false, note: 'ローカル slug 照合。既存 BROKEN_SLUG 債務あり（link-audit.yml が定期監査）' },
  { id: 'note-meta-lint', npm: 'note-meta-lint', timeout: 60_000, ci: false, note: '既存バグ: node:fs/promises glob が Node20 未提供でクラッシュ（要修正）' },
  { id: 'doc-lifecycle', npm: 'check-doc-lifecycle', timeout: 90_000, ci: false },
  { id: 'policy-anchors', npm: 'check-policy-anchors', timeout: 90_000, ci: false },
  { id: 'ogp-coverage', npm: 'check-ogp-coverage', timeout: 90_000, ci: false },
  { id: 'ogp-design', npm: 'check-ogp-design', timeout: 120_000, ci: false },
  { id: 'quality-census', npm: 'quality-census', timeout: 180_000, ci: false, note: 'census.json 再生成（薄層可視化）' },
  { id: 'env-inventory', cmd: ['node', 'scripts/report-env-inventory.mjs'], timeout: 60_000, ci: false },
  { id: 'knip', npm: 'knip', timeout: 300_000, ci: false, note: 'デッドコード候補（要 grep 裏取り）' },
  {
    id: 'cta-density', npm: 'check-cta-density', timeout: 90_000, ci: false,
    skip: () => existsSync(join(ROOT, 'out', 'docs')) ? null : 'ビルド成果物 out/docs が無い（npm run build 後に実行）',
  },
  {
    id: 'seo-meta', npm: 'check-seo-meta', timeout: 300_000, ci: false,
    skip: async () => (await portOpen(3020)) ? null : 'dev server (localhost:3020) 不在（npm run dev 起動時のみ実行）',
  },
];

function resolveCommand(check) {
  if (check.cmd) return check.cmd;
  if (check.npm) {
    if (!PKG.scripts || !PKG.scripts[check.npm]) return null; // 未定義 script
    return ['npm', 'run', '--silent', check.npm];
  }
  return null;
}

function tail(str, n = 20) {
  if (!str) return '';
  const lines = str.replace(/\s+$/, '').split('\n');
  return lines.slice(-n).join('\n');
}

async function runCheck(check) {
  const started = Date.now();
  if (CI && !check.ci) return null; // --ci では report-only を実行しない
  if (check.skip) {
    const reason = await check.skip();
    if (reason) return { id: check.id, ci: check.ci, status: 'skip', skipReason: reason, durationMs: 0, note: check.note };
  }
  const command = resolveCommand(check);
  if (!command) {
    return { id: check.id, ci: check.ci, status: 'skip', skipReason: `npm script '${check.npm}' が未定義`, durationMs: 0, note: check.note };
  }
  const r = spawnSync(command[0], command.slice(1), {
    cwd: ROOT, encoding: 'utf8', timeout: check.timeout, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  const durationMs = Date.now() - started;
  let status;
  if (r.error && r.error.code === 'ETIMEDOUT') status = 'timeout';
  else if (r.status === 0) status = 'pass';
  else status = 'fail';
  return {
    id: check.id, ci: check.ci, status, exitCode: r.status ?? null, durationMs,
    stdoutTail: tail(r.stdout), stderrTail: tail(r.stderr), note: check.note,
  };
}

function censusSummary() {
  const c = readJson(CENSUS, null);
  if (!c) return null;
  // build-quality-census.mjs の出力から薄層件数を拾う（スキーマ差異に頑健に）
  const flat = JSON.stringify(c);
  const thin = (flat.match(/"thin"/g) || []).length;
  return { hasCensus: true, thinMarkers: thin };
}

function buildMarkdown(results, meta) {
  const L = [];
  L.push('# 機械品質監査レポート (quality:audit)');
  L.push('');
  L.push(`- 生成: ${meta.stamp}`);
  L.push(`- モード: ${CI ? 'CI（厳格サブセット）' : 'フル（report 含む）'}`);
  const counts = results.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  L.push(`- 結果: pass ${counts.pass || 0} / fail ${counts.fail || 0} / timeout ${counts.timeout || 0} / skip ${counts.skip || 0}`);
  L.push('');
  L.push('| チェック | 区分 | 状態 | 時間 | 備考 |');
  L.push('|---|---|---|---|---|');
  for (const r of results) {
    const badge = { pass: 'PASS', fail: '**FAIL**', timeout: '**TIMEOUT**', skip: 'skip' }[r.status];
    const sec = r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : '—';
    const memo = r.status === 'skip' ? (r.skipReason || '') : (r.note || '');
    L.push(`| ${r.id} | ${r.ci ? 'ci' : 'report'} | ${badge} | ${sec} | ${memo} |`);
  }
  const failed = results.filter((r) => r.status === 'fail' || r.status === 'timeout');
  if (failed.length) {
    L.push('');
    L.push('## 失敗の詳細（stdout 末尾）');
    for (const r of failed) {
      L.push('');
      L.push(`### ${r.id} — ${r.status} (exit ${r.exitCode})`);
      L.push('```');
      L.push(tail(r.stdoutTail, 20) || '(stdout 空)');
      if (r.stderrTail) { L.push('--- stderr ---'); L.push(tail(r.stderrTail, 10)); }
      L.push('```');
    }
  }
  if (meta.census) {
    L.push('');
    L.push('## census（薄層コンテンツの目安）');
    L.push(`- census.json あり。thin マーカー数（概算）: ${meta.census.thinMarkers}。詳細は quality-census 出力を参照。`);
  }
  L.push('');
  return L.join('\n');
}

async function main() {
  const stamp = new Date().toISOString();
  const results = [];
  for (const check of CHECKS) {
    const res = await runCheck(check);
    if (res) {
      results.push(res);
      const badge = { pass: 'PASS', fail: 'FAIL', timeout: 'TIMEOUT', skip: 'SKIP' }[res.status];
      const sec = res.durationMs ? ` ${(res.durationMs / 1000).toFixed(1)}s` : '';
      process.stderr.write(`[${badge}] ${res.id}${sec}${res.skipReason ? ' — ' + res.skipReason : ''}\n`);
    }
  }
  const meta = { stamp, census: censusSummary() };
  const failed = results.filter((r) => r.status === 'fail' || r.status === 'timeout');

  if (!CI) {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(JSON_OUT, JSON.stringify({ generated_at: stamp, ci: CI, results, census: meta.census }, null, 2));
    writeFileSync(MD_OUT, buildMarkdown(results, meta));
    process.stderr.write(`\n[quality-audit] レポート: ${JSON_OUT} / ${MD_OUT}\n`);
  }
  if (EMIT_JSON) process.stdout.write(JSON.stringify({ results, failed: failed.map((f) => f.id) }, null, 2) + '\n');

  const summary = results.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  process.stderr.write(`[quality-audit] pass ${summary.pass || 0} / fail ${summary.fail || 0} / timeout ${summary.timeout || 0} / skip ${summary.skip || 0}\n`);

  if (CI && failed.length) {
    process.stderr.write(`[quality-audit] CI 失敗: ${failed.map((f) => f.id).join(', ')}\n`);
    process.exit(1);
  }
}

main();
