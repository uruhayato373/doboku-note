/**
 * sales-normalize.mjs — data/note/sales.json の productId 解決を純関数として切り出したもの。
 *
 * 背景（DN-0018）: 取得（`note-sales-fetch.mjs`）とスキル手動転記（`sales-recorder` エージェント）で
 * 同じ商品が別表記の productId に解決されると、`sales-summary` の商品別集計が分断される
 * （実例: `bk-i-r8-yosou-04-cn-gx` と `bk-i-r08-yosou-4`）。
 *
 * 設計方針: `.claude/agents/sales-recorder.md` の巨大な商品名パターン表を並行コードとして
 * 複製すると必ず陳腐化する（新マガジン追加時に片方だけ更新される）。そのため:
 *
 * 1. **マガジン（type: magazine）**: `src/lib/note-magazines.ts` を実行時に読み、
 *    `noteTitle`（販売履歴に出る note 上のマガジン名）/ `title` / `shortTitle` との一致でマガジン `id` を直接解決する。
 *    SoT が 1 つなので陳腐化しない。
 * 2. **単品記事（type: article）**: 既存ログで同じ表示名に確定済み id が1つだけあれば再利用する。
 *    カタログに無い単品は `SINGLE_ARTICLE_TITLE_RULES`（題名 → id の手当表）で解決する。
 *    どちらにも無い初出の商品名は推定せず、`article:unknown-{YYYYMMDD}-{index}` で人手確認へ回す。
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

/** 売上の商品名と照合する、カタログ 1 件の名前（noteTitle は note 上のマガジン名そのもの。無い単品・旧エントリは省く） */
const namesOf = (m) => [m.noteTitle, m.title, m.shortTitle].filter(Boolean);

/**
 * note-magazines.ts の配列から、タイトル文字列に一致するマガジン id を解決する。
 * 完全一致（noteTitle・title・shortTitle）→ 部分一致（商品名が名前を含む）→ 逆向きの部分一致の順で試す。
 * 販売履歴の商品名は noteTitle で出るので、title・shortTitle だけを見ると取り直しのたびに unknown へ戻る
 * （2026-10-11: 「建設部門2次｜土質基礎まるごと合格パック」。shortTitle は「土質基礎 合格パック」で一致しない）。
 * 一致しなければ null（呼び出し側は article:unknown-* へフォールバックする）。
 *
 * @param {string} rawTitle note ダッシュボードに表示された商品名
 * @param {Array<{id: string, title: string, shortTitle?: string, noteTitle?: string}>} magazines note-magazines.ts の NOTE_MAGAZINES
 * @returns {string|null} マガジン id（canonicalize 済み）
 */
export function resolveMagazineId(rawTitle, magazines) {
  const title = String(rawTitle || '').trim();
  if (!title || !Array.isArray(magazines)) return null;

  for (const m of magazines) {
    if (namesOf(m).includes(title)) return canonicalizeProductId(m.id);
  }
  for (const m of magazines) {
    if (namesOf(m).some((name) => title.includes(name))) return canonicalizeProductId(m.id);
  }
  // note 側は長いタイトルを末尾で省略表示することがあるため、逆方向（商品名がタイトルを含む）も試す
  for (const m of magazines) {
    if ([m.noteTitle, m.title].some((name) => name?.includes(title)) && title.length >= 8) return canonicalizeProductId(m.id);
  }
  return null;
}

/**
 * カタログ（note-magazines.ts）に無い単品記事の題名 → productId の手当表。id は sales-recorder.md の命名規則
 * （`.claude/agents/sales-recorder.md`・`npm run check-sales-mapping` が sales.json の id をその表と照合する）。
 * 題名は note 側で変わる（2026-06 に「（予想問題＋フル模範解答）」が付き、既存ログの題名と一致せず 6 件が unknown に戻った）ので、
 * 題名の全文でなく見分けに足りる部分（all の語がすべて入る）で当てる。比較は NFKC（全角・丸数字の揺れを吸収）。
 * 新しい単品で初出の題名が unknown になったら、確定した id をここに 1 行足す。
 */
