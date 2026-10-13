/**
 * search-growth-classifier.mjs — 突合済み URL レコードを修正アクションへ分類（純関数・テスト対象）
 * ---------------------------------------------------------------------------
 * report-search-growth.mjs が組み立てた「signal」オブジェクト 1 件を受け取り、
 * { action, confidence, reasons[], requiresApproval } を返す。副作用なし・外部アクセスなし。
 *
 * 分類（docs/operations/gsc-ga4-playwright-automation-spec.md §7 / 指示書 §14）:
 *   FIX_TECHNICAL        sitemap 掲載なのに 404/redirect/403、canonical 不一致、robots 矛盾、多段 redirect
 *   REDIRECT_LEGACY      sitemap 外の旧 URL で明確な後継があり、需要/被リンクが残る
 *   KEEP_MONITOR         200 + self canonical + robots 正常 + 検索需要 or GA4 利用実績
 *   CONSOLIDATE_CANDIDATE 類似ページ群・低需要・低利用・親ページあり
 *   NOINDEX_CANDIDATE    固有価値低・長期 impressions/GA4 ゼロ・統合先なし（自動適用しない）
 *   EXPECTED_EXCLUSION   意図した 301 / canonical 代替 / noindex / 既知の旧 URL
 *   CANONICAL_ELSEWHERE  Google が別の URL を canonical に選んだ（インデックス名義が別 URL）。統合/301/内部リンクの判断が要る
 *   UNKNOWN_REVIEW       判断材料不足
 *
 * 自動適用してよいのは内部リンクの旧 URL 修正のみ（signal.autoFixableInternalLink）。
 * それ以外は requiresApproval=true。
 */

/** signal のしきい値。低需要/低利用の判定に使う。 */
export const THRESHOLDS = {
  lowImpressions: 5, // 直近 28 日 impressions がこれ未満は「低需要」
  lowActiveUsers: 2, // GA4 activeUsers がこれ未満は「低利用」
  redirectChainWarn: 2, // redirect hop がこれ以上は技術問題
};

/** 検索結果ページ（/search?q=...）。noindex が意図で、Google が拾っても直すものは無い。 */
export function isSearchResultPath(key) {
  return /^\/search(\?|\/|$)/.test(String(key ?? ""));
}

