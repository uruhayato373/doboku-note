#!/usr/bin/env node
/**
 * note-backfill-title-price.mjs — 公開中の note 記事の題名・価格を frontmatter（正本）へ書き戻す
 * ---------------------------------------------------------------------------
 * 題名・価格の正本は原稿の frontmatter（title / price）。公開後に書き戻していなかった記事は
 * title が無く（台帳はフォルダ名や見出し 1 を推測で出していた）、有料なのに price が無い記事もあった
 * （2026-10-01 実測: 公開済み 801 本に title が無い）。公開中の note を正として、欠けている欄だけを埋める。
 *
 * - 欠けている title / price だけを挿入する。既にある値は書き換えない（食い違いは報告だけ＝どちらが正しいかは人が決める）
 * - 書き戻した記事は、追加前の価格・境界が live と同期済みだった（再公開台帳の meta ハッシュが一致）ときだけ
 *   新しい meta ハッシュで記録し直す（title を meta に足したので、記録し直さないと全記事が「反映待ち」になる）
 * - live の取得は note 公開 API（curl --ssl-no-revoke・認証不要）。取得失敗が 20% を超えたら検査不成立で exit 1
 *
 * 使い方:
 *   node scripts/note-backfill-title-price.mjs              # dry-run（書き戻す予定と食い違いを表示）
 *   node scripts/note-backfill-title-price.mjs --commit     # 書き戻す
 *   node scripts/note-backfill-title-price.mjs --filter 2級土木 --json
 * ---------------------------------------------------------------------------
 */
import { readFileSync, readdirSync, writeFileSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { LIVE_META_KEYS, metaHash, loadState, saveState } from './lib/note-republish-hash.mjs';
import { todayJst } from './lib/jst-date.mjs';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const JSON_OUT = args.includes('--json');
const FILTER = args.includes('--filter') ? args[args.indexOf('--filter') + 1] : null;
const ROOT = 'content/note';
const THROTTLE_MS = 250;
const MAX_FETCH_FAIL_RATE = 0.2;
const KEYS_BEFORE_TITLE = LIVE_META_KEYS.filter((k) => k !== 'title');

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name).replaceAll('\\', '/');
    if (e.isDirectory()) walk(p, acc);
    else if (/^article(-[^/\\]+)?\.md$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const sleep = (ms) => spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`]);
function fetchNote(id) {
  let last = 'unknown';
  for (let a = 0; a < 4; a++) {
    const r = spawnSync('curl', ['-sS', '-m', '30', '--ssl-no-revoke', '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json', `https://note.com/api/v3/notes/${id}`], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
    const b = (r.stdout || '').trim();
    if (b.startsWith('{')) {
      try { const d = JSON.parse(b).data; if (d) return { data: d }; last = 'data なし'; } catch (e) { last = `parse: ${e.message}`; }
    } else last = (r.stderr || '').trim().split('\n')[0] || `non-json (${b.slice(0, 40)})`;
    sleep(1200 * (a + 1));
  }
  return { error: last };
}

const fmBlock = (src) => src.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? null;
// note-publish / note-update-body の fmField と同じ読み方（引用符の中をそのまま読む）
const fmField = (fm, k) => (fm.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) || '';
const quote = (s) => (s.includes('"') ? `'${s.replace(/'/g, "''")}'` : `"${s}"`);

/** frontmatter に行を足す（noteId → noteUrl → 末尾の順に、その直後へ）。改行コードは元に合わせる */
function insertFields(raw, lines) {
  const eol = /\r\n/.test(raw) ? '\r\n' : '\n';
  let src = raw.replace(/\r\n?/g, '\n');
  const fm = fmBlock(src);
  const add = lines.join('\n');
  let out = null;
  for (const anchor of ['noteId', 'noteUrl']) {
    const re = new RegExp(`^(${anchor}:.*)$`, 'm');
    if (re.test(fm)) { out = src.replace(`---\n${fm}\n---`, `---\n${fm.replace(re, `$1\n${add}`)}\n---`); break; }
  }
  out ??= src.replace(`---\n${fm}\n---`, `---\n${fm}\n${add}\n---`);
  return eol === '\r\n' ? out.replace(/\n/g, '\r\n') : out;
}

const targets = [];
for (const f of walk(ROOT)) {
  if (FILTER && !f.includes(FILTER)) continue;
  const raw = readFileSync(f, 'utf8');
  const fm = fmBlock(raw.replace(/\r\n?/g, '\n'));
  if (!fm) continue;
  const id = fmField(fm, 'noteId') || fmField(fm, 'noteUrl').match(/n[0-9a-f]{10,}/)?.[0];
  if (!id) continue; // 未公開
  targets.push({ f, raw, fm, id });
}

