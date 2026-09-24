/**
 * note-live-check.mjs — note 公開本文の「live 整合性」検査の共有実装
 *
 * note public API（/api/v3/notes/{id}）で本文 HTML を取得し、3 種の破損を検出する:
 *   (1) URL 見出し   — <h1-6> 内に http(s) URL（cardify グリッチ・note ネイティブ目次に URL 露出）
 *   (2) 空引用       — <blockquote> が中身空（複数行 blockquote が paste で脱落した痕跡）
 *   (3) 画像欠落     — 本文 <img> 数 < SoT 期待枚数（本文画像が除去されて live に載らない）
 * assertLiveBody（公開直後の 1 本ごとの検査）はさらに、画像過多（重複）・太字記号の残り・
 * 存在しないサイト内リンクも見る（2026-09-24 追加）。
 *
 * 各スクリプトの公開後 assert（note-update-body [5e] / note-publish [13]）と横断スイープ
 * （check-note-live-headings.mjs）の双方から使う。ネットワーク失敗は fetchError で区別し
 * 偽陰性でジョブを落とさない。真実源: .claude/knowledge/reference/note-api-verification.md
 *
 * 取得は curl 経路（2026-07-28 修正）: Node の fetch は HTTP(S)_PROXY を見ないため会社 PC では
 *   **全件失敗し、公開後 assert が一度も機能していなかった**（note-update-body 実行時に
 *   「[5e] API検証がネットワークで未達」が毎回出ていた）。curl はプロキシ env を自動利用し
 *   --ssl-no-revoke で schannel の失効確認エラーを回避する。
 *   なお「fetchError では落とさない」のは publish/update 側の話（公開自体は成功しているため）。
 *   横断スイープ側は取得失敗が支配的なら落とすこと＝検査ゼロを PASS と呼ばないため。
 */
import { spawnSync } from 'node:child_process';
import { classifySitePath, loadSiteRoutes, siteLinkRegex } from './site-links.mjs';

// Windows でも動く同期 sleep（Unix の `sleep` バイナリに依存しない）。
const sleepSync = (ms) => spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`]);

/**
 * 未ログインの public API では中身を読めない記事か（メンバーシップ限定等）。
 *
 * 2026-07-30: この判定が無いために「読めない」を「欠落」と誤診していた。メンバーシップ記事3本
 * （n9cf7e60661fa / ned33a34bc42f / n6b66793ca20c）は public API が body='' + hashtag_notes=[]
 * + price=0 を返すため、check-note-live-tags は「タグ0」、check-note-live-headings は
 * 「画像欠落 live=0/sot=2」と報告していた。著者ログインで実測すると **タグ99/98/98・画像2/2**
 * で全て充足済み。存在しない不足を追う phantom タスクと、成功した書き込みの偽 FAIL を生んでいた
 * （note-sync-tags の「試し読みフローでタグ入力が破棄される」という 2026-07-23 の結論も、
 * 同じアーティファクトによる誤診だった）。
 *
 * 判別: body 空 かつ hashtag_notes 空 かつ status=published。有料記事は無料プレビューと
 * タグを返すので該当しない。無料プレビュー0字（FULL_LOCK）の有料記事も hashtag_notes は
 * 返るため誤判定しない。この状態は「不足」ではなく **計測不能** として扱い、実体確認は
 * 著者ログイン経路（Playwright）に委ねる。CLAUDE.md §9 の裏返し＝取得できないものを FAIL と呼ばない。
 */
export function isUnmeasurable(data) {
  const d = data || {};
  return d.status === 'published' && !(d.body || '') && !(d.hashtag_notes || []).length;
}

/**
 * public API の data をそのまま取る（curl 経路・リトライ付き）。取れなければ { data: null, error }。
 * 生の項目（remained_file_num・eyecatch など）が要る検査は check-note-public-view が使う。
 */
export async function fetchNoteData(noteId, { retries = 2, delayMs = 3000 } = {}) {
  let lastErr = 'unknown';
  for (let i = 0; i <= retries; i++) {
    const r = spawnSync('curl', [
      '-sS', '-m', '30', '--ssl-no-revoke',
      '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json',
      `https://note.com/api/v3/notes/${noteId}`,
    ], { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
    const out = (r.stdout || '').trim();
    if (out.startsWith('{')) {
      try { return { data: JSON.parse(out)?.data || {}, error: null }; } catch (e) { lastErr = `parse: ${String(e.message || e)}`; }
    } else {
      lastErr = (r.stderr || '').trim().split('\n')[0] || `non-json (${out.slice(0, 40)})`;
    }
    if (i < retries) sleepSync(delayMs);
  }
  return { data: null, error: String(lastErr) };
}

