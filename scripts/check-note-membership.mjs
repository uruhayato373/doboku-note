#!/usr/bin/env node
import { resolveProfileDir } from './lib/playwright-auth-profile.mjs';
/**
 * check-note-membership.mjs
 * ---------------------------------------------------------------------------
 * note メンバーシップの「会費・定員・プラン ID」が SSOT とズレていないかを機械で検知する。
 *
 * なぜ要るか（2026-08-06）: note は**一度設定した会費と人数制限を変更できない**（静的テキスト化
 * して入力欄が消える）。変更手段はプランの作り直ししか無いので、ドリフトに気づくのが遅れるほど
 * 修復コストが上がる。実際にこの日、添削つきプランを ¥2,980→¥4,980 に作り直した後、
 * サイトコードと docs 4 箇所に旧価格 ¥2,980 が残り、さらに **設計 SSOT の定員 10 名 と
 * 実機の 20 名 が食い違っている**ことが手作業の棚卸しで初めて分かった。それを機械化する。
 *
 * 検査:
 *   A. mirrors  — config の価格から作った期待文字列が、宣言した各ファイルに実在するか
 *   B. 定員     — SSOT doc に出てくる「定員 N（名）」が config の limit と一致するか
 *   C. planId   — 退役した planId が repo に残っていないか（config の plans[].id 以外の 12 桁 id）
 *   D. --live   — 実機（/membership/settings/manage）の価格・公開状態が config と一致するか
 *                 （Playwright・ローカル専用。未指定なら A-C のみ）
 *
 * **検査ゼロを PASS と呼ばない**: 検査対象数と実検査数を必ず出力し、mirrors が 0 件なら FAIL。
 *
 * 使い方:
 *   node scripts/check-note-membership.mjs           # オフライン（CI 可）
 *   node scripts/check-note-membership.mjs --live    # 実機突合（ローカル・note ログイン要）
 *
 * 真実源: .claude/config/note-membership.json / memory `note-membership-publish`
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CFG = join(ROOT, '.claude/config/note-membership.json');
const LIVE = process.argv.includes('--live');
if (!existsSync(CFG)) { console.error(`[check-note-membership] FAIL: config が無い: ${CFG}`); process.exit(1); }
const cfg = JSON.parse(readFileSync(CFG, 'utf8'));
const byKey = Object.fromEntries(cfg.plans.map((p) => [p.key, p]));
const fail = [];
const warn = [];
let checks = 0;

// ---- A. mirrors -----------------------------------------------------------
const expand = (s) => s.replace(/\{(\w+)\}/g, (_, k) => {
  const p = byKey[k];
  if (!p) throw new Error(`mirrors の {${k}} に対応する plans[].key が無い`);
  return p.price.toLocaleString('en-US');
});
const mirrors = cfg.mirrors || [];
for (const m of mirrors) {
  const abs = join(ROOT, m.file);
  if (!existsSync(abs)) { fail.push(`mirror ファイルが無い: ${m.file}`); continue; }
  const want = expand(m.must);
  checks++;
  if (!readFileSync(abs, 'utf8').includes(want)) fail.push(`${m.file}: 期待文字列が無い → "${want}"`);
}
if (mirrors.length === 0) fail.push('mirrors が 0 件（検査不成立。config に宣言せよ）');

// ---- B. 定員 --------------------------------------------------------------
// 「定員 10」「定員10名」「定員（10名）」等を拾い、limit を持つプランの値と突合する。
const limits = cfg.plans.filter((p) => typeof p.limit === 'number').map((p) => p.limit);
const limitDocs = mirrors.map((m) => m.file).filter((f) => f.endsWith('.md'));
for (const f of limitDocs) {
  const abs = join(ROOT, f);
  if (!existsSync(abs)) continue;
  const text = readFileSync(abs, 'utf8');
  // 行単位で見る。同じ行に現行値（config の limit）も書いてあるなら、それは
  // 「設計時は10名だったが実枠は20名」のような **履歴つきの記述**なので咎めない。
  // 現行値に一切触れずに旧い定員だけを述べている行だけが陳腐化の疑い。
  let hitLines = 0;
  const bad = new Set();
  for (const line of text.split('\n')) {
    const hits = [...line.matchAll(/定員[（(]?\s*(\d+)\s*(?:名|人)?/g)].map((m) => Number(m[1]));
    if (!hits.length) continue;
    hitLines++;
    if (limits.some((n) => line.includes(String(n)))) continue;
    hits.filter((n) => !limits.includes(n)).forEach((n) => bad.add(n));
  }
  checks += hitLines;
  if (bad.size) warn.push(`${f}: config の定員 ${JSON.stringify(limits)} と違う記述 ${JSON.stringify([...bad])}`);
}

// ---- C. 退役 planId の残存 -----------------------------------------------
// note の planId は 12 桁の 16 進風 id。repo 内に config 外の id が残っていたら退役漏れの疑い。
const known = new Set(cfg.plans.map((p) => p.id));
let grep = '';
try {
  grep = execFileSync('git', ['-c', 'core.quotepath=false', 'grep', '-nIE', 'plans/[0-9a-f]{12}|[0-9a-f]{12}=(通年|添削)'], { cwd: ROOT, encoding: 'utf8' });
} catch { /* ヒット無しは exit 1 */ }
const stale = new Map();
for (const line of grep.split('\n').filter(Boolean)) {
  for (const id of line.match(/[0-9a-f]{12}/g) || []) {
    if (!known.has(id) && !/削除|退役|旧/.test(line)) stale.set(id, (stale.get(id) || []).concat(line.split(':').slice(0, 2).join(':')));
  }
}
checks += grep.split('\n').filter(Boolean).length;
for (const [id, where] of stale) fail.push(`退役/未登録の planId ${id} が残存: ${where.slice(0, 3).join(' / ')}`);

