/**
 * standards-editions — 同じ要綱・要領を複数の機関・版で収録しているとき、検索に載せる 1 本を決める単一真実源。
 *
 * 工事必携は各地方整備局が国の要綱・要領を自局の冊子に綴じて公開するので、公衆災害防止対策要綱は
 * 九州・沖縄・近畿の 3 冊に入っている。原本 PDF が別物なので SHA-256 の一致（catalog の duplicateOf）では
 * 拾えない。そこで設定 config/standards-structure.json の editionCanonical に「同じ要綱の群」を持ち、
 * 原本で確かめた版（年月）の新しい 1 本（canonical）だけを索引に載せ、他は noindex, follow で読める
 * ままにする（共通仕様書を近畿版だけ索引に載せるのと同じ考え方）。
 *
 * 群の項目は文書（`kyushu/hikkei-common-10`）か、冊子の中の項目（`{ document: 'kinki/hikkei', item: 14 }`。
 * 近畿の必携の総目次の番号）。サイト（src/lib/standards.ts）・生成器（scripts/build-standard-articles.mjs）・
 * 検査（tests/standards-editions.test.mjs）が同じ関数を使う。
 */

const keyOf = (entry) => (entry.item ? `${entry.document}#${entry.item}` : entry.document);

/** 設定の群（無ければ空）。 */
export function editionGroups(config) {
  return config?.editionCanonical?.groups ?? [];
}

/**
 * 文書（または冊子の項目）が群の canonical でない側なら、その群と自分の項目を返す。canonical か群に無ければ null。
 * item を渡さないときは文書まるごとの項目だけを見る（冊子の項目は文書全体の索引を変えない）。
 */
export function editionDuplicateOf(config, document, item = null) {
  const key = keyOf({ document, item });
  for (const group of editionGroups(config)) {
    const entry = group.others.find((other) => keyOf(other) === key);
    if (entry) return { group, entry, canonical: group.canonical };
  }
  return null;
}

/** 設定の誤りを文で返す（空なら正しい）。catalog の文書の集合（`agency/document` の Set）と照らす。 */
export function validateEditionCanonical(config, documentKeys) {
  const errors = [];
  const seen = new Map();
  const note = (entry, where) => {
    const key = keyOf(entry);
    if (seen.has(key)) errors.push(`${key} が 2 つの群に入っている（${seen.get(key)} と ${where}）`);
    seen.set(key, where);
    if (!documentKeys.has(entry.document)) errors.push(`${where}: ${entry.document} は catalog に無い`);
    if (entry.item !== undefined && !(Number.isInteger(entry.item) && entry.item > 0)) errors.push(`${where}: item は正の整数（${entry.item}）`);
    if (!entry.edition) errors.push(`${where}: ${key} の版（edition）が空`);
  };
  for (const [index, group] of editionGroups(config).entries()) {
    const where = group.title ? `「${group.title}」` : `群 ${index + 1}`;
    if (!group.title) errors.push(`${where}: title が空`);
    if (!group.canonical?.document) { errors.push(`${where}: canonical が無い`); continue; }
    note(group.canonical, `${where} canonical`);
    if (!Array.isArray(group.others) || group.others.length === 0) { errors.push(`${where}: others が空`); continue; }
    for (const other of group.others) {
      note(other, `${where} others`);
      if (!other.reason) errors.push(`${where}: ${keyOf(other)} の理由（reason）が空`);
    }
  }
  return errors;
}
