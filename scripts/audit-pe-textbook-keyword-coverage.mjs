#!/usr/bin/env node
/**
 * audit-pe-textbook-keyword-coverage.mjs
 *
 * 総監標準テキスト5管理（content/sources/textbook/技術士（総監）/テキスト/総監標準テキスト/）の
 * H3・H4 概念見出しを、公開ハブ（keyword-2026）＋個別キーワードページ＋設定
 * （pe-chapters.json / doc-meta-index.json）と機械照合し、A〜G 意味判定の入力となる
 * 候補データ（candidates JSON）を生成する。
 *
 * 【この script がやること = 機械層のみ】
 *   - 標準テキストから H2（構造見出し）を別出力、H3・H4 を概念候補として抽出
 *   - 番号・記号・括弧を除いた正規化表記／日本語別名／英語名／略称／法通称の候補生成
 *   - 公開ページ pool（slug / title / shortTitle / description / section / 本文 H2・H3）を構築
 *   - 正規化一致・包含一致・別名一致・ハブリンク一致・ハブ補助語一致を判定
 *   - リンク実在確認（doc-meta published）／phantom slug／重複 slug／ハブ掲載漏れ／cross-area 一致
 *   - 機械的な暫定ヒント（statusHint）は付けるが **確定判定 A〜G ではない**
 *
 * 【この script がやらないこと = Evaluator 層】
 *   - A〜G の意味判定、独立ページ化の是非、内包の十分性、優先度、修正方針
 *
 * 決定的（同じ入力→同じ出力）。read-only（記事・設定を一切変更しない）。
 *
 * Usage:
 *   node scripts/audit-pe-textbook-keyword-coverage.mjs
 *   node scripts/audit-pe-textbook-keyword-coverage.mjs \
 *     --json .claude/state/pe-textbook-keyword-coverage-candidates.json
 *   node scripts/audit-pe-textbook-keyword-coverage.mjs --stamp 2026-07-24T00:00:00Z
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- CLI ------------------------------------------------------------------
const argv = process.argv.slice(2);
function argVal(name, def) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const OUT_JSON = argVal(
  '--json',
  path.join(ROOT, '.claude/state/pe-textbook-keyword-coverage-candidates.json'),
);
const STAMP = argVal('--stamp', null); // ISO string; omitted → generatedAt:null（決定性のため）

// ---- paths ----------------------------------------------------------------
const TEXTBOOK_DIR = path.join(ROOT, 'content/sources/textbook/技術士（総監）/テキスト/総監標準テキスト');
const MANAGEMENT_FILES = [
  { area: '経済性管理', file: '経済性管理.md' },
  { area: '人的資源管理', file: '人的資源管理.md' },
  { area: '情報管理', file: '情報管理.md' },
  { area: '安全管理', file: '安全管理.md' },
  { area: '社会環境管理', file: '社会環境管理.md' },
];
const HUB_PATH = path.join(
  ROOT,
  'content/site/pe-comprehensive-management/keyword-2026/article.mdx',
);
const PE_POSTS_DIR = path.join(ROOT, 'content/site/pe-comprehensive-management');
const PE_CHAPTERS = path.join(ROOT, 'src/config/pe-chapters.json');
const DOC_META = path.join(ROOT, 'src/config/doc-meta-index.json');

function readFileOrDie(p, label) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    console.error(`ERROR: ${label} を読めません: ${p}\n  原因: ${e.message}`);
    process.exit(1);
  }
}

// ---- normalization --------------------------------------------------------
// 番号・記号（列挙子）を先頭から剥がす。半角/全角の (1)（1）(a)（a）1. １． ① ⅰ. 等。
function stripEnumerator(text) {
  let s = text.trim();
  // 先頭の括弧列挙子 (1)（1）(a)（ａ）
  s = s.replace(/^[（(][0-9０-９a-zａ-ｚA-ZＡ-Ｚ]{1,3}[）)]\s*/u, '');
  // 先頭の 数字/ローマ数字 + 区切り  "1." "１．" "ⅰ)" "iii."
  s = s.replace(/^[0-9０-９]{1,3}[.．、）)]\s*/u, '');
  s = s.replace(/^[ⅰ-ⅹ]{1,4}[.．)）]?\s*/u, '');
  // 丸数字 ①〜⑳
  s = s.replace(/^[①-⑳]\s*/u, '');
  return s.trim();
}

