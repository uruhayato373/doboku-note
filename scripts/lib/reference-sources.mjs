/**
 * reference-sources.mjs — 参考文献（原本・一次資料）の台帳と、その使い方の判定。
 *
 * 置き場（誰が使うか）は drive-vault.mjs / asset-storage.mjs が持つ。こちらは**中身の扱い**
 * ＝「この原本を逐語で写してよいか」「図を流用してよいか」「文字起こしを公開してよいか」
 * 「記事はどの粒度で出典を書くか」を class で決め、記事 frontmatter の `sources:` を id で結ぶ。
 *
 * 設定: .claude/config/reference-sources.json / 本文: reference-sources-policy.md
 *
 * 設計の芯:
 *   1. **記事は書名でなく id で指す。** 書名は版・表記が揺れる（「主任技師」「主任技士」）。
 *      揺れは aliases に閉じ込め、移行の案内にだけ使う。
 *   2. **class が許さない使い方は機械で止める。** 逐語の判定は「文字起こしと記事の共通部分」を
 *      正規化して測る（表記の細部でなく、写したかどうかを見る）。
 *   3. **原本を持たない一次資料も台帳に載せる。** 法令・JIS は条番号を id#detail で付ける。
 *      「数値はスキャン教材でなく一次資料で取り直す」を機械で言えるようにするため。
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './repository-paths.mjs';

export const REFERENCE_SOURCES_PATH = join(REPO_ROOT, '.claude/config/reference-sources.json');
export const REFERENCE_BASELINE_PATH = join(REPO_ROOT, '.claude/config/reference-sources-baseline.json');
export const STANDARDS_CATALOG_PATH = join(REPO_ROOT, 'content/site/standards-library/catalog.json');

export const VERBATIM_RULES = ['allowed', 'question-only', 'short-quote', 'forbidden'];
export const CITATION_RULES = ['page', 'title-url', 'section', 'title', 'name'];
export const ORIGIN_KINDS = ['drive', 'catalog', 'external', 'none'];

/** id 本体と、その後ろの詳細（条番号・規格番号）を分ける。`labor-safety-rules#第240条` → ['labor-safety-rules', '第240条'] */
export function splitSourceRef(ref) {
  const s = String(ref ?? '').trim();
  const i = s.indexOf('#');
  return i < 0 ? { id: s, detail: null } : { id: s.slice(0, i).trim(), detail: s.slice(i + 1).trim() || null };
}

