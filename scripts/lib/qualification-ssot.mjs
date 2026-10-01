/**
 * qualification-ssot.mjs — 資格の名前の写しを探す（npm run check-qualification-ssot と管理画面「正本の検査」が使う唯一の実装）。
 *
 * 資格の属性（正式名・短い名前・ごく短い名前・並び順・まとまり groups）は .claude/config/qualification-registry.json だけが持つ。
 * 機能を足すたびに別の設定・コードへ名前を写し、id の一致だけを見る検査を素通りして名前・並びが
 * 画面ごとにずれる事故が繰り返された（2026-10-02: 商品設計とコンテンツ台帳のメニュー）。
 *   - 設定（.claude/config・.claude/knowledge・src/config の JSON）: registry 以外が資格に名前を持てば違反。
 *     資格を id／qualification／slug で指す項目と、資格 id（または別名）をキーにした名前を拾う。
 *     資格名と別の属性（試験の正式名など）は qualification-ssot-allow.json に理由つきで登録する。
 *   - 書き込み先（DERIVED_FILES）: npm run sync-qualification-names が書いた名前が registry と一致するか。
 *   - コード（scripts・.claude/scripts・tools/admin-app/src・src）: 資格 id（または別名）→ 日本語の対応表は 1 件でも違反。
 *     名前でない日本語（説明文など）の誤検出は、その行か直前の行に `qualification-ssot: allow <理由>` を書く。
 *   別名は note-cover-tokens.json・note-funnel.json・keiken-answer-sheet-limits.json のキー（civil-1・tankan など）。
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { REGISTRY_PATH, isQualificationRef, qualificationLabel } from './qualification-registry.mjs';

export const ALLOW_PATH = '.claude/config/qualification-ssot-allow.json';
const NAME_KEYS = ['label', 'shortLabel', 'badgeLabel', 'name', 'title', 'short'];
const CODE_DIRS = ['scripts', '.claude/scripts', 'tools/admin-app/src', 'src'];
const CONFIG_DIRS = ['.claude/config', '.claude/knowledge', 'src/config'];
const ALIAS_SOURCES = [
  ['.claude/knowledge/design-system/note-cover-tokens.json', (j) => j.exams],
  ['.claude/config/note-funnel.json', (j) => j.exams],
  ['.claude/config/keiken-answer-sheet-limits.json', (j) => j.grades],
];
export const ALLOW_MARKER = 'qualification-ssot: allow';
const CODE_EXT = /\.(mjs|cjs|js|ts|tsx|mts|cts)$/;
const SKIP_DIRS = new Set(['node_modules', '.next', 'out', 'dist']);
const JP = '[\\u3040-\\u30ff\\u4e00-\\u9fff]';

const readJson = (root, rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));

/**
 * registry の名前を書き込んで使うファイル（サイトのカテゴリ・トップの資格カード・タグ辞書）。読み手が多く（14 箇所）
 * 実行時に registry を引く形へ揃えるより、npm run sync-qualification-names が名前を書き、検査が registry との一致を見る。
 * 項目の参照先は qualification（無ければ slug）が registry の資格 id か group id のときだけ。
 */
export const DERIVED_FILES = [
  { file: 'src/config/categories.json', nameKey: 'label' },
  { file: 'src/config/home-exam-cards.json', nameKey: 'label' },
  { file: 'src/config/tags.json', nameKey: 'name', when: (x) => x.class === 'qualification' },
];

/**
 * DERIVED_FILES の名前を registry と比べ、write なら書き換える（行単位の置換で書式を保つ）。
 * @returns {{ file, ref, current, want }[]} registry と違う項目（write 後は書き換えた項目）
 */
