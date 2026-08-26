/**
 * sales-normalize.mjs — sales-log.json の productId 解決を純関数として切り出したもの。
 *
 * 背景（DN-0018）: 取得（`note-sales-fetch.mjs`）とスキル手動転記（`sales-recorder` エージェント）で
 * 同じ商品が別表記の productId に解決されると、`sales-summary` の商品別集計が分断される
 * （実例: `bk-i-r8-yosou-04-cn-gx` と `bk-i-r08-yosou-4`）。
 *
 * 設計方針: `.claude/agents/sales-recorder.md` の巨大な商品名パターン表を並行コードとして
 * 複製すると必ず陳腐化する（新マガジン追加時に片方だけ更新される）。そのため:
 *
 * 1. **マガジン（type: magazine）**: `src/lib/note-magazines.ts` を実行時に読み、
 *    `title` / `shortTitle` との一致でマガジン `id` を直接解決する。SoT が 1 つなので陳腐化しない。
 * 2. **単品記事（type: article）**: 商品名パターンは記事ごとに手作りの slug（工事番号・テーマ名等）が
 *    絡み、SoT からの機械推定に馴染まない。ここでは推定を試みず、
 *    `article:unknown-{YYYYMMDD}-{index}` で保留し、`sales-recorder.md` の既存フォールバックと
 *    同じ形で人手確認へ回す（誤った id を確信ありげに書き込まない）。
 * 3. **既知の表記ゆれ**: アルゴリズムで一般化できない drift（サフィックス付与・命名規則の変更等）は
 *    `PRODUCT_ID_ALIASES` に個別登録する。新しい drift を見つけたら 1 行足す。
 */

/**
 * 手動で確認済みの productId 表記ゆれ。key・value とも `article:` 接頭辞なしの bare id で持つ
 * （呼び出し側で接頭辞の有無を吸収する）。
 *
 * - `bk-i-r08-yosou-4` → `bk-i-r8-yosou-04-cn-gx`:
 *   技術士建設部門 必須科目I R8予想 4問目（CN/GX テーマ）。手動転記は sales-recorder.md の
 *   命名規則（`bk-i-r8-yosou-*`・ゼロ埋め・テーマ略称サフィックス付き）で確定した id を使うが、
 *   note タイトルをそのまま機械的に slug 化すると「r8」→「r08」・連番の非ゼロ埋め・
 *   サフィックス欠落という 3 点が同時にずれる。まとめて 1 エイリアスとして吸収する。
 */
export const PRODUCT_ID_ALIASES = new Map([['bk-i-r08-yosou-4', 'bk-i-r8-yosou-04-cn-gx']]);

/** `article:` 接頭辞の有無を保ったまま bare id 部分だけを正規化する。 */
export function canonicalizeProductId(rawId) {
  if (!rawId) return rawId;
  const id = String(rawId).trim();
  const hasPrefix = id.startsWith('article:');
  const bare = hasPrefix ? id.slice('article:'.length) : id;
  const canonicalBare = PRODUCT_ID_ALIASES.get(bare) ?? bare;
  return hasPrefix ? `article:${canonicalBare}` : canonicalBare;
}

/**
 * note-magazines.ts の配列から、タイトル文字列に一致するマガジン id を解決する。
 * 完全一致 → shortTitle 完全一致 → title 部分一致（双方向）の順で試す。
 * 一致しなければ null（呼び出し側は article:unknown-* へフォールバックする）。
 *
 * @param {string} rawTitle note ダッシュボードに表示された商品名
 * @param {Array<{id: string, title: string, shortTitle?: string}>} magazines note-magazines.ts の NOTE_MAGAZINES
 * @returns {string|null} マガジン id（canonicalize 済み）
 */
export function resolveMagazineId(rawTitle, magazines) {
  const title = String(rawTitle || '').trim();
  if (!title || !Array.isArray(magazines)) return null;

  for (const m of magazines) {
    if (m.title === title || m.shortTitle === title) return canonicalizeProductId(m.id);
  }
  for (const m of magazines) {
    if (title.includes(m.title) || (m.shortTitle && title.includes(m.shortTitle))) {
      return canonicalizeProductId(m.id);
    }
  }
  // note 側は長いタイトルを末尾で省略表示することがあるため、逆方向（商品名がタイトルを含む）も試す
  for (const m of magazines) {
    if (m.title.includes(title) && title.length >= 8) return canonicalizeProductId(m.id);
  }
  return null;
}

/**
 * 1 件の販売履歴レコードから type/productId を解決する。
 * マガジンは resolveMagazineId、それ以外は unknown へフォールバックする（確信のない推定をしない）。
 *
 * @param {{title: string, date: string}} raw
 * @param {Array} magazines note-magazines.ts の NOTE_MAGAZINES
 * @param {number} unknownIndex 同日内の unknown 連番（0 始まり）
 * @returns {{type: 'magazine'|'article', productId: string, resolved: boolean}}
 */
export function resolveSaleEntry(raw, magazines, unknownIndex = 0) {
  const magazineId = resolveMagazineId(raw?.title, magazines);
  if (magazineId) return { type: 'magazine', productId: magazineId, resolved: true };

  const dateCompact = String(raw?.date || '').replace(/-/g, '').slice(0, 8) || 'unknown';
  return {
    type: 'article',
    productId: `article:unknown-${dateCompact}-${unknownIndex}`,
    resolved: false,
  };
}

/**
 * 明細合計と note「売上管理」の月次表示額を突合する。一致しなければ書き込んではいけない
 * （sales-tracking.md「取得と検算」）。
 *
 * @param {Array<{price: number}>} entries
 * @param {number} dashboardTotal
 * @returns {{ok: boolean, computed: number, expected: number, diff: number}}
 */
export function reconcileTotal(entries, dashboardTotal) {
  const computed = (entries || []).reduce((sum, e) => sum + (Number(e?.price) || 0), 0);
  const expected = Number(dashboardTotal) || 0;
  return { ok: computed === expected, computed, expected, diff: computed - expected };
}