export function loadReferenceSources(path = REFERENCE_SOURCES_PATH) {
  if (!existsSync(path)) throw new Error('reference-sources: 設定が無い（' + path + '）。検査不成立。');
  let cfg;
  try { cfg = JSON.parse(readFileSync(path, 'utf-8')); }
  catch (e) { throw new Error('reference-sources: 設定が壊れている（' + path + '）: ' + e.message); }
  if (!cfg.classes || typeof cfg.classes !== 'object') throw new Error('reference-sources: classes が無い');
  if (!Array.isArray(cfg.sources) || cfg.sources.length === 0) throw new Error('reference-sources: sources が空。検査不成立。');

  for (const [name, c] of Object.entries(cfg.classes)) {
    if (!VERBATIM_RULES.includes(c.verbatim)) throw new Error('reference-sources: class ' + name + ' の verbatim "' + c.verbatim + '" は未知');
    if (!CITATION_RULES.includes(c.citation)) throw new Error('reference-sources: class ' + name + ' の citation "' + c.citation + '" は未知');
    if (typeof c.figureReuse !== 'boolean') throw new Error('reference-sources: class ' + name + ' の figureReuse は真偽値');
    if (!(typeof c.transcriptPublic === 'boolean' || c.transcriptPublic === null)) throw new Error('reference-sources: class ' + name + ' の transcriptPublic は真偽値か null');
    if (!c.label || !c.note) throw new Error('reference-sources: class ' + name + ' に label と note が要る');
  }

  const ids = new Set();
  const aliasOwner = new Map();
  for (const s of cfg.sources) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(s.id || '')) throw new Error('reference-sources: id "' + s.id + '" は kebab-case で書く');
    if (ids.has(s.id)) throw new Error('reference-sources: id が重複: ' + s.id);
    ids.add(s.id);
    if (!s.title) throw new Error('reference-sources: ' + s.id + ' に title が無い');
    if (!cfg.classes[s.class]) throw new Error('reference-sources: ' + s.id + ' の class "' + s.class + '" が classes に無い');
    const kind = s.origin?.kind;
    if (!ORIGIN_KINDS.includes(kind)) throw new Error('reference-sources: ' + s.id + ' の origin.kind "' + kind + '" は未知');
    if (kind === 'drive' && !s.origin.vaultDir) throw new Error('reference-sources: ' + s.id + ' は origin.kind=drive なので vaultDir が要る');
    if (kind === 'catalog' && !s.origin.catalog) throw new Error('reference-sources: ' + s.id + ' は origin.kind=catalog なので catalog が要る');
    if (s.transcriptDir && !s.transcriptDir.startsWith('content/sources/')) throw new Error('reference-sources: ' + s.id + ' の transcriptDir は content/sources/ 配下（repo 相対）で書く');
    // aliases は「移行前の書名 → 正しい参照」の表。値は id か id#詳細、公的基準だけ std:… も許す。
    if (s.aliases !== undefined && (typeof s.aliases !== 'object' || Array.isArray(s.aliases))) {
      throw new Error('reference-sources: ' + s.id + ' の aliases は { 旧表記: 正しい参照 } のオブジェクトで書く');
    }
    for (const [a, to] of Object.entries(s.aliases || {})) {
      if (aliasOwner.has(a)) throw new Error('reference-sources: alias "' + a + '" が ' + aliasOwner.get(a) + ' と ' + s.id + ' で重複');
      if (ids.has(a)) throw new Error('reference-sources: alias "' + a + '" が id と衝突');
      const head = splitSourceRef(to).id;
      if (head !== s.id && !(s.origin?.kind === 'catalog' && head.startsWith('std:'))) {
        throw new Error('reference-sources: ' + s.id + ' の alias "' + a + '" が別の id "' + head + '" を指している');
      }
      aliasOwner.set(a, to);
    }
    for (const g of s.appliesTo || []) {
      if (!g.startsWith('content/')) throw new Error('reference-sources: ' + s.id + ' の appliesTo "' + g + '" は content/ 配下で書く');
    }
  }
  return cfg;
}

/** catalog.json の documents を std:{agencyId}/{documentId} という擬似 id へ展開する（公的基準は 72 文書あり手書きしない）。 */
export function expandCatalogSources(cfg, catalog) {
  const holder = cfg.sources.find((s) => s.origin?.kind === 'catalog');
  if (!holder || !catalog?.documents) return [];
  return catalog.documents.map((d) => ({
    id: 'std:' + d.agencyId + '/' + d.documentId,
    title: (d.agencyName ? d.agencyName + ' ' : '') + d.title,
    class: holder.class,
    origin: { kind: 'catalog', sourceSha256: d.sourceSha256, sourceUrl: d.sourceUrl },
    derivedFrom: holder.id,
  }));
}

/** 台帳（＋catalog 展開）を id と alias で引ける索引にする。 */
export function buildSourceIndex(cfg, { catalog = null } = {}) {
  const byId = new Map();
  const byAlias = new Map();
  for (const s of cfg.sources) {
    byId.set(s.id, s);
    for (const [a, to] of Object.entries(s.aliases || {})) byAlias.set(a, to);
  }
  for (const s of expandCatalogSources(cfg, catalog)) byId.set(s.id, s);
  return { byId, byAlias, classes: cfg.classes };
}