/** 取れなければ null（呼び出し側で取得失敗として数える）。 */
export async function fetchNoteRaw(noteId, opts) {
  return (await fetchNoteData(noteId, opts)).data;
}

/** public API の生データを取得（body/hashtags/price/status と計測可否）。 */
export async function fetchNoteMeta(noteId, opts = {}) {
  const { data: d, error } = await fetchNoteData(noteId, opts);
  if (!d) return { body: '', hashtags: 0, price: null, status: null, isLimited: null, unmeasurable: false, error };
  return {
    body: d.body || '', hashtags: (d.hashtag_notes || []).length,
    price: d.price ?? null, status: d.status ?? null,
    // メンバーシップ限定の直接シグナル（2026-08-06 実測・n66570efb6d23）。
    // isUnmeasurable の「body 空＋タグ空」という間接推定より確かなので、
    // 会員限定かどうかの判定はこちらを優先する。API が返さない場合は null。
    isLimited: typeof d.is_limited === 'boolean' ? d.is_limited : null,
    unmeasurable: isUnmeasurable(d), error: null,
  };
}

export async function fetchNoteBody(noteId, opts = {}) {
  const m = await fetchNoteMeta(noteId, opts);
  return { body: m.body, error: m.error, unmeasurable: m.unmeasurable, isLimited: m.isLimited };
}

/** <h1-6> 内に URL を含む見出しのテキスト一覧。 */
export function findUrlHeadings(html) {
  const bad = [];
  for (const m of html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)) {
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (/https?:\/\//.test(text)) bad.push(`h${m[1]}: ${text.slice(0, 70)}`);
  }
  return bad;
}

/** 中身が空の <blockquote> の数（タグ除去後 trim が空）。 */
export function countEmptyBlockquotes(html) {
  let n = 0;
  for (const m of html.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g)) {
    if (!m[1].replace(/<[^>]+>/g, '').trim()) n++;
  }
  return n;
}

/** 本文 <img> タグ数（リンクカード <figure> は img を含まないので誤算しない）。 */
export function countImgs(html) {
  return (html.match(/<img\b/g) || []).length;
}

/**
 * 有料記事の「無料プレビューが生きているか」の下限。
 * note の公開 API は非購入者に配信される本文（＝無料プレビュー）しか返さないので、
 * body の長さがそのまま無料プレビュー量になる。有料境界が事故で記事冒頭へ動くと
 * ここが数百字まで落ちる（2026-07-31: note-update-body --keep-boundary で本文ブロックが
 * 増えた結果、境界が冒頭へ移動し、有料2本が無料プレビューほぼ0字で公開された）。
 * リード＋見出し数本で 800 字前後にはなるので、それを大きく下回ったら事故を疑う。
 */
export const MIN_FREE_PREVIEW_CHARS = 600;

/**
 * ローカル Markdown の有料境界より前にある本文量から、公開 API 検証の下限を決める。
 *
 * 固定600字だけでは、工事別テンプレートのように「工事概要の直後から有料」にする
 * 正常な短いプレビューを破損扱いする。反対に下限を一律で下げると、本当に境界が
 * 冒頭へ移動した事故を見逃す。このため、期待する無料部分の50%（最低120字、上限600字）
 * を記事別の下限にする。
 */
export function expectedFreePreviewMin(markdown, boundaryPattern, cap = MIN_FREE_PREVIEW_CHARS) {
  const lines = (markdown || '').split(/\r?\n/);
  let re;
  try { re = new RegExp('^##\\s+(' + boundaryPattern + ')'); } catch { return cap; }
  const idx = lines.findIndex((line) => re.test(line.trim()));
  if (idx < 0) return cap;
  const free = lines.slice(0, idx).join('\n')
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#>*_`~\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return Math.min(cap, Math.max(120, Math.floor(free.length * 0.5)));
}