const st = loadState();
const result = { checked: targets.length, fetchFail: 0, wrote: [], rebaselined: 0, keptDrift: 0, titleConflict: [], priceConflict: [], h1Differs: [] };
targets.forEach((t, i) => {
  if (i) sleep(THROTTLE_MS);
  if (!JSON_OUT && i && i % 100 === 0) process.stderr.write(`  ...${i}/${targets.length}\n`);
  const { data, error } = fetchNote(t.id);
  if (!data) { result.fetchFail++; if (!JSON_OUT) console.error(`  取得失敗 ${t.f}: ${error}`); return; }
  const liveName = String(data.name ?? '').trim();
  const livePrice = Number(data.price ?? 0);
  const paid = fmField(t.fm, 'notePricing') === 'paid';
  const curTitle = fmField(t.fm, 'title');
  const curPrice = Number(fmField(t.fm, 'price')) || 0;
  const h1 = t.raw.match(/^#\s+(.+?)\s*$/m)?.[1] ?? null;

  if (curTitle && curTitle !== liveName) result.titleConflict.push({ f: t.f, source: curTitle, live: liveName });
  if (paid && curPrice && curPrice !== livePrice) result.priceConflict.push({ f: t.f, source: curPrice, live: livePrice });
  if (h1 && liveName && h1 !== liveName) result.h1Differs.push({ f: t.f, h1, live: liveName });

  const add = [];
  if (!curTitle && liveName) add.push(`title: ${quote(liveName)}`);
  if (paid && !curPrice && livePrice > 0) add.push(`price: ${livePrice}`);
  if (!add.length) return;
  result.wrote.push({ f: t.f, add });
  if (!COMMIT) return;

  const next = insertFields(t.raw, add);
  // 追加前に meta が live と同期済み（記録が旧キーのハッシュと一致）で、足す値も live と同じなら記録し直す
  const rec = st.metaHashes?.[t.f];
  const inSync = rec !== undefined && rec === metaHash(t.raw, KEYS_BEFORE_TITLE);
  const titleOk = (curTitle || liveName) === liveName;
  const priceOk = !paid || (curPrice || livePrice) === livePrice;
  writeFileSync(t.f, next);
  if (inSync && titleOk && priceOk) { st.metaHashes[t.f] = metaHash(next); result.rebaselined++; } else result.keptDrift++;
});

// 既に title があった記事も、足す前に同期済みで live と一致していれば新しいキーで記録し直す（足しただけで反映待ちにしない）
if (COMMIT) {
  for (const t of targets) {
    if (result.wrote.some((w) => w.f === t.f)) continue;
    const rec = st.metaHashes?.[t.f];
    if (rec === undefined || rec !== metaHash(t.raw, KEYS_BEFORE_TITLE)) continue;
    if (result.titleConflict.some((c) => c.f === t.f) || result.priceConflict.some((c) => c.f === t.f)) continue;
    if (!fmField(t.fm, 'title')) continue;
    st.metaHashes[t.f] = metaHash(t.raw);
    result.rebaselined++;
  }
  st.updatedAt = todayJst();
  saveState(st);
}

const inspected = result.checked - result.fetchFail;
const notConclusive = result.checked > 0 && result.fetchFail / result.checked > MAX_FETCH_FAIL_RATE;
if (JSON_OUT) {
  writeSync(1, JSON.stringify({ ...result, inspected, notConclusive }, null, 2) + '\n');
} else {
  const show = (label, list, fmt) => {
    console.log(`\n${label}: ${list.length} 本`);
    for (const x of list.slice(0, 30)) console.log(`  - ${fmt(x)}`);
    if (list.length > 30) console.log(`  …ほか ${list.length - 30} 本（--json で全件）`);
  };
  show(COMMIT ? '書き戻した' : '書き戻す予定', result.wrote, (x) => `${x.f}  ${x.add.join(' / ')}`);
  show('題名の食い違い（原稿の title ≠ note。書き換えていない）', result.titleConflict, (x) => `${x.f}\n      原稿「${x.source}」 note「${x.live}」`);
  show('価格の食い違い（原稿の price ≠ note。書き換えていない）', result.priceConflict, (x) => `${x.f}  原稿¥${x.source} note¥${x.live}`);
  console.log(`\n参考: 見出し 1 が note の題名と違う ${result.h1Differs.length} 本（題名の正本は title。見出し 1 は本文に載らない）`);
  console.log(`\n[note-backfill-title-price] 公開済み ${result.checked} 本 / 実検査 ${inspected} 本（取得失敗 ${result.fetchFail}）/ ${COMMIT ? '書き戻し' : '書き戻す予定'} ${result.wrote.length} 本${COMMIT ? `・meta 記録し直し ${result.rebaselined} 本・反映待ちのまま ${result.keptDrift} 本` : '（dry-run・--commit で書き戻す）'}`);
}
if (notConclusive) {
  console.error(`[note-backfill-title-price] ✗ 検査不成立: 取得失敗 ${result.fetchFail}/${result.checked} 本（上限 ${MAX_FETCH_FAIL_RATE * 100}%）`);
  process.exit(1);
}
