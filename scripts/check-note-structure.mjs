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
// 取得は curl 経路（2026-07-28 修正）: Node の fetch はプロキシ env を見ないため会社 PC では
//   全件遮断され、675/675 が FETCH_ERR でも exit 0 を返す＝**検査ゼロの偽 PASS** だった。
//   curl は HTTP(S)_PROXY を自動利用し --ssl-no-revoke で schannel の失効確認を回避する。
//   あわせて「取得できなかった＝検査が成立していない」を PASS にしないゲートを追加した。
//
// 使い方:
//   node scripts/check-note-structure.mjs            # レポート（.tmp/note-structure-audit.md にも保存）
//   node scripts/check-note-structure.mjs --json     # 機械可読
//   node scripts/check-note-structure.mjs --limit 20 # 先頭N本だけ（デバッグ）
//   node scripts/check-note-structure.mjs --ci       # 未許可 CRITICAL>0 で exit 1
// ※ 取得失敗率が MAX_FETCH_FAIL_RATE を超えたときは --ci の有無にかかわらず exit 1（検査不成立）。

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { MIN_FREE_PREVIEW_CHARS } from './lib/note-live-check.mjs';

const ROOT = 'docs/note';
const JSON_OUT = process.argv.includes('--json');
const CI = process.argv.includes('--ci'); // CRITICAL(allowlist除く)>0 で exit 1
const LIMIT = (() => { const i = process.argv.indexOf('--limit'); return i >= 0 ? Number(process.argv[i + 1]) : Infinity; })();
const GOAL_TAGS = 90;
// 取得失敗がこの割合を超えたら「検査不成立」として落とす（偽 PASS の封じ）。
const MAX_FETCH_FAIL_RATE = 0.2;
// note API は連続アクセスで弾かれる（2026-07-28: 215本を短時間に2周して148本が取得失敗）。
const THROTTLE_MS = 250;
// 既知の境界定義ズレ（偽陽性・判断待ち）は WAIVED として --ci ゲートを素通し。
const ALLOW = (() => {
  try { return new Set((JSON.parse(readFileSync('.claude/config/note-structure-allow.json', 'utf8')).waived) || []); }
  catch { return new Set(); }
})();

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

// Windows でも動く同期 sleep（Unix の `sleep` バイナリに依存しない）。
const sleep = (ms) => spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`]);

// curl 経路（verify-note-magazines.mjs の curlJson を踏襲）。プロキシ env は curl が自動利用。
function fetchNote(noteId, retries = 3) {
  let lastErr = 'unknown';
  for (let a = 0; a <= retries; a++) {
    const r = spawnSync('curl', [
      '-sS', '-m', '30', '--ssl-no-revoke',
      '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json',
      `https://note.com/api/v3/notes/${noteId}`,
    ], { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
    const body = (r.stdout || '').trim();
    if (body.startsWith('{')) {
      try { return { data: JSON.parse(body)?.data || null, error: null }; }
      catch (e) { lastErr = `parse: ${String(e.message || e)}`; }
    } else {
      lastErr = (r.stderr || '').trim().split('\n')[0] || `non-json (${body.slice(0, 40)})`;
    }
    if (a < retries) sleep(1200 * (a + 1)); // バックオフ（レート制限対策）
  }
  return { data: null, error: lastErr };
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
// curl は同期呼び出しのため逐次で回す（並列は note API のレート制限に当たる）。
function runAll() {
  let done = 0;
  for (const t of targets) {
    if (done++) sleep(THROTTLE_MS);
    if (!JSON_OUT && done % 50 === 0) process.stderr.write(`  ...${done}/${targets.length}\n`);
    const { data, error } = fetchNote(t.noteId);
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
    // 「全ロック(<40字)」までいかなくても、リード数行だけ残して境界が冒頭へ動く崩れ方がある。
    // 2026-07-31: note-update-body --keep-boundary で本文ブロックが増え、境界が記事冒頭へ移動して
    // 有料2本の無料プレビューが数百字まで縮んだ。bodyLen<40 の FULL_LOCK では拾えず、
    // BOUNDARY_SHIFT(HIGH) 止まりで CRITICAL に上がらないため、購入判断の材料が消えた事故を
    // 見逃す。無料プレビューの下限（MIN_FREE_PREVIEW_CHARS）を切ったら CRITICAL に上げる。
    else if (freeMissing && liveBody.length < MIN_FREE_PREVIEW_CHARS) push('CRITICAL', 'FREE_PREVIEW_COLLAPSE', `無料プレビューが${liveBody.length}字（下限${MIN_FREE_PREVIEW_CHARS}）＝有料境界が冒頭へ動いた疑い`);
    else if (freeMissing) push('HIGH', 'BOUNDARY_SHIFT', `無料プローブがlive無料本文に無い（境界が想定より上/本文改稿）`);
    // 画像（境界前の期待枚数）
    if (!paidLeak && liveImgs < t.expectedFreeImgs) push('HIGH', 'IMG_MISSING', `live無料img=${liveImgs}<期待${t.expectedFreeImgs}（バナー等の欠落）`);
  }
}
runAll();