/** 記事に書かれた文字列を台帳の id へ解決する。id そのもの・id#詳細・alias（＝移行前の書名）を受ける。 */
export function resolveSourceRef(ref, index) {
  const { id, detail } = splitSourceRef(ref);
  if (index.byId.has(id)) return { ok: true, id, detail, ref: String(ref).trim(), source: index.byId.get(id), suggest: null };
  // 旧表記（移行前の書名）。**解決はするが ok にしない**——記事側を正しい参照へ直させる。
  const hit = index.byAlias.get(String(ref).trim()) ?? index.byAlias.get(id);
  if (hit) {
    const head = splitSourceRef(hit).id;
    return { ok: false, id: head, detail: splitSourceRef(hit).detail ?? detail, ref: String(ref).trim(), source: index.byId.get(head) ?? null, suggest: hit };
  }
  return { ok: false, id: null, detail, ref: String(ref).trim(), source: null, suggest: null };
}

export function classRuleOf(source, index) {
  return source ? index.classes[source.class] || null : null;
}

// 単純 glob（`content/site/x/<star>/article.mdx` の形）を正規表現にする。* は / を跨がず、** は跨ぐ。
// ここを JSDoc ブロックにしない: glob 例に含まれる `*` と `/` の並びがブロックコメントを閉じてしまう。
export function globToRegExp(glob) {
  let out = '^';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') { out += '.*'; i++; if (glob[i + 1] === '/') i++; }
      else out += '[^/]*';
    } else out += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(out + '$');
}

/** その記事パスに sources を必須にする原本を返す（appliesTo に一致するもの）。 */
export function sourcesRequiringArticle(relPath, cfg) {
  const p = String(relPath).split('\\').join('/');
  return (cfg.sources || []).filter((s) => (s.appliesTo || []).some((g) => globToRegExp(g).test(p)));
}

// ------------------------------------------------------------------ 逐語の判定

/**
 * 比較用の正規化。**表記の細部でなく「写したかどうか」を見る**ので、
 * 空白・記号・markdown の装飾・全角半角の違いを落とす。日本語は分かち書きしないので文字単位で足りる。
 */