export const SINGLE_ARTICLE_TITLE_RULES = [
  { all: ['R8予想問題', '災害復旧 × 複合災害対応'], productId: 'article:r8-disaster-recovery-compound' },
  { all: ['道路 R8予想', '選択科目II-2-1 '], productId: 'article:bk-01-road-r8-yosou-ii2-1' },
  { all: ['道路 R8予想', '選択科目II-2 予想② '], productId: 'article:bk-01-road-r8-yosou-ii2-2' },
  { all: ['道路 R8予想', '選択科目II-2 予想③ '], productId: 'article:bk-01-road-r8-yosou-ii2-3' },
  { all: ['道路 R8予想', '選択科目III 予想① '], productId: 'article:bk-01-road-r8-yosou-iii-1' },
  { all: ['道路 R8予想', '選択科目III 予想③ '], productId: 'article:bk-01-road-r8-yosou-iii-3' },
];

/** カタログに無い単品記事の題名から productId（`article:` 付き）を解決する。当たる規則が無ければ null。 */
export function resolveSingleArticleId(rawTitle) {
  const title = String(rawTitle || '').normalize('NFKC');
  if (!title) return null;
  const hit = SINGLE_ARTICLE_TITLE_RULES.find((rule) => rule.all.every((word) => title.includes(word.normalize('NFKC'))));
  return hit ? hit.productId : null;
}

const MEMBERSHIP_PLANS = [
  { match: '通年プラン｜過去問＆月例予想', productId: 'membership:civil-lab-annual' },
];

/** 「メンバーシップ・<プラン名>」を membership productId へ。プラン名が未登録なら null。 */
export function resolveMembershipId(rawTitle) {
  // 販売履歴の DOM では「メンバーシップ・」の接頭辞が別要素に分かれ、プラン名だけが取れることがある
  const plan = String(rawTitle || '').trim().replace(/^メンバーシップ[・･]/, '').trim();
  if (!plan) return null;
  const hit = MEMBERSHIP_PLANS.find((p) => plan === p.match || plan.includes(p.match));
  return hit ? hit.productId : null;
}

/** 既存ログで同じ表示名に確定済みの id が1つだけなら再利用する。 */
export function resolveKnownSaleEntry(rawTitle, sales = []) {
  const title = String(rawTitle || '').normalize('NFKC').trim();
  if (!title) return null;
  const matches = (sales || []).filter((sale) =>
    String(sale?.title || '').normalize('NFKC').trim() === title &&
    sale?.productId && !String(sale.productId).startsWith('article:unknown-'));
  const ids = [...new Set(matches.map((sale) => canonicalizeProductId(sale.productId)))];
  if (ids.length !== 1) return null;
  const hit = matches.find((sale) => canonicalizeProductId(sale.productId) === ids[0]);
  return { type: hit?.type || (ids[0].startsWith('article:') ? 'article' : 'magazine'), productId: ids[0], resolved: true };
}

/**
 * 1 件の販売履歴レコードから type/productId を解決する。
 * 手当表の単品は resolveSingleArticleId、マガジンは resolveMagazineId、それ以外は unknown へフォールバックする
 * （確信のない推定をしない）。
 *
 * @param {{title: string, date: string}} raw
 * @param {Array} magazines catalogMagazines（scripts/lib/sales-mapping.mjs）が返すカタログの配列
 * @param {number} unknownIndex 同日内の unknown 連番（0 始まり）
 * @returns {{type: 'magazine'|'article', productId: string, resolved: boolean}}
 */
export function resolveSaleEntry(raw, magazines, unknownIndex = 0) {
  // メンバーシップ会費（販売履歴では「メンバーシップ・<プラン名>」・価格は「1,480円 / 月」）。
  // productId は sales-tracking.md の `membership:<プラン>`。既知プランだけ解決し、未知は unknown へ。
  const membership = resolveMembershipId(raw?.title);
  if (membership) return { type: 'membership', productId: membership, resolved: true };
  // カタログに無い単品（手当表）。曖昧な部分一致のマガジン照合より先に、確認済みの規則で当てる
  const single = resolveSingleArticleId(raw?.title);
  if (single) return { type: 'article', productId: canonicalizeProductId(single), resolved: true };
  const magazineId = resolveMagazineId(raw?.title, magazines);
  if (magazineId) {
    // カタログの単品記事（noteUrl が /n/・loadMagazines が single:true を付ける）は article:<id>
    const entry = magazines.find((m) => canonicalizeProductId(m.id) === magazineId || m.id === magazineId);
    if (entry?.single) return { type: 'article', productId: `article:${magazineId}`, resolved: true };
    return { type: 'magazine', productId: magazineId, resolved: true };
  }

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