// allowlist 適用: CRITICAL でも WAIVED なら --ci ゲートから除外（レポートには残す）
for (const x of findings) if (x.sev === 'CRITICAL' && ALLOW.has(x.f)) x.waived = true;

// 集計・出力
const order = { CRITICAL: 0, HIGH: 1, INFO: 2 };
findings.sort((a, b) => order[a.sev] - order[b.sev] || a.code.localeCompare(b.code));
const byCode = {};
for (const x of findings) byCode[x.code] = (byCode[x.code] || 0) + 1;

// 取得できた本数＝実際に検査が成立した本数。ここが痩せていれば結果は信用できない。
const fetchFail = byCode.FETCH_ERR || 0;
const inspected = targets.length - fetchFail;
const failRate = targets.length ? fetchFail / targets.length : 0;
const notConclusive = targets.length > 0 && failRate > MAX_FETCH_FAIL_RATE;

if (JSON_OUT) {
  console.log(JSON.stringify({ checked: targets.length, inspected, fetchFail, notConclusive, findings, byCode }, null, 2));
  process.exit(notConclusive ? 1 : 0);
}

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
const critAll = findings.filter((x) => x.sev === 'CRITICAL');
const critGate = critAll.filter((x) => !x.waived); // WAIVED を除いた実ゲート対象
const high = findings.filter((x) => x.sev === 'HIGH').length;
const waived = critAll.length - critGate.length;
console.log(`\n[check-note-structure] CRITICAL=${critAll.length}（うちWAIVED ${waived}・要対応 ${critGate.length}） HIGH=${high} / 実検査 ${inspected}本（対象${targets.length}・取得失敗${fetchFail}）`);

// 偽 PASS の封じ: 取得できていないなら「異常なし」ではなく「検査できていない」。--ci の有無を問わず落とす。
if (notConclusive) {
  console.error(`\n[check-note-structure] ✗ 検査不成立: ${targets.length}本中${fetchFail}本が取得失敗（${Math.round(failRate * 100)}% > 上限${Math.round(MAX_FETCH_FAIL_RATE * 100)}%）`);
  console.error('  live を取得できていないため CRITICAL 0 は「異常なし」を意味しない。');
  console.error('  確認: curl が使えるか／プロキシ env（HTTPS_PROXY）が設定されているか／note API のレート制限に当たっていないか。');
  console.error('  レート制限が疑われるときは時間を空けるか --limit で分割して回す。');
  process.exit(1);
}

if (CI) {
  if (critGate.length) {
    console.error(`\n[check-note-structure --ci] ✗ 未許可の CRITICAL ${critGate.length} 件:`);
    for (const x of critGate) console.error(`     [${x.code}] ${x.f}`);
    process.exit(1);
  }
  console.log(`[check-note-structure --ci] ✓ 未許可 CRITICAL 0（WAIVED ${waived} は allowlist）`);
}