const NON_HTML_EXT = /\.(?:txt|xml|json|jsonld|md|csv|js|mjs|css|map|woff2?|ttf|otf|ico|png|jpe?g|gif|webp|avif|svg|pdf|zip|webmanifest)$/i;
const NON_HTML_PREFIX = /^\/(?:_next|cdn-cgi|standards-data|downloads|images|img|fonts)\//;
/** HTML ページではない URL（アセット・データ・フィード）。インデックス対象にしない。 */
export function isNonHtmlPath(key) {
  const path = String(key ?? "").split(/[?#]/)[0];
  return NON_HTML_EXT.test(path) || NON_HTML_PREFIX.test(path);
}

/**
 * 本文の断片が URL として拾われたもの。1 階層だけで、slug の形（英字で始まる 3 文字以上の英数字とハイフン）ではない。
 * 例: /8  /h)  /℃）とほぼ等しく…  /2.50  /m。実在ページを指す slug（/contact /privacy）は含まない。
 */
export function isFragmentPath(key) {
  const path = String(key ?? "").split(/[?#]/)[0];
  if (!path.startsWith("/") || path.indexOf("/", 1) !== -1) return false;
  return !/^\/[a-z][a-z0-9-]{2,}$/i.test(path);
}

function isNotFoundIssue(sig) {
  return sig.gscUiIssue === "notFound" || isNotFound(sig.httpStatus);
}

function isRedirectStatus(s) {
  return typeof s === "number" && s >= 300 && s < 400;
}
function isNotFound(s) {
  return s === 404 || s === 410;
}
function canonicalMismatch(sig) {
  // canonicalOk=true（Google 自己 canonical / verdict=PASS / HTML 自己 canonical）なら不一致にしない。
  // URL Inspection の陳腐化 user_canonical による誤検知を抑止（2026-07-24 修正）。
  if (sig.canonicalOk) return false;
  return (
    !!sig.googleCanonical &&
    !!sig.userCanonical &&
    sig.googleCanonical !== sig.userCanonical
  );
}
function isNoindex(sig) {
  return typeof sig.robots === "string" && /noindex/i.test(sig.robots);
}
function hasSearchDemand(sig) {
  return (sig.impressions ?? 0) >= THRESHOLDS.lowImpressions || (sig.clicks ?? 0) > 0;
}
function hasGa4Usage(sig) {
  return (sig.activeUsers ?? 0) >= THRESHOLDS.lowActiveUsers || (sig.sessions ?? 0) > 0;
}

/**
 * @param {object} sig 突合済み signal
 * @returns {{action:string, confidence:number, reasons:string[], requiresApproval:boolean}}
 */
export function classifyUrl(sig = {}) {
  const reasons = [];
  // build 済み local sitemap があるときは、それを「次回公開する desired state」として判定する。
  // URL 移行の公開前は live sitemap に旧 URL、local sitemap に新 URL が載るため OR すると、
  // 意図した旧 301 を「sitemap 内 redirect」と誤って FIX_TECHNICAL に分類してしまう。
  // local が無い収集専用環境だけ live にフォールバックする。
  const inSitemap = sig.localSitemapAvailable
    ? !!sig.inLocalSitemap
    : !!sig.inLiveSitemap;
  const status = sig.httpStatus ?? null;

  // ── 1. FIX_TECHNICAL: sitemap 掲載なのに技術的に壊れている ──
  if (inSitemap) {
    if (isNotFound(status)) {
      reasons.push(`sitemap 掲載 URL が ${status}`);
      return finalize("FIX_TECHNICAL", 0.95, reasons, sig);
    }
    if (isRedirectStatus(status) || sig.redirectTarget) {
      reasons.push(`sitemap 掲載 URL が redirect（→ ${sig.redirectTarget ?? "?"}）`);
      return finalize("FIX_TECHNICAL", 0.9, reasons, sig);
    }
    if (status === 403) {
      reasons.push("sitemap 掲載 URL が 403（アクセス禁止）");
      return finalize("FIX_TECHNICAL", 0.9, reasons, sig);
    }
    if (canonicalMismatch(sig)) {
      reasons.push(`canonical 不一致（user=${sig.userCanonical} / google=${sig.googleCanonical}）`);
      return finalize("FIX_TECHNICAL", 0.8, reasons, sig);
    }
    if (isNoindex(sig)) {
      reasons.push("sitemap 掲載なのに meta robots=noindex（矛盾）");
      return finalize("FIX_TECHNICAL", 0.85, reasons, sig);
    }
    if (typeof status === "number" && status >= 500) {
      reasons.push(`sitemap 掲載 URL が ${status}（サーバエラー/fetch 失敗）`);
      return finalize("FIX_TECHNICAL", 0.85, reasons, sig);
    }
  }
  if ((sig.redirectHops ?? 0) >= THRESHOLDS.redirectChainWarn) {
    reasons.push(`redirect chain ${sig.redirectHops} hop（多段）`);
    return finalize("FIX_TECHNICAL", 0.7, reasons, sig);
  }
  if (sig.redirectLoop) {
    reasons.push("redirect loop 検出");
    return finalize("FIX_TECHNICAL", 0.8, reasons, sig);
  }

  // ── 2. EXPECTED_EXCLUSION: 意図した除外 ──
  // published:false の下書き（source 在・未公開）＝404 は設計通り。redirect すると再公開時に URL を奪う。
  if (sig.isDraft) {
    reasons.push("published:false の下書き（source 在・意図的に未公開・404 は設計通り。redirect 不可）");
    return finalize("EXPECTED_EXCLUSION", 0.9, reasons, sig);
  }
  if (!inSitemap && sig.isIntentionalRedirect) {
    reasons.push("sitemap 外・_redirects に意図した 301 として登録済み");
    return finalize("EXPECTED_EXCLUSION", 0.9, reasons, sig);
  }
  if (!inSitemap && sig.isIntentionalNoindex) {
    reasons.push("sitemap 外・意図した noindex");
    return finalize("EXPECTED_EXCLUSION", 0.85, reasons, sig);
  }
  if (!inSitemap && sig.gscUiIssue === "alternateCanonical" && !hasSearchDemand(sig)) {
    reasons.push("sitemap 外・適切な canonical 代替（需要なし）");
    return finalize("EXPECTED_EXCLUSION", 0.75, reasons, sig);
  }

  // 検索結果ページ・非 HTML・本文の断片は、直す対象ではない（DN-0674）。sitemap 外のものだけ。
  if (!inSitemap && isSearchResultPath(sig.comparisonKey)) {
    reasons.push("sitemap 外・サイト内検索の結果ページ（/search?q=。noindex が設計で、Google が拾っても直すものは無い）");
    return finalize("EXPECTED_EXCLUSION", 0.9, reasons, sig);
  }
  if (!inSitemap && isNonHtmlPath(sig.comparisonKey)) {
    reasons.push("sitemap 外・HTML ではないファイル（アセット・データ・フィード）。インデックス対象にしない");
    return finalize("EXPECTED_EXCLUSION", 0.85, reasons, sig);
  }
  if (!inSitemap && isNotFoundIssue(sig) && isFragmentPath(sig.comparisonKey)) {
    reasons.push("sitemap 外・本文の断片が URL として拾われた 404（実在するページを指していない）");
    return finalize("EXPECTED_EXCLUSION", 0.85, reasons, sig);
  }
  // 需要・利用・後継・内部リンクのいずれも無い 404 は、Google が自然に落とす。内部リンクが 1 本でもあれば別（リンク切れ）。
  if (
    !inSitemap &&
    sig.gscUiIssue === "notFound" &&
    !hasSearchDemand(sig) &&
    !hasGa4Usage(sig) &&
    !sig.hasSuccessor &&
    !((sig.internalInbound ?? 0) > 0)
  ) {
    reasons.push("sitemap 外・404・検索需要/GA4 利用/後継/内部リンクがいずれも無い（Google が自然に落とす）");
    return finalize("EXPECTED_EXCLUSION", 0.7, reasons, sig);
  }
  // Google が別の URL を canonical に選んだ。KEEP と混ぜない（内部リンク・301・統合の判断が要る）。
  if (sig.googleChoseOtherCanonical === true || (sig.gscUiIssue === "alternateCanonical" && hasSearchDemand(sig))) {
    reasons.push(`Google が別の URL を canonical に選択（${sig.googleCanonical ?? "URL 不明"}）。需要あり/登録名義が別 URL`);
    return finalize("CANONICAL_ELSEWHERE", 0.8, reasons, sig);
  }

  // ── 3. REDIRECT_LEGACY: sitemap 外の旧 URL・後継あり・需要が残る ──
  if (!inSitemap && sig.hasSuccessor && (isNotFound(status) || isRedirectStatus(status) || status === null)) {
    if (hasSearchDemand(sig) || sig.hasExternalLinks) {
      reasons.push("sitemap 外の旧 URL・後継ページあり・需要/被リンクが残る → 301 候補");
      return finalize("REDIRECT_LEGACY", 0.8, reasons, sig);
    }
  }

  // ── 4. KEEP_MONITOR: 健全 200・需要 or 利用あり ──
  if (status === 200 && sig.selfCanonical !== false && !isNoindex(sig)) {
    if (hasSearchDemand(sig) || hasGa4Usage(sig)) {
      reasons.push("200 / self canonical / robots 正常・検索需要 or GA4 利用あり");
      return finalize("KEEP_MONITOR", 0.85, reasons, sig);
    }
  }

  // 登録済み・需要なし: 直すものは無い。表示が増えるまで見るだけ（DN-0674）。
  if (status === 200 && sig.selfCanonical !== false && !isNoindex(sig) && sig.isIndexed === true) {
    reasons.push("200 / self canonical / robots 正常・Google 登録済み・検索需要/GA4 利用はまだ無い");
    return finalize("KEEP_MONITOR", 0.7, reasons, sig);
  }
  // sitemap 掲載の健全なページを Google が検出済みで未登録。登録リクエスト（indexing-priority）の待ち行列に任せる。
  if (
    inSitemap &&
    status === 200 &&
    sig.selfCanonical !== false &&
    !isNoindex(sig) &&
    sig.gscUiIssue === "discoveredNotIndexed"
  ) {
    reasons.push("sitemap 掲載・200・self canonical・Google は検出済みで未登録（登録リクエストの待ち。修正点なし）");
    return finalize("KEEP_MONITOR", 0.6, reasons, sig);
  }

  // ── 5. CONSOLIDATE_CANDIDATE: 類似・低需要・親あり ──
  if (sig.similarCluster && sig.hasParent && !hasSearchDemand(sig) && !hasGa4Usage(sig)) {
    reasons.push("類似ページ群・低需要・低利用・明確な親ページあり → 統合候補");
    return finalize("CONSOLIDATE_CANDIDATE", 0.65, reasons, sig);
  }
  if (sig.cannibalization && sig.hasParent) {
    reasons.push("同一クエリを複数ページで奪い合い・親ページあり → 統合候補");
    return finalize("CONSOLIDATE_CANDIDATE", 0.6, reasons, sig);
  }

  // ── 6. NOINDEX_CANDIDATE: 固有価値低・需要ゼロ・統合先なし（自動適用しない） ──
  if (
    !hasSearchDemand(sig) &&
    !hasGa4Usage(sig) &&
    !sig.hasSuccessor &&
    !sig.hasParent &&
    sig.lowValue === true &&
    sig.longTermZero === true
  ) {
    reasons.push("固有価値低・長期impressions/GA4ゼロを確認・統合先なし（自動適用しない）");
    return finalize("NOINDEX_CANDIDATE", 0.5, reasons, sig);
  }

  // ── 7. UNKNOWN_REVIEW: 判断材料不足 ──
  reasons.push("判断材料不足（UI CSV のみ・状態未確定）");
  return finalize("UNKNOWN_REVIEW", 0.3, reasons, sig);
}

function finalize(action, confidence, reasons, sig) {
  // 自動適用してよいのは内部リンクの旧 URL 修正のみ。
  const autoFixableInternalLink =
    action === "FIX_TECHNICAL" && sig.autoFixableInternalLink === true;
  return {
    action,
    confidence,
    reasons,
    requiresApproval: !autoFixableInternalLink,
  };
}