export function syncDerivedNames(root, registry, { write = false } = {}) {
  const diffs = [];
  for (const d of DERIVED_FILES) {
    const abs = join(root, d.file);
    const text = readFileSync(abs, 'utf8');
    const items = JSON.parse(text);
    let out = text;
    for (const x of items) {
      if (d.when && !d.when(x)) continue;
      const ref = x.qualification ?? x.slug;
      if (!isQualificationRef(registry, ref)) continue;
      const want = qualificationLabel(registry, ref);
      if (x[d.nameKey] === want) continue;
      diffs.push({ file: d.file, slug: x.slug, ref, current: x[d.nameKey], want });
      if (write) {
        // 同じ slug の項目の中の名前の行だけを置き換える
        const start = out.indexOf(`"slug": "${x.slug}"`);
        const end = out.indexOf('}', start);
        const objStart = out.lastIndexOf('{', start);
        const seg = out.slice(objStart, end);
        const line = `"${d.nameKey}": ${JSON.stringify(x[d.nameKey])}`;
        if (start < 0 || !seg.includes(line)) throw new Error(`${d.file}: ${x.slug} の ${d.nameKey} を書き換えられない`);
        out = out.slice(0, objStart) + seg.replace(line, `"${d.nameKey}": ${JSON.stringify(want)}`) + out.slice(end);
      }
    }
    if (write && out !== text) writeFileSync(abs, out);
  }
  return diffs;
}
const posix = (p) => p.split('\\').join('/');

function walk(dir, pick, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name), pick, out);
    } else if (pick(e.name)) out.push(join(dir, e.name));
  }
  return out;
}

/** JSON の中で、資格 id に名前が付いている箇所（パス）を返す */
export function findConfigCopies(json, ids) {
  const hits = [];
  const visit = (node, path) => {
    if (Array.isArray(node)) {
      node.forEach((x, i) => visit(x, `${path}[${i}]`));
      return;
    }
    if (!node || typeof node !== 'object') return;
    // { id: '<資格>', label: '…' }
    const ownId = ['id', 'qualification', 'slug'].map((k) => node[k]).find((v) => typeof v === 'string' && ids.has(v)) ?? null;
    if (ownId && ids.has(ownId)) for (const k of NAME_KEYS) if (typeof node[k] === 'string') hits.push(`${path}.${k}`);
    for (const [k, v] of Object.entries(node)) {
      if (ids.has(k)) {
        // { '<資格>': '名前' } と { '<資格>': { label: '…' } }
        if (typeof v === 'string') hits.push(`${path}.${k}`);
        else if (v && typeof v === 'object' && !Array.isArray(v)) for (const n of NAME_KEYS) if (typeof v[n] === 'string') hits.push(`${path}.${k}.${n}`);
      }
      if (v && typeof v === 'object') visit(v, `${path}.${k}`);
    }
  };
  visit(json, '$');
  return hits;
}

/** 許可のパターン（* は 1 段の任意キー）がパスに当たるか */
const allowMatch = (pattern, path) => new RegExp(`^${pattern.replace(/[.[\]$]/g, (c) => `\\${c}`).replace(/\*/g, '[^.\\[]+')}$`).test(path);

/** コードの 1 ファイルで、資格 id（または別名）→ 日本語の対応表らしい行を返す（行番号は 1 始まり） */
export function findCodeCopies(text, ids) {
  const alt = [...ids].map((id) => id.replace(/[-]/g, '\\-')).join('|');
  const patterns = [
    // '<資格>': '日本語' / '<資格>': { …日本語 / rccm: '日本語'
    new RegExp(`(?:['"\`](?:${alt})['"\`]|\\b(?:${alt})\\b)\\s*:\\s*(?:['"\`][^'"\`\\n]*${JP}|\\{[^}\\n]*${JP})`),
    // id: '<資格>', … label: '日本語'
    new RegExp(`['"\`](?:${alt})['"\`][^\\n]*\\b(?:label|shortLabel|name|title|short|qual)\\s*:\\s*['"\`][^'"\`\\n]*${JP}`),
    // ['<資格>', '日本語']（Map の初期値など）
    new RegExp(`\\[\\s*['"\`](?:${alt})['"\`]\\s*,\\s*['"\`][^'"\`\\n]*${JP}`),
    // case '<資格>': return '日本語'
    new RegExp(`case\\s+['"\`](?:${alt})['"\`]\\s*:\\s*return\\s+['"\`][^'"\`\\n]*${JP}`),
  ];
  // 複数行: '<資格>': { の次の数行に label: '日本語'、case '<資格>': の次行に return '日本語'
  // if (x === '<資格>') { の次行に return { label: '日本語' } も拾う
  const opener = new RegExp(`(?:['"\`](?:${alt})['"\`]|\\b(?:${alt})\\b)\\s*:\\s*\\{\\s*$|case\\s+['"\`](?:${alt})['"\`]\\s*:\\s*$|===?\\s*['"\`](?:${alt})['"\`]\\s*\\)\\s*\\{\\s*$`);
  const inner = new RegExp(`^\\s*(?:(?:label|shortLabel|name|title|short|qual)\\s*:\\s*|return\\s+(?:\\{[^}\\n]*\\b(?:label|shortLabel|name|title|short|qual)\\s*:\\s*)?)['"\`][^'"\`\\n]*${JP}`);
  const lines = text.split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    if (line.includes(ALLOW_MARKER) || (i > 0 && lines[i - 1].includes(ALLOW_MARKER))) return;
    if (patterns.some((re) => re.test(line)) || (opener.test(line) && lines.slice(i + 1, i + 5).some((l) => inner.test(l)))) hits.push({ line: i + 1, text: line.trim().slice(0, 160) });
  });
  return hits;
}

