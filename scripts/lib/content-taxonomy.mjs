/**
 * content-taxonomy.mjs — コンテンツ分類（領域×資格×記事型×テーマ×タグ）の純関数。
 *
 * 真実源: 語彙と規則 = .claude/knowledge/reference/content-taxonomy.md
 *         値 = src/config/content-taxonomy.json / categories.json / tags.json / topics.json
 * ここは I/O を持たない。読み込みは check-content-taxonomy.mjs / build-doc-meta-index.mjs 側で行う。
 *
 * 用語:
 *   canonical … 記事に書く正規表記（tags.json の `canonical` ?? `name`）
 *   alias     … 受理はするが正規でない綴り（`slug` と `aliases[]`）。ビルド時に canonical へ正規化する
 */

/**
 * tags.json → 綴り→canonical の対応表。
 * 同じ綴りが 2 つの canonical を主張したら throw（設定不良＝検査不成立にする）。
 * @param {Array<{name:string, slug:string, class?:string, canonical?:string, aliases?:string[]}>} entries
 * @returns {{ toCanonical: Map<string,string>, entryByCanonical: Map<string,object>, classOf: Map<string,string> }}
 */
export function buildAliasMap(entries) {
  const toCanonical = new Map();
  const entryByCanonical = new Map();
  const classOf = new Map();
  for (const e of entries) {
    if (!e || typeof e.name !== 'string' || !e.name) throw new Error('tags.json: name が無いエントリ');
    const canonical = e.canonical ?? e.name;
    const spellings = [e.name, e.slug, ...(e.aliases ?? [])].filter((s) => typeof s === 'string' && s);
    for (const s of spellings) {
      const prev = toCanonical.get(s);
      if (prev !== undefined && prev !== canonical) {
        throw new Error(`tags.json: 綴り「${s}」が 2 つの canonical を指す（${prev} / ${canonical}）`);
      }
      toCanonical.set(s, canonical);
    }
    if (entryByCanonical.has(canonical) && entryByCanonical.get(canonical) !== e) {
      throw new Error(`tags.json: canonical「${canonical}」が重複`);
    }
    entryByCanonical.set(canonical, e);
    classOf.set(canonical, e.class ?? 'topical');
  }
  return { toCanonical, entryByCanonical, classOf };
}

/**
 * tags 配列を canonical へ正規化する。順序保持・重複除去。
 * @returns {{ tags: string[], aliased: Array<{from:string,to:string}>, unknown: string[] }}
 */
export function normalizeTags(tags, aliasMap) {
  const out = [];
  const seen = new Set();
  const aliased = [];
  const unknown = [];
  for (const raw of Array.isArray(tags) ? tags : []) {
    if (typeof raw !== 'string' || !raw) continue;
    const canonical = aliasMap.toCanonical.get(raw);
    const value = canonical ?? raw;
    if (canonical === undefined) unknown.push(raw);
    else if (canonical !== raw) aliased.push({ from: raw, to: canonical });
    if (!seen.has(value)) { seen.add(value); out.push(value); }
  }
  return { tags: out, aliased, unknown };
}

/** tags.json の class が structural / flag のタグか。 */
export function isStructuralTag(tag, aliasMap) {
  const c = aliasMap.classOf.get(aliasMap.toCanonical.get(tag) ?? tag);
  return c === 'structural' || c === 'flag';
}

/**
 * doc の category / group が語彙内かを判定する。
 * @param {{category?:string, group?:string}} doc
 * @param {Map<string,{area:string, groups:string[]}>} categoryMap  slug → categories.json entry
 * @param {Record<string,object>} groupDefs  content-taxonomy.json の groups
 * @returns {Array<{rule:string, msg:string}>}
 */
export function checkGroupAllowed(doc, categoryMap, groupDefs) {
  const v = [];
  const cat = categoryMap.get(doc.category);
  if (!cat) { v.push({ rule: 'doc-category-unknown', msg: `category「${doc.category ?? '(なし)'}」は categories.json に無い` }); return v; }
  if (!doc.group) { v.push({ rule: 'doc-group-missing', msg: 'group が無い' }); return v; }
  if (!groupDefs[doc.group]) { v.push({ rule: 'doc-group-unknown', msg: `group「${doc.group}」は語彙外` }); return v; }
  if (!cat.groups.includes(doc.group)) {
    v.push({ rule: 'doc-group-not-allowed', msg: `group「${doc.group}」は ${doc.category} で許可されていない（許可: ${cat.groups.join('/')}）` });
  }
  return v;
}

/**
 * 構造タグ × group の整合。structural/flag class のタグは、その group の structuralTags か flags に無ければ不整合。
 * @returns {string[]} 不整合タグ
 */
export function checkStructuralTags(doc, aliasMap, groupDefs, flags) {
  const def = groupDefs[doc.group];
  if (!def) return [];
  const allowed = new Set(def.structuralTags ?? []);
  const bad = [];
  for (const tag of doc.tags ?? []) {
    if (!isStructuralTag(tag, aliasMap)) continue;
    const canonical = aliasMap.toCanonical.get(tag) ?? tag;
    if (flags && flags[canonical]) {
      const req = flags[canonical].requiresGroup;
      if (req && req !== doc.group) bad.push(canonical);
      continue;
    }
    if (!allowed.has(canonical)) bad.push(canonical);
  }
  return bad;
}

/** 集合ラチェット: baseline に無い新規は increased、baseline にあって current に無いものは repaid。 */
export function evaluateSetRatchet(current, baseline) {
  const b = new Set(baseline ?? []);
  const c = new Set(current ?? []);
  return {
    increased: [...c].filter((x) => !b.has(x)).sort(),
    repaid: [...b].filter((x) => !c.has(x)).sort(),
  };
}

