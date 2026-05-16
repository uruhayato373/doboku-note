#!/usr/bin/env node
/**
 * docs/project/02_コンテンツ/05_品質サイクル進捗.md の自動生成テーブル領域を再生成する。
 *
 * 入力:
 *   - .claude/state/quality-scores.json       (5軸スコア)
 *   - .claude/state/quality-cycle-state.json  (status / history)
 *   - .claude/state/keyword-summaries.json    (title)
 *   - .claude/state/metrics/gsc/gsc-page-*.json (最新ファイル、GSC pos/impr/clicks)
 *
 * 出力:
 *   - docs/project/02_コンテンツ/05_品質サイクル進捗.md の AUTO マーカー間
 *
 * ファイルが無ければ B/C セクション込みのテンプレで新規作成する。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SCORES_PATH = join(ROOT, '.claude/state/quality-scores.json');
const STATE_PATH = join(ROOT, '.claude/state/quality-cycle-state.json');
const SUMMARIES_PATH = join(ROOT, '.claude/state/keyword-summaries.json');
const GSC_DIR = join(ROOT, '.claude/state/metrics/gsc');
const OUT_PATH = join(ROOT, 'docs/project/02_コンテンツ/05_品質サイクル進捗.md');

const URL_PREFIX = 'https://doboku-note.com/docs/pe-comprehensive-management-';
const LOCAL_PREFIX = 'http://localhost:3020/docs/pe-comprehensive-management-';
const AUTO_START = '<!-- AUTO-GENERATED-START: build-progress-md.mjs -->';
const AUTO_END = '<!-- AUTO-GENERATED-END -->';

// ── データロード ────────────────────────────────────────────────

function loadJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function loadLatestGscPage() {
  const files = readdirSync(GSC_DIR)
    .filter((f) => f.startsWith('gsc-page-') && f.endsWith('.json'))
    .sort();
  if (files.length === 0) return { rows: [], file: null };
  const latest = files[files.length - 1];
  return { ...loadJson(join(GSC_DIR, latest)), file: latest };
}

function urlToSlug(url) {
  if (!url.startsWith(URL_PREFIX)) return null;
  return url.slice(URL_PREFIX.length).replace(/\/$/, '');
}

// ── 行ビルド ────────────────────────────────────────────────────

function buildRows({ scores, state, summaries, gsc }) {
  const gscBySlug = new Map();
  for (const row of gsc.rows || []) {
    const slug = urlToSlug(row.keys?.[0] || '');
    if (slug) gscBySlug.set(slug, row);
  }

  const rows = [];
  for (const [slug, score] of Object.entries(scores.pages)) {
    const cycleEntry = state.pages?.[slug];
    const summary = summaries.keywords?.[slug];
    const g = gscBySlug.get(slug);

    const rewriteCount = (cycleEntry?.history || []).filter((h) => h.action === 'rewritten').length;
    const lastDate = (cycleEntry?.history || []).at(-1)?.date || score.scored_at;

    rows.push({
      slug,
      title: summary?.title || '—',
      gscPos: g?.position ?? null,
      impr: g?.impressions ?? 0,
      clicks: g?.clicks ?? 0,
      weighted: score.weighted,
      weakAxes: score.weak_axes || [],
      rewriteCount,
      status: cycleEntry?.status || '未着手',
      lastDate: lastDate ? lastDate.slice(0, 10) : '—',
    });
  }

  rows.sort((a, b) => a.weighted - b.weighted);
  return rows;
}

// ── テーブル整形 ────────────────────────────────────────────────

function formatPos(p) {
  if (p == null) return '—';
  return p.toFixed(1);
}

function formatWeighted(w) {
  return w.toFixed(2);
}

function formatStatus(s) {
  return s;
}

function buildTable(rows) {
  const header = '| title | GSC pos | impr | clicks | weighted | weak axes | rewrites | status | 最終更新 |';
  const sep = '|---|---:|---:|---:|---:|---|---:|---|---|';
  const lines = [header, sep];
  for (const r of rows) {
    const titleLink = `[${r.title}](${LOCAL_PREFIX}${r.slug})`;
    const weakAxes = r.weakAxes.length ? r.weakAxes.join(',') : '—';
    lines.push(
      `| ${titleLink} | ${formatPos(r.gscPos)} | ${r.impr} | ${r.clicks} | ${formatWeighted(r.weighted)} | ${weakAxes} | ${r.rewriteCount} | ${formatStatus(r.status)} | ${r.lastDate} |`
    );
  }
  return lines.join('\n');
}

function buildSummary(rows) {
  const total = rows.length;
  const approved = rows.filter((r) => r.status === 'approved').length;
  const rewritten = rows.filter((r) => r.status === 'rewritten').length;
  const untouched = rows.filter((r) => r.status === '未着手').length;
  const lt2 = rows.filter((r) => r.weighted < 2.0).length;
  const lt25 = rows.filter((r) => r.weighted < 2.5).length;
  return [
    `**集計**: 全 ${total} 件 / weighted < 2.0: ${lt2} 件 / weighted < 2.5: ${lt25} 件`,
    `**状態**: approved ${approved} / rewritten ${rewritten} / 未着手 ${untouched}`,
  ].join('  \n');
}

// ── md 組み立て ─────────────────────────────────────────────────

function buildAutoSection({ rows, gscFile, scoresAt }) {
  const ts = new Date().toISOString();
  return [
    AUTO_START,
    '',
    `_最終生成: ${ts}_  `,
    `_スコア source: \`quality-scores.json\` (${scoresAt})_  `,
    `_GSC source: \`.claude/state/metrics/gsc/${gscFile || '(なし)'}\`_`,
    '',
    buildSummary(rows),
    '',
    '## A. 進捗テーブル（weighted 昇順）',
    '',
    buildTable(rows),
    '',
    AUTO_END,
  ].join('\n');
}

const TEMPLATE_PREFIX = `---
title: 品質サイクル進捗
status: active
last_updated: ${new Date().toISOString().slice(0, 10)}
cssclasses:
  - wide-page
related_files:
  - .claude/state/quality-scores.json
  - .claude/state/quality-cycle-state.json
  - .claude/skills/quality/quality-cycle/scripts-cem/build-progress-md.mjs
---

# 品質サイクル進捗（cem プロファイル）

総監キーワードページ（pe-comprehensive-management）の採点・リライト進捗を一元管理する。

- **A. 進捗テーブル**: \`build-progress-md.mjs\` で自動生成（手動編集禁止）
- **B. サブ論点 決定ログ**: 自動化アーキテクチャの 5 サブ論点の決定を追記
- **C. 個別記事メモ**: 自動採点で現れない発見を記録

再生成: \`node .claude/skills/quality/quality-cycle/scripts-cem/build-progress-md.mjs\`

`;

const TEMPLATE_SUFFIX = `

---

## B. サブ論点 決定ログ

自動化アーキテクチャの 5 サブ論点を順に詰める。決定したら日付 + 結論 + 理由を追記。

### 1. Impact スコアの重み（pos_weight・impr の対数化・impr=0 救済）

**ステータス**: 議論中
**論点**:
- pos_weight = \`1/pos\` か \`(31-pos)/30\` か（pos=1 で重み 1.0、pos=30 で限りなく 0）
- impr の対数化: \`log(impr+1)\` で impr=0 を完全に殺さない
- impr=0 の救済: 強制セットに新規 commit ページを入れて拾うか

**決定**: 未

### 2. 強制セットの定義（必ず処理対象に入れる slug 集合）

**ステータス**: 未着手
**候補**: r03/r04 primary に紐付く slug、新規 commit から N 日以内、cem-qa が前回 0 軸を出した slug

**決定**: 未

### 3. Diff 計測単位（auto-approve 条件の Diff < 15% の単位）

**ステータス**: 未着手
**候補**: 文字数差分、AST diff（追加/削除/移動の重み付け）、行ベース diff

**決定**: 未

### 4. 失敗時の挙動（3 ラウンド回しても <2.0 のページ）

**ステータス**: 未着手
**候補**: \`needs-rework\` で人間エスカレーション（既存）、\`rejected\` に落とす、再試行戦略を切替

**決定**: 未

### 5. commit 粒度（1 ページ 1 commit か、N 件まとめてか）

**ステータス**: 未着手
**候補**: 1 ページ 1 commit（追跡しやすい）、5-10 件まとめ（履歴コンパクト）、cycle 単位

**決定**: 未

---

## C. 個別記事メモ

採点軸では現れないが処理中に気づいたメモ。日付 + slug + 観察を追記。

（まだ無し）
`;

function assembleNew(autoSection) {
  return TEMPLATE_PREFIX + autoSection + TEMPLATE_SUFFIX;
}

function replaceAuto(existing, autoSection) {
  const startIdx = existing.indexOf(AUTO_START);
  const endIdx = existing.indexOf(AUTO_END);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`AUTO マーカーが見つかりません: ${OUT_PATH}`);
  }
  const before = existing.slice(0, startIdx);
  const after = existing.slice(endIdx + AUTO_END.length);
  return before + autoSection + after;
}

// ── メイン ───────────────────────────────────────────────────

function main() {
  const scores = loadJson(SCORES_PATH);
  const state = loadJson(STATE_PATH);
  const summaries = loadJson(SUMMARIES_PATH);
  const gsc = loadLatestGscPage();

  const rows = buildRows({ scores, state, summaries, gsc });
  const autoSection = buildAutoSection({
    rows,
    gscFile: gsc.file,
    scoresAt: scores.scored_at,
  });

  let output;
  if (existsSync(OUT_PATH)) {
    const existing = readFileSync(OUT_PATH, 'utf8');
    output = replaceAuto(existing, autoSection);
  } else {
    output = assembleNew(autoSection);
  }

  writeFileSync(OUT_PATH, output, 'utf8');
  console.log(`✓ ${OUT_PATH}`);
  console.log(`  全 ${rows.length} 件 / weighted < 2.0: ${rows.filter((r) => r.weighted < 2.0).length} / GSC join: ${rows.filter((r) => r.gscPos != null).length}`);
}

main();