export function normalizeForCompare(text) {
  return String(text)
    .normalize('NFKC')
    .replace(/```[\s\S]*?```/g, '')            // コードブロック（表の原文レイアウト等）は対象外
    .replace(/<!--[\s\S]*?-->/g, '')           // ページ境界コメント
    .replace(/https?:\/\/\S+/g, '')            // URL
    .replace(/[\s\u3000]+/g, '')
    .replace(/[!-/:-@[-`{-~、。「」『』（）〔〕・…―ー−—’”“‘§¶※→←↑↓]/g, '');
}

/**
 * 文字起こし側の索引。共通部分の探索を O(記事長) にするため、種となる短い窓を一定間隔で拾う。
 * seed=20 / stride=10 なら、長さ 30 以上の共通部分は必ずどれかの種を丸ごと含む（20+10-1=29 < 30）。
 * 種が当たった箇所だけ左右へ伸ばして実際の一致長を測るので、閾値は minRun 側で決められる。
 */
export function buildTranscriptIndex(entries, { seed = 20, stride = 10 } = {}) {
  const docs = [];
  const seeds = new Map();
  for (const e of entries) {
    const text = normalizeForCompare(e.text);
    const di = docs.length;
    docs.push({ key: e.key, source: e.source ?? null, text });
    for (let i = 0; i + seed <= text.length; i += stride) {
      const k = text.slice(i, i + seed);
      const at = seeds.get(k);
      if (at === undefined) seeds.set(k, [di, i]);
    }
  }
  return { docs, seeds, seed, stride };
}

/**
 * 記事本文と索引の共通部分のうち minRun 文字以上のものを返す（最長のものから）。
 * 1 件でも出れば逐語＝class が forbidden の原本では公開してはいけない。
 */
export function findVerbatimRuns(articleText, index, { minRun = 40, maxHits = 20 } = {}) {
  const a = normalizeForCompare(articleText);
  const { seed, stride } = index;
  const hits = [];
  let i = 0;
  while (i + seed <= a.length) {
    const at = index.seeds.get(a.slice(i, i + seed));
    if (!at) { i += 1; continue; }
    const [di, tpos] = at;
    const t = index.docs[di].text;
    let s = 0;
    while (i - s > 0 && tpos - s > 0 && a[i - s - 1] === t[tpos - s - 1]) s++;
    let e = seed;
    while (i + e < a.length && tpos + e < t.length && a[i + e] === t[tpos + e]) e++;
    const run = s + e;
    if (run >= minRun) {
      hits.push({ key: index.docs[di].key, source: index.docs[di].source, run, sample: t.slice(tpos - s, tpos - s + Math.min(run, 60)) });
      i = i + e;               // 同じ塊を何度も報告しない
      if (hits.length >= maxHits) break;
    } else {
      i += Math.max(1, stride);
    }
  }
  return hits.sort((x, y) => y.run - x.run);
}

// ------------------------------------------------------------------ 文字起こしの見出し

const LEGACY_RE = /^>\s*出典:\s*(.+)$/m;
// 「135-141」「278-279〜290-291」「p.106–219」のように範囲が連なる書き方をまとめて拾う。
const PAGE_RANGE = '([0-9](?:[0-9\\-–〜~]*[0-9])?)';
const PDF_PAGES_RE = new RegExp('PDF\\s*p\\.?\\s*' + PAGE_RANGE);
const PRINTED_PAGES_RE = new RegExp('(?:本ノンブル|原本)\\s*(?:約)?\\s*p?\\.?\\s*' + PAGE_RANGE);

/**
 * 文字起こし .md の来歴を読む。新形式は YAML frontmatter、旧形式は本文冒頭の `> 出典:` 行。
 * どちらも無ければ `{ kind: 'none' }`（＝人が埋める対象）。gray-matter を使わないのは
 * pre-commit の軽い経路からも呼ぶため（frontmatter は単純な key: value しか持たない）。
 */
export function parseTranscriptHeader(md) {
  const text = String(md);
  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---', 3);
    if (end > 0) {
      const body = text.slice(4, end);
      const fm = {};
      let listKey = null;
      for (const raw of body.split('\n')) {
        const line = raw.replace(/\s+$/, '');
        const item = /^\s+-\s+(.*)$/.exec(line);
        if (item && listKey) { fm[listKey].push(item[1].replace(/^["']|["']$/g, '')); continue; }
        const kv = /^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
        if (!kv) continue;
        const [, k, v] = kv;
        if (v === '') { listKey = k; fm[k] = []; } else { listKey = null; fm[k] = v.replace(/^["']|["']$/g, ''); }
      }
      return { kind: 'frontmatter', ...fm };
    }
  }
  const m = LEGACY_RE.exec(text);
  if (m) {
    const line = m[1];
    return {
      kind: 'legacy',
      raw: line,
      // ファイル名に空白を含むことがある（`スキャンした書類 2.pdf`）。バッククォート囲みを先に見る。
      pdfFile: (/`([^`]+\.pdf)`/i.exec(line) || /([^\s（(`]+\.pdf)/i.exec(line) || [])[1] || null,
      pdfPages: (PDF_PAGES_RE.exec(line) || [])[1]?.replace(/\s+/g, '') || null,
      printedPages: (PRINTED_PAGES_RE.exec(line) || [])[1]?.replace(/\s+/g, '') || null,
    };
  }
  return { kind: 'none' };
}

export function loadReferenceBaseline(path = REFERENCE_BASELINE_PATH) {
  if (!existsSync(path)) return { version: 1, description: '', missingSources: [] };
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return { version: 1, description: '', missingSources: [] }; }
}

export function loadStandardsCatalog(path = STANDARDS_CATALOG_PATH) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}