/** 件数ラチェット: baseline より増えたキーは increased、減ったキーは repaid（0 になったものも含む）。 */
export function evaluateCountRatchet(current, baseline) {
  const increased = [];
  const repaid = [];
  const keys = new Set([...Object.keys(current ?? {}), ...Object.keys(baseline ?? {})]);
  for (const k of keys) {
    const c = current?.[k] ?? 0;
    const b = baseline?.[k] ?? 0;
    if (c > b) increased.push({ key: k, from: b, to: c });
    else if (c < b) repaid.push({ key: k, from: b, to: c });
  }
  increased.sort((a, b) => a.key.localeCompare(b.key));
  repaid.sort((a, b) => a.key.localeCompare(b.key));
  return { increased, repaid };
}

/**
 * topic の三方向（exam / practice / standards）の件数。
 * @param {object} topic topics.json の 1 件
 * @param {Array<{slug:string, category:string, tags:string[], topics?:string[], published?:boolean}>} docs canonical 化済み
 * @param {Map<string,{area:string}>} categoryMap
 * @param {Array<{agencyId:string, documentId:string, title:string}>} standardDocs
 */
export function countTopicDirections(topic, docs, categoryMap, standardDocs) {
  const tags = new Set(topic.tags ?? []);
  const cats = new Set(topic.categories ?? []);
  let exam = 0; let practice = 0; let explicit = 0; let byTag = 0;
  for (const d of docs) {
    if (d.published === false) continue;
    const isExplicit = Array.isArray(d.topics) && d.topics.includes(topic.slug);
    const isTag = cats.has(d.category) || (d.tags ?? []).some((t) => tags.has(t));
    if (!isExplicit && !isTag) continue;
    if (isExplicit) explicit += 1; else byTag += 1;
    const area = categoryMap.get(d.category)?.area ?? 'exam';
    if (area === 'practice') practice += 1; else exam += 1;
  }
  const refs = new Set(topic.featuredStandardRefs ?? []);
  const kws = topic.standardKeywords ?? [];
  let standards = 0;
  for (const s of standardDocs ?? []) {
    const ref = `${s.agencyId}/${s.documentId}`;
    if (refs.has(ref) || kws.some((k) => k && String(s.title ?? '').includes(k))) standards += 1;
  }
  return { exam, practice, standards, explicit, byTag };
}

/**
 * frontmatter 内の `tags:` だけを書き換える。YAML を再シリアライズしない。
 * - block list（`  - "primary"` / `- guide`）と flow list（`tags: [a, b]`）に対応
 * - 各要素の引用符・インデントは元のまま。mapTag(raw) が null を返した要素は削除、重複は除去
 * - CRLF は呼び出し側（mdx-io）が扱うので、ここは LF 正規化済みテキストを前提にしてもよいが、
 *   行末 `\r` が付いていても壊さないよう各行の末尾 `\r` は保持する
 * @param {string} raw MDX 全文
 * @param {(tag:string)=>string|null} mapTag
 * @returns {{ text: string, changed: boolean, changes: Array<{from:string,to:string|null}> }}
 */
export function rewriteFrontmatterTags(raw, mapTag) {
  const lines = raw.split('\n');
  if (lines[0]?.replace(/\r$/, '') !== '---') return { text: raw, changed: false, changes: [] };
  let end = -1;
  for (let i = 1; i < lines.length; i++) { if (lines[i].replace(/\r$/, '') === '---') { end = i; break; } }
  if (end < 0) return { text: raw, changed: false, changes: [] };
  const changes = [];
  const unquote = (s) => s.replace(/^(['"])(.*)\1$/, '$2');
  const requote = (orig, val) => { const m = orig.match(/^(['"])/); return m ? `${m[1]}${val}${m[1]}` : val; };
  for (let i = 1; i < end; i++) {
    const cr = lines[i].endsWith('\r') ? '\r' : '';
    const line = cr ? lines[i].slice(0, -1) : lines[i];
    const flow = line.match(/^(tags:\s*)\[(.*)\](\s*)$/);
    if (flow) {
      const items = flow[2].split(',').map((s) => s.trim()).filter(Boolean);
      const seen = new Set(); const kept = [];
      for (const it of items) {
        const val = unquote(it); const to = mapTag(val);
        if (to !== val) changes.push({ from: val, to });
        if (to === null || seen.has(to)) continue;
        seen.add(to); kept.push(requote(it, to));
      }
      lines[i] = `${flow[1]}[${kept.join(', ')}]${flow[3]}${cr}`;
      continue;
    }
    if (!/^tags:\s*$/.test(line)) continue;
    // block list
    let j = i + 1; const seen = new Set(); const out = [];
    while (j < end) {
      const cr2 = lines[j].endsWith('\r') ? '\r' : '';
      const l2 = cr2 ? lines[j].slice(0, -1) : lines[j];
      const m = l2.match(/^(\s*-\s+)(.*?)\s*$/);
      if (!m) break;
      const val = unquote(m[2]); const to = mapTag(val);
      if (to !== val) changes.push({ from: val, to });
      if (to !== null && !seen.has(to)) { seen.add(to); out.push(`${m[1]}${requote(m[2], to)}${cr2}`); }
      j++;
    }
    const removed = j - (i + 1);
    lines.splice(i + 1, removed, ...out);
    end += out.length - removed;
    i += out.length;
  }
  const text = lines.join('\n');
  return { text, changed: text !== raw, changes };
}

/** doc-classifier.ts の GROUP_FIELD_MAP と content-routes.ts の GROUP_SEGMENT との対応表を groups から作る。 */
export function groupToDocGroupKey(groupDefs) {
  return Object.fromEntries(Object.entries(groupDefs).map(([id, d]) => [id, d.docGroupKey]));
}
