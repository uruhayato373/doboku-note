/**
 * asp-site-guard.mjs — ASP のサイト帰属を機械で強制する（3 ASP 共通の不変条件）
 * ---------------------------------------------------------------------------
 * この口座群は doboku-note と stats47（統計で見る都道府県）を共用しており、
 * **既定で選択されているのは stats47 側**であることが 3 ASP すべてで確認された（2026-07-27 実機）。
 *
 *   A8      … サイト切替が存在しない。レポート単位で siteScope を分ける
 *   もしも   … shop_site_id（URL で切替可）。申請フォームにサイト select がある
 *   afb     … partner_site_id（Chosen ウィジェットの実クリックのみ有効）。既定 stats47
 *
 * 「切り替えないと他サイトのデータを自分のものと誤認する」事故が実際に起きた:
 * afb の走査で SID 不一致を **警告して続行**した結果、stats47 の一覧を読んで
 * 「建設系 0 件」と誤報告した。**警告では防げない**ので例外にする。
 *
 * 設計方針:
 *   - 判定は純関数（`verifySite`）に切り出してテスト可能にする
 *   - 呼び出し側が握り潰せないよう、ガード本体（`assertSite`）は **throw** する
 *   - `--force` 相当の迂回手段を作らない（作れば必ず使われる）
 */

/** サイト帰属の検証に失敗したときの例外。呼び出し側で握り潰さない前提。 */
export class SiteAttributionError extends Error {
  constructor(detail) {
    super(`[site-guard] ${detail.reason}`);
    this.name = "SiteAttributionError";
    Object.assign(this, detail);
  }
}

/**
 * 画面から読み取った実サイト情報が、想定サイトと一致するかを判定する（純関数）。
 *
 * @param {object} p
 * @param {string|null} p.actualSiteId  画面から read-back した実 ID（取れなければ null）
 * @param {string} p.expectedSiteId     期待するサイト ID
 * @param {string} [p.visibleText]      画面の可視テキスト（禁止サイト名の混入検査に使う）
 * @param {string[]} [p.forbiddenText]  出てはいけないサイト名（他サイトの識別子）
 * @param {string} [p.expectedSiteName] 期待サイトの表示名（ID が取れない ASP 用のフォールバック）
 * @returns {{ok: boolean, reason: string, actualSiteId: string|null, matchedBy: string|null}}
 */
export function verifySite({
  actualSiteId = null,
  expectedSiteId,
  visibleText = "",
  forbiddenText = [],
  expectedSiteName = null,
}) {
  if (!expectedSiteId && !expectedSiteName) {
    return { ok: false, reason: "期待するサイトが設定されていない（config の設定漏れ）", actualSiteId, matchedBy: null };
  }

  // 1) ID の read-back が最優先。取れているなら完全一致だけを通す。
  if (actualSiteId != null && String(actualSiteId).trim() !== "") {
    const a = String(actualSiteId).trim();
    if (a === String(expectedSiteId)) {
      // ID が一致していても、他サイト名が同居していれば口座横断画面の疑い → 呼び出し側へ伝える
      const bad = forbiddenText.filter((f) => f && visibleText.includes(f));
      if (bad.length > 0) {
        return {
          ok: false,
          reason: `サイト ID は一致(${a})だが、他サイトの識別子が同一画面に存在する: ${bad.join(", ")}（口座横断画面の疑い）`,
          actualSiteId: a,
          matchedBy: "id",
        };
      }
      return { ok: true, reason: `サイト ID 一致 (${a})`, actualSiteId: a, matchedBy: "id" };
    }
    return {
      ok: false,
      reason: `サイト ID 不一致: 期待 ${expectedSiteId} / 実際 ${a}`,
      actualSiteId: a,
      matchedBy: "id",
    };
  }

  // 2) ID が取れない ASP（A8 のようにサイト切替自体が無い等）は表示名で判定する。
  //    **表示名だけの一致は弱い**ので、他サイト名が見えていれば必ず落とす。
  if (expectedSiteName) {
    const bad = forbiddenText.filter((f) => f && visibleText.includes(f));
    if (bad.length > 0) {
      return {
        ok: false,
        reason: `他サイトの識別子を検出: ${bad.join(", ")}（表示名フォールバック判定では通さない）`,
        actualSiteId: null,
        matchedBy: "name",
      };
    }
    if (visibleText.includes(expectedSiteName)) {
      return { ok: true, reason: `表示名一致 (${expectedSiteName})`, actualSiteId: null, matchedBy: "name" };
    }
    return {
      ok: false,
      reason: `画面に "${expectedSiteName}" が見当たらない（サイト未選択の可能性）`,
      actualSiteId: null,
      matchedBy: "name",
    };
  }

  return { ok: false, reason: "サイト ID を read-back できなかった", actualSiteId: null, matchedBy: null };
}

/**
 * 検証して、通らなければ **例外を投げる**。
 * 戻り値で成否を返すと呼び出し側が「警告して続行」してしまい、実際に事故が起きたのでこの形にする。
 * @throws {SiteAttributionError}
 */
export function assertSiteOrThrow(input) {
  const r = verifySite(input);
  if (!r.ok) throw new SiteAttributionError({ ...r, expectedSiteId: input.expectedSiteId });
  return r;
}

/**
 * 画面の可視テキストから ASP 固有の書式でサイト ID を抜く。
 * 実機で確認した書式のみを扱う（推測パターンを足さない）。
 *
 *   afb     … 「現在選択中のサイト情報【SID】984453」
 *   moshimo … URL の shop_site_id（テキストには出ないので呼び出し側が URL から渡す）
 *   a8      … 「メディアID a25050375786」（サイトではなく口座の識別子）
 */
export function extractSiteId(text, pattern) {
  if (!text || !pattern) return null;
  const m = String(text).match(new RegExp(pattern));
  return m ? (m[1] ?? m[0]) : null;
}
