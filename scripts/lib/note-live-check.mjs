/**
 * note-live-check.mjs — note 公開本文の「live 整合性」検査の共有実装
 *
 * note public API（/api/v3/notes/{id}）で本文 HTML を取得し、3 種の破損を検出する:
 *   (1) URL 見出し   — <h1-6> 内に http(s) URL（cardify グリッチ・note ネイティブ目次に URL 露出）
 *   (2) 空引用       — <blockquote> が中身空（複数行 blockquote が paste で脱落した痕跡）
 *   (3) 画像欠落     — 本文 <img> 数 < SoT 期待枚数（本文画像が除去されて live に載らない）
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

/** public API の生データを取得（body/hashtags/price/status と計測可否）。 */
export async function fetchNoteMeta(noteId, { retries = 2, delayMs = 3000 } = {}) {
  let lastErr = 'unknown';
  for (let i = 0; i <= retries; i++) {
    const r = spawnSync('curl', [
      '-sS', '-m', '30', '--ssl-no-revoke',
      '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json',
      `https://note.com/api/v3/notes/${noteId}`,
    ], { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
    const out = (r.stdout || '').trim();
    if (out.startsWith('{')) {
      try {
        const d = JSON.parse(out)?.data || {};
        return {
          body: d.body || '', hashtags: (d.hashtag_notes || []).length,
          price: d.price ?? null, status: d.status ?? null,
          unmeasurable: isUnmeasurable(d), error: null,
        };
      } catch (e) { lastErr = `parse: ${String(e.message || e)}`; }
    } else {
      lastErr = (r.stderr || '').trim().split('\n')[0] || `non-json (${out.slice(0, 40)})`;
    }
    if (i < retries) sleepSync(delayMs);
  }
  return { body: '', hashtags: 0, price: null, status: null, unmeasurable: false, error: String(lastErr) };
}

export async function fetchNoteBody(noteId, opts = {}) {
  const m = await fetchNoteMeta(noteId, opts);
  return { body: m.body, error: m.error, unmeasurable: m.unmeasurable };
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

/** HTML タグを落とした可読文字数（無料プレビュー量の目安）。 */
export function textLen(html) {
  return (html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length;
}

/**
 * 公開後の実体検証。expectedImgs を渡すと画像欠落も判定する（null/undefined なら画像検査 skip）。
 * paid=true を渡すと **無料プレビューの崩壊**（有料境界が冒頭へ動く事故）も検査する。
 * @returns {Promise<{ok:boolean, urlHeadings:string[], emptyBq:number, imgLive:number, imgShort:boolean, freeChars:number, freeShort:boolean, fetchError:string|null}>}
 */
export async function assertLiveBody(noteId, { expectedImgs = null, paid = false, minFreeChars = MIN_FREE_PREVIEW_CHARS } = {}) {
  const base = { urlHeadings: [], emptyBq: 0, imgLive: 0, imgShort: false, freeChars: 0, freeShort: false };
  const { body, error, unmeasurable } = await fetchNoteBody(noteId);
  if (error) return { ok: false, ...base, unmeasurable: false, fetchError: error };
  // 未ログインで中身が返らない記事は「破損なし」でも「破損あり」でもなく計測不能。
  // ここで imgShort を立てると存在する画像を欠落と誤診する（2026-07-30・isUnmeasurable 参照）。
  if (unmeasurable) return { ok: true, ...base, unmeasurable: true, fetchError: null };
  const urlHeadings = findUrlHeadings(body);
  const emptyBq = countEmptyBlockquotes(body);
  const imgLive = countImgs(body);
  const imgShort = expectedImgs != null && imgLive < expectedImgs;
  const freeChars = textLen(body);
  // 有料記事のときだけ見る。無料記事は body 全文が返るので短くても事故ではない。
  const freeShort = paid && freeChars < minFreeChars;
  const ok = urlHeadings.length === 0 && emptyBq === 0 && !imgShort && !freeShort;
  return { ok, urlHeadings, emptyBq, imgLive, imgShort, freeChars, freeShort, unmeasurable: false, fetchError: null };
}
