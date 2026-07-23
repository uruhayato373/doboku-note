#!/usr/bin/env node
// note 公開記事の「構成監査」— 有料境界(paywall)の位置ズレ・漏洩・画像欠落・価格/タグ不整合を
// 公開API の無料プレビュー本文とソース期待値を突合して横断検出する（read-only・creds不要）。
//
// 背景: 再公開/値上げ後、有料ラインが想定位置とズレた記事・著者バナー欠落が疑われた。
//   既存 check-note-live-headings は「境界前の画像数」しか見ず、境界位置ズレ自体は素通り。
//   本スクリプトは paidBoundary（frontmatter・SSOT）で本文を無料/有料に分割し、
//   境界直後の"有料プローブ"が live 無料本文に出れば漏洩、境界直前の"無料プローブ"が
//   live に無ければ境界過大/全ロック、と判定する。
//
// 境界解決順（note-publish/note-update-body と統一）: paidBoundary > 既定 '試験問題|予想問題'。
// 公開API /api/v3/notes/{id} の data.body は有料記事だと無料プレビューのみ（＝ここが検査対象）。
//
// 使い方:
//   node scripts/check-note-structure.mjs            # レポート（.tmp/note-structure-audit.md にも保存）
//   node scripts/check-note-structure.mjs --json     # 機械可読
//   node scripts/check-note-structure.mjs --limit 20 # 先頭N本だけ（デバッグ）

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'docs/note';
const JSON_OUT = process.argv.includes('--json');
const LIMIT = (() => { const i = process.argv.indexOf('--limit'); return i >= 0 ? Number(process.argv[i + 1]) : Infinity; })();
const GOAL_TAGS = 90;
const CONCURRENCY = 8;

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name).replaceAll('\\', '/');
    if (e.isDirectory()) walk(p, acc);
    else if (/^article(-[^/]+)?\.md$/.test(e.name)) acc.push(p);
  }
  return acc;
}
// 水平空白限定の frontmatter パーサ（\s だと空フィールドが次行を bleed する）
const fm = (raw, k) => { const m = raw.match(new RegExp('^' + k + ':[ \\t]*(.*)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };
const stripFm = (raw) => raw.replace(/^---[\s\S]*?---\r?\n/, '');

// 検索用に正規化: HTMLタグ/markdown装飾/画像/リンク/コメント/記号/空白を除去して素テキスト化。
function norm(s) {
  return String(s)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*`_~|\-]/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/\s+/g, '')
    .trim();
}
// 境界H2の行 index（prefix一致・正規表現特殊文字はエスケープ）
function boundaryIndex(lines, boundary) {
  const alts = boundary.split('|').map((s) => s.trim());
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+)$/);
    if (!m) continue;
    const h = m[1].trim();
    if (alts.some((a) => h.startsWith(a))) return i;
  }
  return -1;
}

async function fetchNote(noteId, retries = 2) {
  for (let a = 0; a <= retries; a++) {
    try {
      const res = await fetch(`https://note.com/api/v3/notes/${noteId}`, { signal: AbortSignal.timeout(20000) });
      const j = await res.json();
      return { data: j?.data || null, error: null };
    } catch (e) { if (a === retries) return { data: null, error: String(e.message || e) }; await new Promise((r) => setTimeout(r, 2500)); }
  }
}

function analyzeSource(raw) {
  const body = stripFm(raw);
  const pricing = fm(raw, 'notePricing');
  const price = Number(fm(raw, 'price') || 0);
  const boundary = fm(raw, 'paidBoundary') || '試験問題|予想問題';
  const lines = body.split(/\r?\n/);
  const bIdx = pricing === 'paid' ? boundaryIndex(lines, boundary) : -1;
  // 無料プローブ = 境界直前の実テキスト行の正規化末尾30字 / 有料プローブ = 境界H2直後の実テキスト行の先頭30字
  let freeProbe = null, paidProbe = null, expectedFreeImgs = 0;
  if (bIdx >= 0) {
    for (let i = 0; i < bIdx; i++) if (/^!\[/.test(lines[i].trim())) expectedFreeImgs++;
    // free probe: 境界前で最後の非空・非見出し・非画像・非CTA行
    for (let i = bIdx - 1; i >= 0; i--) {
      const t = norm(lines[i]);
      if (t.length >= 8 && !/^!\[|^#|note\.com/.test(lines[i].trim())) { freeProbe = t.slice(-30); break; }
    }
    // paid probe: 境界H2の「直後の本文段落」（見出し自体は note 目次に出て free 本文にヒットし
    //   偽陽性になるため使わない）。目次に出ない実コンテンツが live 無料本文に出たら本物の漏洩。
    for (let i = bIdx + 1; i < lines.length; i++) {
      const t = norm(lines[i]);
      if (t.length >= 12 && !/^!\[|^#|note\.com/.test(lines[i].trim())) { paidProbe = t.slice(0, 30); break; }
    }
  }
  return { pricing, price, boundary, hasBoundary: bIdx >= 0, freeProbe, paidProbe, expectedFreeImgs };
}

const files = walk(ROOT).slice(0, LIMIT === Infinity ? undefined : LIMIT * 3);
const targets = [];
for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  const noteId = fm(raw, 'noteId') || (fm(raw, 'noteUrl') || '').match(/n[0-9a-f]{10,}/)?.[0];
  if (!noteId) continue; // 未公開
  targets.push({ f, raw, noteId, ...analyzeSource(raw) });
  if (targets.length >= LIMIT) break;
}

const findings = [];
let idx = 0;
async function worker() {
  while (idx < targets.length) {
    const t = targets[idx++];
    const { data, error } = await fetchNote(t.noteId);
    if (error || !data) { findings.push({ sev: 'INFO', code: 'FETCH_ERR', f: t.f, note: t.noteId, msg: error || 'no data' }); continue; }
    const liveBody = norm(data.body || '');
    const liveImgs = (String(data.body || '').match(/<img\b/g) || []).length;
    const liveTags = (data.hashtag_notes || []).length;
    const livePrice = data.price ?? 0;
    const rel = t.f.replace(`${ROOT}/`, '').replace(/\/article\.md$/, '');
    const push = (sev, code, msg) => findings.push({ sev, code, f: rel, note: t.noteId, msg });

    // 価格
    if (t.pricing === 'paid' && t.price && livePrice !== t.price) push('HIGH', 'PRICE_MISMATCH', `source¥${t.price} ≠ live¥${livePrice}`);
    // タグ
    if (liveTags < GOAL_TAGS) push('INFO', 'TAG_SHORT', `live tags=${liveTags}<${GOAL_TAGS}`);

    if (t.pricing === 'membership') { push('INFO', 'MEMBERSHIP', `bodyLen=${liveBody.length}`); continue; }
    if (t.pricing !== 'paid') { if (t.expectedFreeImgs) { /* free記事は全文=画像検査は既存toolに委譲 */ } continue; }
    if (!t.hasBoundary) { push('HIGH', 'RULE_GAP', `境界未解決(paidBoundary無し)`); continue; }

    // 境界検査
    const paidLeak = t.paidProbe && t.paidProbe.length >= 8 && liveBody.includes(t.paidProbe);
    const freeMissing = t.freeProbe && t.freeProbe.length >= 8 && !liveBody.includes(t.freeProbe);
    if (paidLeak) push('CRITICAL', 'PAYWALL_LEAK', `有料境界「${t.boundary}」直後が無料本文に露出（有料内容が無料で読める）`);
    else if (freeMissing && liveBody.length < 40) push('CRITICAL', 'FULL_LOCK', `無料プレビューがほぼ空（全ロック）bodyLen=${liveBody.length}`);
    else if (freeMissing) push('HIGH', 'BOUNDARY_SHIFT', `無料プローブがlive無料本文に無い（境界が想定より上/本文改稿）`);
    // 画像（境界前の期待枚数）
    if (!paidLeak && liveImgs < t.expectedFreeImgs) push('HIGH', 'IMG_MISSING', `live無料img=${liveImgs}<期待${t.expectedFreeImgs}（バナー等の欠落）`);
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));

// 集計・出力
const order = { CRITICAL: 0, HIGH: 1, INFO: 2 };
findings.sort((a, b) => order[a.sev] - order[b.sev] || a.code.localeCompare(b.code));
const byCode = {};
for (const x of findings) byCode[x.code] = (byCode[x.code] || 0) + 1;

if (JSON_OUT) { console.log(JSON.stringify({ checked: targets.length, findings, byCode }, null, 2)); process.exit(0); }

let out = `# note 構成監査レポート\n\n検査: ${targets.length} 本（published）\n\n`;
out += `## 症状別件数\n\n`;
for (const [c, n] of Object.entries(byCode).sort((a, b) => b[1] - a[1])) out += `- ${c}: ${n}\n`;
for (const sev of ['CRITICAL', 'HIGH', 'INFO']) {
  const g = findings.filter((x) => x.sev === sev);
  if (!g.length) continue;
  out += `\n## ${sev}（${g.length}）\n\n`;
  for (const x of g) out += `- [${x.code}] ${x.f}\n    ${x.msg}\n`;
}
writeFileSync('.tmp/note-structure-audit.md', out);
console.log(out.split('\n').slice(0, 60).join('\n'));
console.log(`\n... 全文: .tmp/note-structure-audit.md`);
const crit = findings.filter((x) => x.sev === 'CRITICAL').length;
const high = findings.filter((x) => x.sev === 'HIGH').length;
console.log(`\n[check-note-structure] CRITICAL=${crit} HIGH=${high} INFO=${findings.length - crit - high} / 検査${targets.length}本`);