// 照合キー化: NFKC → 小文字 → 空白・中黒・ハイフン・引用符・末尾句読点を除去
function normKey(s) {
  if (!s) return '';
  let k = s.normalize('NFKC').toLowerCase();
  k = k.replace(/[\s　・･\-–—‐_、,.。／/「」『』【】\[\]()（）〔〕"'`]/g, '');
  return k;
}

// 見出しラベルから別名を抽出する。
// 例: 正味現在価値法〔NPV（Net Present Value）法〕 → main:正味現在価値法, aliases:[NPV, Net Present Value ...]
//     廃棄物の処理及び清掃に関する法律(廃棄物処理法) → main:正式名, aliases:[廃棄物処理法]
//     サプライチェーンマネジメント（SCM） → main, aliases:[SCM]
function extractAliases(label) {
  const aliases = new Set();
  let main = label;
  // 〔...〕 ［...］ ｟...｠ は英語補足・別名を入れることが多い
  const bracketRe = /[〔［{｟]([^〔〕［］{}｟｠]+)[〕］}｠]/gu;
  let m;
  while ((m = bracketRe.exec(label)) !== null) {
    const inner = m[1].trim();
    if (inner) aliases.add(inner);
  }
  // 末尾/中間の （...） (...) は通称・略称・英語のことが多い
  const parenRe = /[（(]([^（）()]+)[）)]/gu;
  while ((m = parenRe.exec(label)) !== null) {
    const inner = m[1].trim();
    if (inner) aliases.add(inner);
  }
  // main = 最初の括弧より前
  const firstParen = label.search(/[（(〔［]/u);
  if (firstParen > 0) main = label.slice(0, firstParen).trim();
  main = main.replace(/法$/, '法'); // no-op、可読性

  // aliases 内のネスト（英語括弧内の日本語等）はそのまま個別 alias 化される
  // 英語/略語 alias の抽出（ASCII 連続語）
  const englishTokens = new Set();
  for (const a of [label, ...aliases]) {
    const asc = a.match(/[A-Za-zＡ-Ｚａ-ｚ][A-Za-zＡ-Ｚａ-ｚ0-9&/ .-]{0,40}/gu);
    if (asc) asc.forEach((t) => englishTokens.add(t.normalize('NFKC').trim()));
  }
  return {
    main: main || label,
    aliases: [...aliases],
    englishTokens: [...englishTokens].filter((t) => /[A-Za-z]/.test(t)),
  };
}

// 構造見出し判定: H2 は常に構造。H3/H4 でも「国際的な条約」「リサイクル関連法」等の
// 上位グルーピング見出し（配下に個別項目 H4 が並ぶ）や、汎用的グループ語は
// 構造性が高いので statusHint の材料にする（確定は Evaluator）。
const STRUCTURE_HINT_RE =
  /(の種類|の分類|の体系|の手続|関連法|各段階|の各|の原則|とは|の概要|の流れ|マップ|一覧|の指標|の要素|の方法$|の管理$)/u;

// ---- 1. textbook 概念抽出 --------------------------------------------------
const structureHeadings = []; // H2 と構造性 H3
const concepts = []; // H3/H4 概念候補
let conceptSeq = 0;

const inputContents = [];

for (const { area, file } of MANAGEMENT_FILES) {
  const p = path.join(TEXTBOOK_DIR, file);
  const raw = readFileOrDie(p, `標準テキスト(${area})`);
  inputContents.push(raw);
  const relFile = path.relative(ROOT, p);
  const lines = raw.split(/\r?\n/);
  // 直近の H2/H3 パンくずを保持
  let curH2 = null;
  let curH3 = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hm = /^(#{2,4})\s+(.*\S)\s*$/.exec(line);
    if (!hm) continue;
    const level = hm[1].length;
    const rawLabel = hm[2].trim();
    const lineNo = i + 1;
    const stripped = stripEnumerator(rawLabel);
    if (level === 2) {
      curH2 = { rawLabel, stripped, line: lineNo };
      curH3 = null;
      structureHeadings.push({
        area,
        sourceFile: relFile,
        line: lineNo,
        headingLevel: 2,
        textbookLabel: rawLabel,
        normalizedLabel: stripped,
        role: 'chapter/section 構造見出し',
      });
      continue;
    }
    // level 3 or 4 = 概念候補
    const { main, aliases, englishTokens } = extractAliases(stripped);
    const id = `${area}-${String(++conceptSeq).padStart(3, '0')}`;
    const breadcrumb = [curH2 ? curH2.stripped : null, level === 4 ? (curH3 ? curH3.stripped : null) : null]
      .filter(Boolean)
      .join(' / ');
    const rec = {
      id,
      management: area,
      sourceFile: relFile,
      line: lineNo,
      headingLevel: level,
      breadcrumb,
      textbookLabel: rawLabel,
      normalizedLabel: stripped,
      mainLabel: main,
      aliases,
      englishTokens,
      structureLike: STRUCTURE_HINT_RE.test(stripped),
    };
    concepts.push(rec);
    if (level === 3) curH3 = { rawLabel, stripped, line: lineNo };
  }
}

// ---- 2. 公開ページ pool ----------------------------------------------------
inputContents.push(readFileOrDie(PE_CHAPTERS, 'pe-chapters.json'));
inputContents.push(readFileOrDie(DOC_META, 'doc-meta-index.json'));
const chapters = JSON.parse(fs.readFileSync(PE_CHAPTERS, 'utf8'));
const docMeta = JSON.parse(fs.readFileSync(DOC_META, 'utf8')).docs;

// slug → {title, section, chapter} （設定上の登録）
const chapterBySlug = new Map();
const slugSectionCounts = new Map(); // slug → Set(section) で重複検出
for (const c of chapters.chapters) {
  for (const s of c.sections) {
    for (const k of s.keywords) {
      if (!chapterBySlug.has(k.slug)) {
        chapterBySlug.set(k.slug, { title: k.title, section: s.id, chapter: c.title });
      }
      if (!slugSectionCounts.has(k.slug)) slugSectionCounts.set(k.slug, new Set());
      slugSectionCounts.get(k.slug).add(s.id);
    }
  }
}

// doc-meta の pe keyword ページ（published）
const PREFIX = 'pe-comprehensive-management-';
const metaBySlug = new Map(); // bare slug → meta
for (const fullKey of Object.keys(docMeta)) {
  if (!fullKey.startsWith(PREFIX)) continue;
  const bare = fullKey.slice(PREFIX.length);
  metaBySlug.set(bare, docMeta[fullKey]);
}

// 記事本文の H2/H3 索引（body heading → slug 群）＋ 各ページの見出し保持
function stripFrontmatter(txt) {
  if (txt.startsWith('---')) {
    const end = txt.indexOf('\n---', 3);
    if (end >= 0) return txt.slice(end + 4);
  }
  return txt;
}
const bodyHeadingIndex = new Map(); // normKey(heading) → Set(slug)
const pageHeadings = new Map(); // slug → [h2/h3 text]
let articleDirs = [];
try {
  articleDirs = fs
    .readdirSync(PE_POSTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
} catch (e) {
  console.error(`ERROR: 記事ディレクトリを読めません: ${PE_POSTS_DIR}\n  ${e.message}`);
  process.exit(1);
}
const dirSet = new Set(articleDirs);
for (const slug of articleDirs) {
  const meta = metaBySlug.get(slug);
  // keyword グループ（またはハブ以外）のみ索引対象。過去問・guide も内包先になり得るので含める
  const ap = path.join(PE_POSTS_DIR, slug, 'article.mdx');
  let body;
  try {
    body = stripFrontmatter(fs.readFileSync(ap, 'utf8'));
  } catch {
    continue;
  }
  const hs = [];
  for (const line of body.split(/\r?\n/)) {
    const hm = /^(#{2,3})\s+(.*\S)\s*$/.exec(line);
    if (!hm) continue;
    const t = hm[2].trim();
    hs.push(t);
    const nk = normKey(t);
    if (nk.length >= 2) {
      if (!bodyHeadingIndex.has(nk)) bodyHeadingIndex.set(nk, new Set());
      bodyHeadingIndex.get(nk).add(slug);
    }
  }
  pageHeadings.set(slug, hs);
}

// ページ照合トークン索引: exactKey → Set(slug)
// title / shortTitle / title の別名 / slug 由来英語トークン を登録
const titleKeyIndex = new Map(); // normKey → Set(slug)
const englishSlugTokens = new Map(); // english token(lower) → Set(slug)
function addTitleKey(nk, slug) {
  if (!nk || nk.length < 2) return;
  if (!titleKeyIndex.has(nk)) titleKeyIndex.set(nk, new Set());
  titleKeyIndex.get(nk).add(slug);
}
// 全 published pe keyword ページを走査
const pagePool = {};
for (const [slug, meta] of metaBySlug.entries()) {
  if (!meta.published) continue;
  const title = meta.title || (chapterBySlug.get(slug) || {}).title || slug;
  const shortTitle = meta.shortTitle || null;
  pagePool[slug] = {
    title,
    shortTitle,
    description: meta.description || null,
    section: meta.section || (chapterBySlug.get(slug) || {}).section || null,
    group: meta.group || null,
    headings: pageHeadings.get(slug) || [],
  };
  // title 別名展開
  const { main, aliases } = extractAliases(title);
  addTitleKey(normKey(title), slug);
  addTitleKey(normKey(main), slug);
  for (const a of aliases) addTitleKey(normKey(a), slug);
  if (shortTitle) addTitleKey(normKey(shortTitle), slug);
  // slug 英語トークン
  for (const tok of slug.split('-')) {
    if (tok.length >= 2 && /[a-z]/.test(tok)) {
      const key = tok.toLowerCase();
      if (!englishSlugTokens.has(key)) englishSlugTokens.set(key, new Set());
      englishSlugTokens.get(key).add(slug);
    }
  }
}

// ---- 3. ハブ抽出 -----------------------------------------------------------
const hubRaw = readFileOrDie(HUB_PATH, 'ハブ(keyword-2026)');
inputContents.push(hubRaw);
// 3-a. リンク: [label](/docs/pe-comprehensive-management-SLUG)
const hubLinkSlugs = new Set();
const hubLinkLabelBySlug = new Map();
const hubLinkKeySet = new Set(); // normKey(label)
{
  const re = /\[([^\]]+)\]\(\/docs\/pe-comprehensive-management-([a-z0-9-]+)\)/g;
  let m;
  while ((m = re.exec(hubRaw)) !== null) {
    const label = m[1].trim();
    const slug = m[2];
    hubLinkSlugs.add(slug);
    if (!hubLinkLabelBySlug.has(slug)) hubLinkLabelBySlug.set(slug, label);
    hubLinkKeySet.add(normKey(label));
  }
}
// 3-b. 補助語: 太字 **term** でリンクでないもの
const hubAuxTerms = new Set();
const hubAuxKeySet = new Set();
{
  const re = /\*\*([^*]+)\*\*/g;
  let m;
  while ((m = re.exec(hubRaw)) !== null) {
    const t = m[1].trim();
    // 「使い方 Callout」等の説明文・長い文は補助語ではない
    if (!t || t.length > 30) continue;
    if (/[。、：:]/.test(t)) continue;
    hubAuxTerms.add(t);
    hubAuxKeySet.add(normKey(t));
  }
}
// 3-c. プレーンテキスト（補助語の包含検索用）
const hubPlainKey = normKey(hubRaw);

// ---- 4. マッチング ---------------------------------------------------------
// 概念のトークン集合（normKey）
function conceptKeys(rec) {
  const keys = new Set();
  keys.add(normKey(rec.normalizedLabel));
  keys.add(normKey(rec.mainLabel));
  for (const a of rec.aliases) keys.add(normKey(a));
  keys.delete('');
  return [...keys];
}

for (const rec of concepts) {
  const keys = conceptKeys(rec);
  const engs = rec.englishTokens.map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, '')).filter((t) => t.length >= 2);

  const matchCandidates = []; // {slug, matchType, via}
  const seen = new Set();
  function pushMatch(slug, matchType, via) {
    const k = slug + '|' + matchType;
    if (seen.has(k)) return;
    seen.add(k);
    matchCandidates.push({ slug, matchType, via });
  }

  // 4-1 exact title/shortTitle/alias
  for (const key of keys) {
    if (titleKeyIndex.has(key)) {
      for (const slug of titleKeyIndex.get(key)) pushMatch(slug, 'exact-title', key);
    }
  }
  // 4-2 body heading exact
  for (const key of keys) {
    if (bodyHeadingIndex.has(key)) {
      for (const slug of bodyHeadingIndex.get(key)) pushMatch(slug, 'body-heading', key);
    }
  }
  // 4-3 english/abbrev token → slug english token
  for (const e of engs) {
    if (englishSlugTokens.has(e)) {
      for (const slug of englishSlugTokens.get(e)) pushMatch(slug, 'english-token', e);
    }
  }
  // 4-4 containment: 概念キー（>=3 文字）が ページ title key の部分文字列 / 逆
  const primaryKey = normKey(rec.normalizedLabel);
  if (primaryKey.length >= 3) {
    for (const [tkey, slugs] of titleKeyIndex.entries()) {
      if (tkey === primaryKey) continue;
      if (tkey.length >= 3 && (tkey.includes(primaryKey) || primaryKey.includes(tkey))) {
        // 過剰包含を避けるため短すぎるキーの相互包含は除外済み（>=3）
        for (const slug of slugs) pushMatch(slug, 'containment', tkey);
      }
    }
  }

  // ハブ状態
  const linkedInHub =
    matchCandidates.some((mc) => hubLinkSlugs.has(mc.slug)) ||
    keys.some((k) => hubLinkKeySet.has(k));
  const auxInHub =
    keys.some((k) => hubAuxKeySet.has(k)) ||
    (primaryKey.length >= 4 && hubAuxTerms.size && [...hubAuxKeySet].some((k) => k.includes(primaryKey)));
  // プレーンテキスト内包（補助語でなくても本文言及があるか）
  const mentionedInHub = primaryKey.length >= 4 && hubPlainKey.includes(primaryKey);

  // 代表マッチ slug（exact > body > english > containment の優先）
  const order = { 'exact-title': 0, 'body-heading': 1, 'english-token': 2, containment: 3 };
  matchCandidates.sort((a, b) => (order[a.matchType] ?? 9) - (order[b.matchType] ?? 9));
  const bestExact = matchCandidates.find((mc) => mc.matchType === 'exact-title' || mc.matchType === 'english-token');
  const bestBody = matchCandidates.find((mc) => mc.matchType === 'body-heading');
  const bestContain = matchCandidates.find((mc) => mc.matchType === 'containment');

  // 機械的ヒント（**確定ではない** — Evaluator が A〜G を決める）
  let statusHint = 'E?'; // 未反映候補（要 Evaluator）
  let hintReason = '';
  if (bestExact) {
    // 独立ページに正規化一致 → A（日本語名称一致）/ B（別名・略称・英語一致）候補
    const jaExact = bestExactIsJa(rec, bestExact);
    statusHint = jaExact ? 'A?' : 'B?';
    hintReason = `独立ページ ${bestExact.slug} に${
      bestExact.matchType === 'english-token' ? '英語/略称' : jaExact ? '名称' : '別名'
    }一致`;
  } else if (bestBody) {
    statusHint = 'C?';
    hintReason = `上位ページ ${bestBody.slug} の本文見出しに一致（内包の可能性）`;
  }
  if (statusHint === 'E?') {
    if (rec.structureLike) {
      statusHint = 'F?';
      hintReason = '構造/グルーピング見出しパターン';
    } else if (bestContain) {
      statusHint = 'C?';
      hintReason = `ページ ${bestContain.slug} title と包含関係（内包の可能性）`;
    } else if (linkedInHub) {
      statusHint = 'A?';
      hintReason = 'ハブでリンク済み';
    } else if (auxInHub || mentionedInHub) {
      statusHint = 'D?';
      hintReason = 'ハブ本文に補助語/言及あり（独立ページなし）';
    } else {
      statusHint = 'E?';
      hintReason = '独立ページ・別名ページ・ハブ言及いずれも機械検出できず';
    }
  }

  rec.match = {
    matchCandidates: matchCandidates.slice(0, 8),
    bestSlug: (bestExact || bestBody || bestContain || {}).slug || null,
    linkedInHub,
    auxInHub: !!auxInHub,
    mentionedInHub,
    statusHint,
    hintReason,
  };
}

// bestExact が日本語名称一致か（B? 判定補助）
function bestExactIsJa(rec, mc) {
  const jaKeys = new Set([normKey(rec.normalizedLabel), normKey(rec.mainLabel), ...rec.aliases.filter((a) => /[ぁ-んァ-ヶ一-龠]/.test(a)).map(normKey)]);
  return mc.matchType === 'exact-title' && jaKeys.has(mc.via);
}

// ---- 5. リンク健全性 -------------------------------------------------------
// phantom: ハブのリンク slug が published ページに無い
const phantomHubLinks = [];
for (const slug of hubLinkSlugs) {
  const meta = metaBySlug.get(slug);
  const existsDir = dirSet.has(slug);
  const published = meta && meta.published;
  if (!existsDir || !published) {
    phantomHubLinks.push({
      slug,
      label: hubLinkLabelBySlug.get(slug) || null,
      hasDir: existsDir,
      inDocMeta: !!meta,
      published: !!published,
    });
  }
}
// 重複 slug 候補: pe-chapters で複数 section に登場
const duplicateSlugs = [];
for (const [slug, sections] of slugSectionCounts.entries()) {
  if (sections.size > 1) duplicateSlugs.push({ slug, sections: [...sections] });
}
// pe-chapters に登録があるのに記事 dir が無い（phantom registry）
const registryPhantoms = [];
for (const slug of chapterBySlug.keys()) {
  if (!dirSet.has(slug)) registryPhantoms.push(slug);
}
// ハブ掲載漏れ: published keyword ページなのにハブからリンクされていない
const hubMissingLinks = [];
for (const [slug, meta] of metaBySlug.entries()) {
  if (!meta.published) continue;
  if ((meta.group || '') !== 'keyword') continue;
  if (!hubLinkSlugs.has(slug)) hubMissingLinks.push({ slug, title: meta.title || null });
}

// ---- 6. cross-area 一致（同じ概念が複数管理に登場）--------------------------
const byNormKey = new Map();
for (const rec of concepts) {
  const nk = normKey(rec.normalizedLabel);
  if (!nk) continue;
  if (!byNormKey.has(nk)) byNormKey.set(nk, []);
  byNormKey.get(nk).push(rec);
}
const crossAreaConcepts = [];
for (const [nk, recs] of byNormKey.entries()) {
  const areas = new Set(recs.map((r) => r.management));
  if (areas.size > 1) {
    crossAreaConcepts.push({
      normalizedLabel: recs[0].normalizedLabel,
      ids: recs.map((r) => r.id),
      areas: [...areas],
    });
  }
}

// ---- 7. 集計 ---------------------------------------------------------------
const byManagement = {};
const byHint = {};
for (const rec of concepts) {
  byManagement[rec.management] = (byManagement[rec.management] || 0) + 1;
  const h = rec.match.statusHint;
  byHint[h] = (byHint[h] || 0) + 1;
}
const byLevel = { 3: 0, 4: 0 };
for (const rec of concepts) byLevel[rec.headingLevel]++;

// ---- 8. 出力 ---------------------------------------------------------------
const inputsHash = crypto.createHash('sha256').update(inputContents.join('\0')).digest('hex').slice(0, 16);

const out = {
  schema: 'pe-textbook-keyword-coverage-candidates/v1',
  note: '機械抽出の候補データ。statusHint は暫定（末尾 ? 付き）で確定 A〜G ではない。A〜G は Evaluator が判定する。',
  generatedAt: STAMP,
  inputsHash,
  source: {
    textbookDir: path.relative(ROOT, TEXTBOOK_DIR),
    hubPath: path.relative(ROOT, HUB_PATH),
    peChapters: path.relative(ROOT, PE_CHAPTERS),
    docMeta: path.relative(ROOT, DOC_META),
  },
  summary: {
    conceptsTotal: concepts.length,
    byManagement,
    byLevel,
    structureHeadings: structureHeadings.length,
    statusHintDistribution: byHint,
    hub: {
      linkSlugs: hubLinkSlugs.size,
      auxiliaryTerms: hubAuxTerms.size,
      phantomHubLinks: phantomHubLinks.length,
      duplicateSlugRegistrations: duplicateSlugs.length,
      registryPhantoms: registryPhantoms.length,
      hubMissingKeywordLinks: hubMissingLinks.length,
    },
    pagePoolSize: Object.keys(pagePool).length,
    crossAreaConcepts: crossAreaConcepts.length,
  },
  concepts,
  structureHeadings,
  hub: {
    linkSlugs: [...hubLinkSlugs].sort(),
    auxiliaryTerms: [...hubAuxTerms].sort(),
    phantomHubLinks,
    duplicateSlugRegistrations: duplicateSlugs,
    registryPhantoms,
    hubMissingKeywordLinks: hubMissingLinks,
  },
  crossAreaConcepts,
  pagePool,
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + '\n', 'utf8');

// ---- コンソールサマリ ------------------------------------------------------
console.log('=== PE 標準テキスト → キーワード反映 監査（機械層）===');
console.log(`概念候補（H3+H4）: ${concepts.length}  [H3=${byLevel[3]} / H4=${byLevel[4]}]`);
for (const { area } of MANAGEMENT_FILES) console.log(`  ${area}: ${byManagement[area] || 0}`);
console.log(`構造見出し(H2+構造H3): ${structureHeadings.length}`);
console.log('statusHint 分布（暫定・?付き）:', JSON.stringify(byHint));
console.log(
  `ハブ: リンク ${hubLinkSlugs.size} / 補助語 ${hubAuxTerms.size} / phantom ${phantomHubLinks.length} / 重複slug登録 ${duplicateSlugs.length} / registry phantom ${registryPhantoms.length} / ハブ未リンクkeyword ${hubMissingLinks.length}`,
);
console.log(`page pool: ${Object.keys(pagePool).length}  cross-area概念: ${crossAreaConcepts.length}`);
console.log(`inputsHash: ${inputsHash}`);
console.log(`→ ${path.relative(ROOT, OUT_JSON)}`);
