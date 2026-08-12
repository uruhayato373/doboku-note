#!/usr/bin/env node
// note 導線（ファネル）ドリフト監査。read-only。
//
// 検出するドリフト（資格別・L2 構築済みの資格のみ）:
//   D1 公開済み記事（noteUrl 有）に L3 CTA マーカーが欠落（ソース）
//   D2 公開済みマガジン（その資格）が L2 もくじ記事に未収録
//   D3 L2 もくじが L1 サイトマップから未リンク
//   D4 L2 もくじ本文の bottomCta URL が config の L2 noteId と不一致
//   D5 公開記事の CTA が「ライブ note に未反映」（--live のみ。ソースは正でも再投稿もれ＝今回の事故）
//   D6 topCtaExcludeDirs 対象の記事に冒頭パック CTA マーカーが残存（除外宣言と実体のドリフト＝トピック不一致CTAの再混入）
//
// 真実源: .claude/config/note-funnel.json / src/lib/note-magazines.ts / .claude/knowledge/reference/note-funnel-architecture.md
//
// 使い方:
//   node scripts/audit-note-funnel.mjs          # ソース監査レポート（exit 0）
//   node scripts/audit-note-funnel.mjs --ci      # ソースドリフトで exit 1（CI ゲート・高速）
//   node scripts/audit-note-funnel.mjs --live    # ＋ライブ反映(D5)を note API で検証
//   node scripts/audit-note-funnel.mjs --live --ci # D5/取得失敗率を含む CI ゲート

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CI = process.argv.includes('--ci');
// --live: 公開記事の CTA が「ライブ note に反映済みか」を note 公開 API(body+embedded)で機械検証する（D5）。
// ソースのマーカー(D1)はあってもライブ未反映＝再投稿もれ、を検出する（2026-06-18 に総監19本で実害化）。
// 実証済みの curl --ssl-no-revoke を shell-out（会社PCプロキシ・CI 双方で疎通）。
const LIVE = process.argv.includes('--live');
const MAX_LIVE_FETCH_FAIL_RATE = 0.2;
// note 公開記事 API を取得し body+embedded_contents の結合文字列を返す（取得不能は null）。
function fetchLiveBlob(noteId) {
  try {
    const out = execFileSync('curl', [
      '-s',
      '--ssl-no-revoke',
      '--max-time', '25',
      '-H', 'User-Agent: Mozilla/5.0',
      '-H', 'Accept: application/json',
      `https://note.com/api/v3/notes/${noteId}`,
    ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    const d = JSON.parse(out); const data = d.data || d;
    return JSON.stringify(data.body || '') + JSON.stringify(data.embedded_contents || []);
  } catch { return null; }
}
const CONFIG = JSON.parse(readFileSync(join(ROOT, '.claude/config/note-funnel.json'), 'utf8'));
const magSrc = readFileSync(join(ROOT, 'src/lib/note-magazines.ts'), 'utf8');

// note-magazines.ts から公開済みマガジン {id, noteId} を抽出
function publishedMagazines() {
  const out = [];
  const re = /\{[\s\S]*?id:\s*'([^']+)'[\s\S]*?published:\s*(true|false)[\s\S]*?noteUrl:\s*'([^']*)'[\s\S]*?\}/g;
  let m;
  while ((m = re.exec(magSrc))) {
    const [, id, published, noteUrl] = m;
    if (published === 'true' && noteUrl) {
      const noteId = (noteUrl.match(/\/m\/([a-z0-9]+)/) || [])[1] || '';
      out.push({ id, noteId, noteUrl });
    }
  }
  return out;
}
const MAGS = publishedMagazines();

// 値キャプチャは水平空白のみ（[ \t]）で囲む。\s だと改行を食い、空フィールド（例 `noteUrl:` 空）が
// 次行の値を拾って bleed する（未公開記事が D1/D5 をすり抜ける既存バグの修正）。
const fm = (raw, k) => { const m = raw.match(new RegExp('^' + k + ':[ \\t]*(?:"(.*?)"|\'(.*?)\'|(.+?))[ \\t]*$', 'm')); return m ? (m[1] ?? m[2] ?? m[3] ?? '').trim() : ''; };

// 冒頭パック(pack-top)は経験記述/記述式の「答案パック」を推す CTA。記事名・H1 にこれらの語が
// 無いのに pack-top が付く＝トピック不一致の疑い。機械は relevance を断定せず surface のみ行い、
// 最終判定は note-funnel-auditor（Evaluator）に委ねる（2026-07-19 追加。受験資格・一次段階の記事に
// 経験記述バンク CTA が唐突に出ていた再発防止）。
const ESSAY_SIGNALS = ['経験記述', '施工経験', '記述式', '記述', '答案', '想定工事', '5管理', '二次', '設問', 'テーマ', '工事概要', '論文', '論述', '論点', '解答', '模範', '科目', '書き分け'];

const drifts = [];
const info = [];
const liveWarn = [];
const reviewCandidates = [];
let liveChecked = 0;

// L1 本文（D3 用）
const L1file = join(ROOT, CONFIG.L1.articleDir, 'article.md');
const L1body = existsSync(L1file) ? readFileSync(L1file, 'utf8') : '';

for (const [key, ex] of Object.entries(CONFIG.exams)) {
  if (!ex.L2.noteId) { info.push(`[${key}] L2 もくじ未構築（スキップ）`); continue; }

  // D3: L1 が L2 をリンクしているか
  if (L1body && !L1body.includes(ex.L2.noteId)) {
    drifts.push(`D3 [${key}] L2「${ex.L2.title}」(${ex.L2.noteId}) が L1 サイトマップから未リンク`);
  }

  // L2 もくじ本文
  const L2file = join(ROOT, ex.L2.articleDir, 'article.md');
  const L2body = existsSync(L2file) ? readFileSync(L2file, 'utf8') : '';

  // D4: L2 の bottomCta URL 整合（config 内）
  if (ex.bottomCta.text && !ex.bottomCta.text.includes(ex.L2.noteId)) {
    drifts.push(`D4 [${key}] config bottomCta が L2 noteId(${ex.L2.noteId}) を含まない`);
  }

  // D1: 公開済み記事の CTA 欠落（magazines/ と excludeDirs・もくじ自身を除外し再帰探索）
  const baseDir = join(ROOT, ex.articleGlob);
  const exclude = new Set(ex.excludeDirs || []);
  const collect = (dir) => {
    const out = [];
    if (!existsSync(dir)) return out;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name === 'magazines' || exclude.has(e.name)) continue;
        out.push(...collect(join(dir, e.name)));
      } else if (e.name === 'article.md') out.push(dir);
    }
    return out;
  };
  // ライブ反映検証(D5)用ターゲット: 冒頭=topCta 本文の先頭マガジン(コアパック等)/ 末尾=L2 もくじ noteId
  // topCtaOverrides（例: 2級土木/ → 2級バンク）は記事ごとに先頭ターゲットを差し替える。
  const topTargetsOf = (name) => {
    const ovr = (ex.topCtaOverrides || []).find(o => name.startsWith(o.dirPrefix));
    const text = ovr ? ovr.text : ex.topCta.text;
    return text ? [...text.matchAll(/\/[mn]\/([a-z0-9]+)/g)].map((m) => m[1]) : [];
  };
  const bottomTarget = ex.L2.noteId || '';

  for (const adir of collect(baseDir)) {
    const f = join(adir, 'article.md');
    const raw = readFileSync(f, 'utf8');
    const url = fm(raw, 'noteUrl');
    if (!url || url === 'TBD') continue; // 未公開は対象外
    // Windows のパス区切り(\)を / に正規化。config の topCtaOverrides.dirPrefix /
    // topCtaExcludeDirs は前方スラッシュ前提のため、正規化しないと Windows で
    // 2級土木/ override が不発→誤ドリフト（1級完全パックを期待）になる。
    const name = (adir.slice(baseDir.length + 1) || adir).replaceAll('\\', '/');
    // ナビ/入口記事は冒頭パック CTA を意図的に付けない（topCtaExcludeDirs）
    const topExcluded = (ex.topCtaExcludeDirs || []).some(x => name === x || name.endsWith('/' + x));
    const miss = [];
    if (ex.topCta.text && !topExcluded && !raw.includes(ex.topCta.marker)) miss.push('冒頭');
    if (ex.bottomCta.text && !raw.includes(ex.bottomCta.marker)) miss.push('末尾');
    if (miss.length) drifts.push(`D1 [${key}] 公開記事「${name}」に ${miss.join('・')} CTA 欠落`);

    // マーカーは HTML コメント全体で厳密一致させる（bare `cta:pack-top` の部分文字列一致だと
    // 別マーカー `cta:pack-top-light`〔ロードマップの軽量CTA〕を誤検出するため。2026-07-19）。
    const topMarkerTag = '<!-- ' + ex.topCta.marker + ' -->';
    // D6: 除外対象(topCtaExcludeDirs)なのに冒頭パック CTA が残存（除外宣言と実体のドリフト）
    if (ex.topCta.text && topExcluded && raw.includes(topMarkerTag)) {
      drifts.push(`D6 [${key}] 除外対象記事「${name}」に冒頭パック CTA が残存（topCtaExcludeDirs 指定＝ブロック除去が必要）`);
    }
    // surfacer（非ゲート）: 冒頭パック CTA を持つが記事名・H1 に記述系シグナル語が無い＝トピック不一致の疑い
    if (ex.topCta.text && !topExcluded && raw.includes(topMarkerTag)) {
      const h1 = (raw.match(/^#\s+(.+)$/m) || [])[1] || '';
      if (!ESSAY_SIGNALS.some(s => (name + ' ' + h1).includes(s))) {
        reviewCandidates.push(`[${key}] 「${name}」冒頭パック CTA あり・記述系シグナル語なし（→ note-funnel-auditor で要判定）`);
      }
    }

    // D5: ソースの CTA がライブ note に反映されているか（再投稿もれ検出）
    if (LIVE) {
      const noteId = fm(raw, 'noteId') || (url.match(/\/n\/([a-z0-9]+)/) || [])[1] || '';
      if (noteId && noteId !== 'TBD') {
        const blob = fetchLiveBlob(noteId);
        liveChecked++;
        if (blob === null) {
          liveWarn.push(`[${key}] 「${name}」live 取得失敗（noteId=${noteId}）`);
        } else {
          const lmiss = [];
          const topTargets = topTargetsOf(name);
          if (ex.topCta.text && !topExcluded && topTargets[0] && !blob.includes(topTargets[0])) lmiss.push('冒頭パック(コアパック)');
          if (bottomTarget && !blob.includes(bottomTarget)) lmiss.push('末尾もくじ');
          if (lmiss.length) drifts.push(`D5 [${key}] 公開記事「${name}」の ${lmiss.join('・')} CTA がライブ未反映（ソースは正・要 note-append-cta / publish-note --update）`);
        }
      }
    }
  }

  // D2: 公開済みマガジンが L2 もくじに未収録
  // パターンは既定で部分一致だが、先頭 `^` で前方一致にできる。部分一致だけだと資格を跨いで
  // 誤マッチする（2026-07-31: tankan の "essay-" にコンクリート診断士 `cd-essay-magazine` と
  // 主任技士 `cce-essay-magazine` が当たり、「総監もくじに未収録」という資格セグメント違反の
  // ドリフトを出していた）。concrete 系は非 HUB 資格で L2 もくじを持たないため対象外が正しい。
  const matchId = (id, s) => (s.startsWith('^') ? id.startsWith(s.slice(1)) : id.includes(s));
  const examMags = MAGS.filter(mg => (ex.magazineExamMatch || []).some(s => matchId(mg.id, s)));
  for (const mg of examMags) {
    if (mg.noteId && L2body && !L2body.includes(mg.noteId)) {
      drifts.push(`D2 [${key}] 公開マガジン ${mg.id}(${mg.noteId}) が L2「${ex.L2.title}」に未収録`);
    }
  }
}

console.log('=== note 導線ドリフト監査 ' + (LIVE ? '(ソース + ライブ反映 D5)' : '(ソースのみ)') + ' ===');
for (const i of info) console.log('  info: ' + i);
if (LIVE) console.log(`  live: 公開記事 ${liveChecked} 本のライブCTA反映を検証` + (liveWarn.length ? `（取得失敗 ${liveWarn.length} 本）` : ''));
for (const w of liveWarn) console.log('  warn: ' + w);
if (!LIVE) console.log('  hint: ライブ反映の検証は `npm run audit-note-funnel -- --live`（ソースOKでもライブ未反映=再投稿もれを検出）');
if (reviewCandidates.length) {
  console.log(`\n  review候補（冒頭パック CTA のトピック不一致の疑い・非ゲート／${reviewCandidates.length}件）:`);
  for (const r of reviewCandidates) console.log('    ? ' + r);
  console.log('    → 不一致なら該当 dir を config の topCtaExcludeDirs に追加＋<!-- cta:pack-top --> ブロックを除去（判定は note-funnel-auditor）');
}

const liveFetchFailRate = liveChecked ? liveWarn.length / liveChecked : 1;
const liveNotConclusive = LIVE && (liveChecked === 0 || liveFetchFailRate > MAX_LIVE_FETCH_FAIL_RATE);
if (liveNotConclusive) {
  console.error(
    `\n[audit-note-funnel] ✗ ライブ検査不成立: 対象 ${liveChecked} 本中 ${liveWarn.length} 本が取得失敗` +
    `（${Math.round(liveFetchFailRate * 100)}%・上限 ${Math.round(MAX_LIVE_FETCH_FAIL_RATE * 100)}%）`,
  );
}

if (drifts.length === 0 && !liveNotConclusive) {
  console.log(`[audit-note-funnel] ✓ ドリフトなし（公開記事 CTA / マガジン収録 / L1-L2 リンク${LIVE ? ' / ライブ反映' : ''} 整合）`);
  process.exit(0);
}
if (drifts.length) {
  console.log(`\n[audit-note-funnel] ✗ ドリフト ${drifts.length} 件:`);
  for (const d of drifts) console.log('  - ' + d);
  console.log('\n修復: D1-D4=npm run wire-note-funnel-cta -- --exam <key> --apply / L2 もくじへ追記 / L1 へ L2 リンク追記');
  console.log('      D5(ライブ未反映)=npm run note-append-cta（公開済み記事へCTA反映）/ publish-note --update');
  console.log('      D6(除外もれ)=除外対象記事から <!-- cta:pack-top --> ブロックを手動除去（config の topCtaExcludeDirs と実体を一致させる）');
}
process.exit(CI && (drifts.length > 0 || liveNotConclusive) ? 1 : 0);