// ---- D. --live 実機突合 ---------------------------------------------------
let liveChecked = 0;
if (LIVE) {
  const { chromium } = await import('playwright');
  const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  const ctx = await chromium.launchPersistentContext(resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT }), {
    channel: 'chrome', headless: false, ignoreHTTPSErrors: true, ...(PROXY ? { proxy: { server: PROXY } } : {}),
  });
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto('https://note.com/membership/settings/manage', { waitUntil: 'domcontentloaded', timeout: 60000 });
    try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
    await new Promise((r) => setTimeout(r, 4000));
    const rows = await page.evaluate(() => {
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const out = [];
      for (const a of document.querySelectorAll('a[href*="/plans/"]')) {
        const id = (a.getAttribute('href').match(/plans\/([0-9a-f]{12})\//) || [])[1];
        if (!id) continue;
        let row = a;
        for (let i = 0; i < 8 && row; i++, row = row.parentElement) {
          const t = norm(row.innerText);
          if (/[¥￥][\d,]+\s*\/\s*月/.test(t) && /公開/.test(t) && t.length < 200) break;
        }
        if (!row) continue;
        const sw = row.querySelector('[role=switch],input[type=checkbox]');
        out.push({
          id,
          price: Number((norm(row.innerText).match(/[¥￥]([\d,]+)\s*\/\s*月/) || [])[1]?.replace(/,/g, '') || 0),
          published: sw ? (sw.getAttribute('aria-checked') === 'true' || !!sw.checked) : null,
        });
      }
      return [...new Map(out.map((o) => [o.id, o])).values()];
    });
    liveChecked = rows.length;
    if (!rows.length) fail.push('--live: プラン行を1件も取得できず（検査不成立）');
    for (const p of cfg.plans) {
      const live = rows.find((r) => r.id === p.id);
      if (!live) { fail.push(`--live: config のプラン ${p.id}（${p.name}）が実機に無い`); continue; }
      if (live.price !== p.price) fail.push(`--live: ${p.name} の会費 実機¥${live.price} ≠ config ¥${p.price}`);
      if (live.published !== p.published) fail.push(`--live: ${p.name} の公開 実機${live.published} ≠ config ${p.published}`);
    }
    for (const r of rows) if (!known.has(r.id)) fail.push(`--live: config に無いプランが実機に存在: ${r.id} ¥${r.price}`);
  } finally { await ctx.close(); }
}

// ---- 結果 -----------------------------------------------------------------
console.log(`[check-note-membership] 検査 ${checks} 件（mirrors ${mirrors.length}・live ${LIVE ? liveChecked + ' プラン' : '未実施'}）`);
for (const w of warn) console.log(`  WARN ${w}`);
if (fail.length) {
  for (const f of fail) console.error(`  FAIL ${f}`);
  console.error(`[check-note-membership] FAIL ${fail.length} 件`);
  process.exit(1);
}
const unresolved = cfg.plans.filter((p) => p.limitDecision === 'unresolved');
if (unresolved.length) console.log(`  WARN 未決の定員判断: ${unresolved.map((p) => p.name).join(' / ')}（config の limitDecision）`);
console.log(`[check-note-membership] OK（WARN ${warn.length + unresolved.length} 件）`);
