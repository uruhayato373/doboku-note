// ig-reconcile-core.mjs — IG ローカル SoT ↔ ライブ公開状態の照合ロジック（純関数）。
//
// 背景: scripts/verify-ig-status.mjs（Playwright でライブ取得する CLI）と、CI 週次で
//   Graph API 経由の照合を書く scripts/fetch-ig-insights.mjs --reconcile（別ユニット）が、
//   同じ突合ロジック・同じ snapshot 形状を共有する必要がある。verify-ig-status.mjs は
//   トップレベルで playwright を import して main を走らせるため、テストや別スクリプトから
//   ロジックだけを直接呼べない（check-outbound-links → lib/note-refs.mjs と同型の切り出し）。
//
// 方針: 実装は verify-ig-status.mjs から**そのまま**移設する（挙動を変えない）。
//   normHead / captionHead / shortcodeOf / localPacks / reconcile / driftCount / buildSnapshot。
//   localPacks は元コードのモジュールグローバル EXAM を options.exam に置き換え、
//   options.igDir でテストから一時ディレクトリを渡せるようにした点のみ変更。
//
// usage:
//   import { reconcile, buildSnapshot, ... } from "./lib/ig-reconcile-core.mjs";
//
// exit code: 本ファイルは CLI を持たない（ライブラリ）。

import { readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { walkPacks, readPostedRaw, IG_DIR as DEFAULT_IG_DIR } from "../ig-status.mjs";
import { markAmbiguousClaims, dropResolvedFalseMatches } from "./ig-ambiguity.mjs";

export const IG_DIR = DEFAULT_IG_DIR;

// caption の先頭行を正規化（記号/空白を除き先頭 24 文字）。ローカル caption.txt とライブ og:title の突合キー。
export function normHead(s) {
  if (!s) return "";
  const first = String(s).split("\n").map((x) => x.trim()).filter(Boolean)[0] || "";
  return first.replace(/[\s　・「」（）()【】、。:：!！?？📋✅▶#＃]/g, "").slice(0, 24);
}

// ─── ローカルパック収集 ────────────────────────────────────────
export function captionHead(packDir) {
  for (const rel of ["carousel/caption.txt", "caption.txt"]) {
    const p = join(packDir, rel);
    if (existsSync(p)) return normHead(readFileSync(p, "utf8"));
  }
  return "";
}
export function shortcodeOf(url) {
  const m = String(url || "").match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * ローカルの IG パック一覧を収集する。
 * @param {{exam?: string|null, igDir?: string}} [options] exam: 試験で絞り込み（省略時は全件）。
 *   igDir: 走査ルート（省略時は content/sns/instagram）。テストで一時ディレクトリを渡す。
 */
export function localPacks(options = {}) {
  const { exam = null, igDir = IG_DIR } = options;
  return walkPacks(igDir)
    .map((dir) => {
      // rel/exam は ig-status.mjs の packInfo() 相当だが、packInfo は自身のモジュール定数
      // IG_DIR（content/sns/instagram 固定）を基準に relative() を取るためテストの一時
      // ディレクトリでは壊れる（igDir と乖離した相対パスになる）。ここでは渡された igDir を
      // 基準に同じ計算をする（year/packNum/management など localPacks が使わない meta は省く）。
      const rel = relative(igDir, dir).replace(/\\/g, "/");
      const exam2 = rel.split("/")[0] || "?";
      if (exam && exam2 !== exam) return null;
      const postedRaw = readPostedRaw(dir);
      const carouselUrl = postedRaw?.carousel?.url || (postedRaw?.url ?? null);
      // status.json（schema A: {carousel:{status,scheduled_at}} / schema B: {carousel:"draft",posted}）
      let statusRaw = null;
      const sp = join(dir, "status.json");
      if (existsSync(sp)) { try { statusRaw = JSON.parse(readFileSync(sp, "utf8")); } catch {} }
      const carStatus = statusRaw?.carousel;
      const scheduled = typeof carStatus === "object" && carStatus?.status === "scheduled" ? carStatus.scheduled_at : null;
      const draftFlag = carStatus === "draft" || statusRaw?.posted === false;
      const hasContent = existsSync(join(dir, "carousel/caption.txt")) || existsSync(join(dir, "caption.txt"));
      // リール軸: posted.json.reels（投稿済）/ status.json.reel scheduled（予約）/ reels 素材（script.txt|video.mp4）
      const reelStatus = statusRaw?.reel;
      const reelPostedUrl = postedRaw?.reels?.url || null;
      const reelScheduledAt = typeof reelStatus === "object" && reelStatus?.status === "scheduled" ? reelStatus.scheduled_at : null;
      const reelMaterial = existsSync(join(dir, "reels/script.txt")) || existsSync(join(dir, "reels/video.mp4"));
      return {
        rel, head: captionHead(dir),
        recordedShortcode: shortcodeOf(carouselUrl), recordedUrl: carouselUrl,
        scheduledAt: scheduled, draftFlag, hasContent,
        reelPostedUrl, reelScheduledAt, reelMaterial,
      };
    })
    .filter(Boolean)
    .filter((p) => p.hasContent || p.recordedShortcode); // 投稿素材か記録を持つパックのみ
}

// ─── 照合 ─────────────────────────────────────────────────────
export function reconcile(packs, liveData) {
  // head → [{shortcode,type}]（型を保持し anomaly を型考慮にする）
  const headToLive = {};
  for (const lv of liveData.live) { if (lv.head) (headToLive[lv.head] ||= []).push({ shortcode: lv.shortcode, type: lv.type || "carousel" }); }

  const cats = { published_recorded: [], published_UNrecorded: [], draft_misrecorded: [], scheduled: [], unpublished: [], recorded_but_gone: [], type_mismatch: [], anomaly: [], reel_gap: [], reel_built_unposted: [] };
  for (const p of packs) {
    const matched = p.head ? (headToLive[p.head] || []) : [];
    const matchedCarousel = matched.filter((m) => m.type === "carousel").map((m) => m.shortcode);
    // 記録側は直接存在チェック＋型の結果を使う（exists: true=生存/false=削除/null=取得不能→生存扱い）
    const recInfo = p.recordedShortcode ? liveData.recordedInfo?.[p.recordedShortcode] : undefined;

    // anomaly は「同テーマの同型（カルーセル）が 2 件以上」のみ。カルーセル＋リールの併存は正常運用なので除外。
    if (matchedCarousel.length >= 2) cats.anomaly.push({ ...p, matched: matchedCarousel, reason: "同一テーマが複数のカルーセル投稿に一致（重複の疑い・型考慮済み）" });

    if (p.recordedShortcode) {
      if (recInfo?.exists === false) { cats.recorded_but_gone.push(p); continue; }  // 記録 URL が削除済み（確定）
      if (recInfo?.type === "reel") {                                                // ★記録 carousel が実はリール（rio 型）
        // カルーセル記録がリールを指す＝カルーセル実質欠落。型不整合として赤フラグし、carousel-done に含めない。
        cats.type_mismatch.push({ ...p, recordedType: "reel", note: "posted.json は carousel だが実体はリール＝カルーセル実質なし" });
        continue;
      }
      cats.published_recorded.push(p);                                               // 生存 carousel or 取得不能（生存扱い）
      continue;
    }
    if (matchedCarousel.length >= 1) {                          // 記録は無いがライブのカルーセルに一致
      if (p.draftFlag) cats.draft_misrecorded.push({ ...p, matched: matchedCarousel });
      else cats.published_UNrecorded.push({ ...p, matched: matchedCarousel });
      continue;
    }
    if (p.scheduledAt) { cats.scheduled.push(p); continue; }    // status.json で予約済み
    cats.unpublished.push(p);                                   // 真の未公開（予約候補）
  }

  // リール軸（別axis・carousel カテゴリと排他ではない）: カルーセルは出たがリールが無いパックを surface。
  const carouselDone = new Set([...cats.published_recorded, ...cats.published_UNrecorded, ...cats.draft_misrecorded, ...cats.scheduled].map((p) => p.rel));
  for (const p of packs) {
    if (!carouselDone.has(p.rel)) continue;                     // カルーセル未了はリールギャップに含めない
    if (p.reelPostedUrl || p.reelScheduledAt) continue;        // リール投稿済み or 予約済み＝OK
    if (p.reelMaterial) cats.reel_built_unposted.push(p);       // 素材はあるが未投稿/未予約
    else cats.reel_gap.push(p);                                 // カルーセル済みだがリール未作成（素材も無し）
  }

  // 逆方向の衝突検査: matched はパック→ライブの片方向しか見ないので、1 本のライブ投稿に複数パックが
  // マッチしても各パックは matched=1 のまま published_UNrecorded に入る。これを「一意対応」と読んで
  // backfill すると未投稿のパックに投稿済みの記録が付く（2026-08-27 の事故未遂・[[ig-ambiguity]]）。
  markAmbiguousClaims(cats);

  // 誤ヒットの解消: matched が全て他パックの posted.json へ割当済みなら、そのパックは
  // 「投稿済みなのに未記録」ではなく「テーマ名が同じせいで誤ヒットしただけの未投稿」。
  // 判定の証拠は posted.json という形で既にリポジトリにあるので、手で維持する除外リストは要らない
  // （DN-0149・人間判定で正のパックへ backfill したあと、残りの候補が毎回再浮上していた）。
  const claimedBy = new Map();
  for (const p of packs) if (p.recordedShortcode) claimedBy.set(p.recordedShortcode, p.rel);
  dropResolvedFalseMatches(cats, claimedBy);
  return cats;
}

/** cats からドリフト合計件数を出す（SoT 整合を崩している件数のみ。reel_gap 等は別軸なので含めない）。 */
export function driftCount(cats) {
  return cats.published_UNrecorded.length + cats.draft_misrecorded.length + cats.recorded_but_gone.length + cats.type_mismatch.length + cats.anomaly.length;
}

/**
 * snapshot オブジェクトを組み立てる（.claude/state/ig-reconcile/snapshot.json の形）。
 * @param {{account:string, cats:object, liveData:{shortcodes:string[], scheduled:any}, source:'playwright'|'graph-api', now?: Date}} args
 */
export function buildSnapshot({ account, cats, liveData, source, now = new Date() }) {
  return {
    account, at: now.toISOString(),
    counts: Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, v.length])),
    live: { posts: liveData.shortcodes.length, scheduledByDay: liveData.scheduled },
    cats,
    source,
  };
}