/** HTML タグを落とした可読文字数（無料プレビュー量の目安）。 */
export function textLen(html) {
  return (html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length;
}

/**
 * 公開後の実体検証。expectedImgs を渡すと画像の欠落と過多（重複）も判定する（null/undefined なら画像検査 skip）。
 * paid=true を渡すと **無料プレビューの崩壊**（有料境界が冒頭へ動く事故）も検査する。
 * 太字記号の残り（`**`）と存在しないサイト内リンクは常に見る（2026-09-24: 週次スイープだけが見ていて、
 * 公開直後の 1 本ごとの検査では素通りだった）。
 * @returns {Promise<{ok:boolean, urlHeadings:string[], emptyBq:number, imgLive:number, imgShort:boolean, imgExcess:boolean, literalStars:string[], brokenLinks:string[], freeChars:number, freeShort:boolean, fetchError:string|null}>}
 */
export async function assertLiveBody(noteId, { expectedImgs = null, paid = false, minFreeChars = MIN_FREE_PREVIEW_CHARS } = {}) {
  const base = { urlHeadings: [], emptyBq: 0, imgLive: 0, imgShort: false, imgExcess: false, literalStars: [], brokenLinks: [], freeChars: 0, freeShort: false };
  const { body, error, unmeasurable, isLimited } = await fetchNoteBody(noteId);
  if (error) return { ok: false, ...base, unmeasurable: false, isLimited: null, fetchError: error };
  // 未ログインで中身が返らない記事は「破損なし」でも「破損あり」でもなく計測不能。
  // ここで imgShort を立てると存在する画像を欠落と誤診する（2026-07-30・isUnmeasurable 参照）。
  if (unmeasurable) return { ok: true, ...base, unmeasurable: true, isLimited, fetchError: null };
  const urlHeadings = findUrlHeadings(body);
  const emptyBq = countEmptyBlockquotes(body);
  const imgLive = countImgs(body);
  const imgShort = expectedImgs != null && imgLive < expectedImgs;
  // 同じ画像行の重複は 2 枚目が live に残る（2026-09-23 に重複 26 本を原稿側で直した）
  const imgExcess = expectedImgs != null && imgLive > expectedImgs;
  const literalStars = findLiteralStars(body);
  const brokenLinks = findBrokenSiteLinks(body);
  const freeChars = textLen(body);
  // 有料記事のときだけ見る。無料記事は body 全文が返るので短くても事故ではない。
  const freeShort = paid && freeChars < minFreeChars;
  const ok = urlHeadings.length === 0 && emptyBq === 0 && !imgShort && !imgExcess
    && literalStars.length === 0 && brokenLinks.length === 0 && !freeShort;
  return { ok, urlHeadings, emptyBq, imgLive, imgShort, imgExcess, literalStars, brokenLinks, freeChars, freeShort, unmeasurable: false, isLimited, fetchError: null };
}

/** assertLiveBody の不整合を 1 行に整形する（note-update-body [5e]・note-publish [13] が共用）。 */
export function formatLiveIssues(chk, expectedImgs = null) {
  const exp = expectedImgs == null ? '' : `/期待=${expectedImgs}`;
  const parts = [];
  if (chk.urlHeadings.length) parts.push(`URL見出し[${chk.urlHeadings.join(' / ')}]`);
  if (chk.emptyBq) parts.push(`空引用${chk.emptyBq}件`);
  if (chk.imgShort) parts.push(`画像欠落(live=${chk.imgLive}${exp})`);
  if (chk.imgExcess) parts.push(`画像過多(live=${chk.imgLive}${exp}＝重複の疑い)`);
  if (chk.literalStars?.length) parts.push(`太字記号${chk.literalStars.length}件[${chk.literalStars.slice(0, 2).join(' / ')}]`);
  if (chk.brokenLinks?.length) parts.push(`存在しないサイトリンク[${chk.brokenLinks.join(' / ')}]`);
  if (chk.freeShort) parts.push(`無料プレビュー崩壊(${chk.freeChars}字＝有料境界が冒頭へ動いた疑い)`);
  return parts.join(' / ') || 'なし';
}

// ---- 見出し構造の食い違い（2026-09-23 追加） ----
// 冒頭 CTA の部分更新が CTA 文を <h2> にし、直後の見出しを「R」＋カード＋残りの段落に割った
// 記事が 2 本あった（R8予想問題・総監択一式17年分分析）。見出しに URL は入らないので
// findUrlHeadings では拾えない。原稿の H2 とライブの h2 を突き合わせれば、割れ（原稿にあって
// ライブに無い）も CTA の見出し化（ライブにあって原稿に無い）も同じ判定で拾える。
// 原稿を直したが未再公開の記事も食い違うので、呼び出し側は再公開台帳と一致する記事にだけ使う。

// 比較用のテキスト化。1 回の置換だと除去後に新しいタグ（`<<b>b>` → `<b>`）が現れるので、
// 変化が無くなるまで繰り返す（出力を HTML として使う処理ではないが、除去を不完全にしない）。
export function removeUntilStable(s, re) {
  let prev;
  let cur = String(s);
  do { prev = cur; cur = cur.replace(re, ''); } while (cur !== prev);
  return cur;
}
export const stripTags = (s) => removeUntilStable(s, /<[^>]*>/g);
export const stripHtmlComments = (s) => removeUntilStable(s, /<!--[\s\S]*?-->/g);

const decodeEntities = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/** 見出し比較用の正規化（記法・タグ・空白・全半角の揺れを落とす）。 */
export function normalizeHeading(s) {
  return decodeEntities(stripTags(s)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'))
    .replace(/[*_`]/g, '')
    .normalize('NFKC')
    .replace(/\s+/g, '');
}

/**
 * 原稿本文（frontmatter 除去済み・コメント含む可）の見出しのうち、note で <h2> になるもの
 * （`#` と `##`。note の見出しは h2/h3 の 2 段なので `#` も h2 になる）。コードブロック内は数えない。
 * limitLine を渡すとその行より前だけ（有料記事は公開 API が有料境界の手前しか返さないため）。
 */
export function sotH2s(markdownBody, limitLine = Infinity) {
  const out = [];
  let inFence = false;
  let seenContent = false;
  const lines = stripHtmlComments(markdownBody).split('\n');
  for (let i = 0; i < lines.length && i < limitLine; i++) {
    const l = lines[i];
    if (/^\s*```/.test(l)) { inFence = !inFence; seenContent = true; continue; }
    if (inFence) continue;
    const m = l.match(/^#{1,2}\s+(.+?)\s*$/);
    // 本文先頭の `# タイトル` は note の記事タイトルになり、本文には入らない
    const isTitle = m && !seenContent && /^#\s/.test(l);
    if (l.trim()) seenContent = true;
    if (m && !isTitle) out.push(normalizeHeading(m[1]));
  }
  return out.filter(Boolean);
}

/** ライブ本文の h2 一覧（正規化済み）。 */
export function liveH2s(html) {
  return [...(html || '').matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => normalizeHeading(m[1])).filter(Boolean);
}

/** 2 つの見出し一覧の食い違い（重複を数える多重集合比較）。 */
export function diffHeadings(sot, live) {
  const count = (list) => list.reduce((m, h) => m.set(h, (m.get(h) || 0) + 1), new Map());
  const s = count(sot);
  const l = count(live);
  const missing = [];
  const extra = [];
  for (const [h, n] of s) for (let i = 0; i < n - (l.get(h) || 0); i++) missing.push(h);
  for (const [h, n] of l) for (let i = 0; i < n - (s.get(h) || 0); i++) extra.push(h);
  return { missing, extra };
}

/**
 * ライブ本文に記号のまま残った `**`（太字にならなかった強調）。コード内は除く。
 * 原稿側は check-bold-rendering が止めるが、公開済みの本文は再公開までライブに残る。
 */
export function findLiteralStars(html) {
  const text = decodeEntities(stripTags(removeUntilStable(html || '', /<(pre|code)\b[\s\S]*?<\/\1>/g)));
  return [...text.matchAll(/.{0,12}\*\*.{0,12}/g)].map((m) => m[0].replace(/\s+/g, ' '));
}

/**
 * ライブ本文のサイト内リンクのうち、存在しないページを指すもの（404 の疑い）のパス一覧。
 * 旧 /docs は転送先があれば 301 で届くので問題にしない。/standards・/topics の独自ページは
 * _redirects に載らずここでは判定できないので除く。_redirects を読めないときは判定しない
 * （転送先の集合が空だと全リンクを 404 扱いにしてしまう）。原稿側は check-sns-urls が止める。
 * 2026-09-24: 配合計算-実戦演習の打ち間違い 2 本が note 上で 404 のまま残っていた。
 */
export function findBrokenSiteLinks(html, routes = loadSiteRoutes()) {
  if (!routes.loaded) return [];
  const bad = new Set();
  for (const m of decodeEntities(html || '').matchAll(siteLinkRegex())) {
    const c = classifySitePath(m[1], routes);
    if (c.kind === 'unknown' || (c.kind === 'legacy' && !c.to)) bad.add(c.path);
  }
  return [...bad];
}
