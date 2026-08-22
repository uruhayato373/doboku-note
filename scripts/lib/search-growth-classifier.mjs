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
  const inSitemap = !!(sig.inLiveSitemap || sig.inLocalSitemap);
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