/** 互換: 件数だけ返す */
export const countCodeCopies = (text, ids) => findCodeCopies(text, ids).length;

/** 設定の別名キー（civil-1 など）。名前は書かず qualification: で registry を指しているはずのキー */
function aliasKeys(root) {
  const out = new Set();
  for (const [file, pick] of ALIAS_SOURCES) {
    try {
      for (const [k, v] of Object.entries(pick(readJson(root, file)) ?? {})) if (v && typeof v === 'object' && v.qualification) out.add(k);
    } catch { /* 無ければ別名なし */ }
  }
  return out;
}

/**
 * 正本の検査を実行する。
 * @returns {{ registry, ids: string[], aliases: string[], config: { files: number, violations: { file, path }[], allowed: { file, path, reason }[] },
 *   derived: { files: number, diffs: { file, slug, ref, current, want }[] }, code: { files: number, hits: { file, line, text }[] } }}
 */
export function auditQualificationSsot(root) {
  const registry = readJson(root, REGISTRY_PATH);
  const aliases = aliasKeys(root);
  const ids = new Set([
    ...(registry.qualifications ?? []).map((q) => q.id),
    ...Object.keys(registry.families ?? {}),
    ...Object.keys(registry.groups ?? {}),
    ...aliases,
  ]);
  const allow = readJson(root, ALLOW_PATH).allow ?? [];
  const derivedFiles = new Set(DERIVED_FILES.map((d) => d.file));

  const configFiles = CONFIG_DIRS.flatMap((d) => walk(join(root, d), (n) => n.endsWith('.json')))
    .map((abs) => posix(relative(root, abs)))
    .filter((rel) => rel !== REGISTRY_PATH && rel !== ALLOW_PATH && !derivedFiles.has(rel));
  const violations = [];
  const allowed = [];
  for (const file of configFiles) {
    let json;
    try {
      json = readJson(root, file);
    } catch {
      continue;
    }
    for (const path of findConfigCopies(json, ids)) {
      const rule = allow.find((a) => a.file === file && allowMatch(a.path, path));
      if (rule) allowed.push({ file, path, reason: rule.reason });
      else violations.push({ file, path });
    }
  }

  const diffs = syncDerivedNames(root, registry);

  const codeFiles = CODE_DIRS.flatMap((d) => walk(join(root, d), (n) => CODE_EXT.test(n)))
    .map((abs) => posix(relative(root, abs)))
    .filter((rel) => !rel.endsWith('qualification-registry.mjs') && !rel.endsWith('qualification-ssot.mjs'));
  const hits = [];
  for (const file of codeFiles) for (const h of findCodeCopies(readFileSync(join(root, file), 'utf8'), ids)) hits.push({ file, ...h });

  return {
    registry,
    ids: [...ids],
    aliases: [...aliases],
    config: { files: configFiles.length, violations, allowed },
    derived: { files: DERIVED_FILES.length, diffs },
    code: { files: codeFiles.length, hits },
  };
}
