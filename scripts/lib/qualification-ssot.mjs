/**
 * qualification-ssot.mjs — 資格の名前の写しを探す（npm run check-qualification-ssot と管理画面「正本の検査」が使う唯一の実装）。
 *
 * 資格の属性（正式名・短い名前・並び順）は .claude/config/qualification-registry.json だけが持つ。
 * 機能を足すたびに別の設定・コードへ名前を写し、id の一致だけを見る検査を素通りして名前・並びが
 * 画面ごとにずれる事故が繰り返された（2026-10-02: 商品設計とコンテンツ台帳のメニュー）。
 *   - 設定（.claude/config/**.json）: registry 以外が資格 id に名前（label/shortLabel/name/title）を持てば違反。
 *     資格名と別の属性（試験の正式名など）は qualification-ssot-allow.json に理由つきで登録する。
 *   - コード（scripts・tools/admin-app/src・src）: 資格 id → 日本語の対応表を数え、
 *     qualification-ssot-baseline.json の件数（既存の負債）を超えたら違反（増やさない・減らしたら基準を下げる）。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { REGISTRY_PATH } from './qualification-registry.mjs';

export const ALLOW_PATH = '.claude/config/qualification-ssot-allow.json';
export const BASELINE_PATH = '.claude/config/qualification-ssot-baseline.json';
const NAME_KEYS = ['label', 'shortLabel', 'name', 'title'];
const CODE_DIRS = ['scripts', 'tools/admin-app/src', 'src'];
const CODE_EXT = /\.(mjs|js|ts|tsx)$/;
const SKIP_DIRS = new Set(['node_modules', '.next', 'out', 'dist']);
const JP = '[\\u3040-\\u30ff\\u4e00-\\u9fff]';

const readJson = (root, rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
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
    const ownId = typeof node.id === 'string' ? node.id : typeof node.qualification === 'string' ? node.qualification : null;
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

/** コードの 1 ファイルで、資格 id → 日本語の対応表らしい行を数える */
export function countCodeCopies(text, ids) {
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
  const opener = new RegExp(`(?:['"\`](?:${alt})['"\`]|\\b(?:${alt})\\b)\\s*:\\s*\\{\\s*$|case\\s+['"\`](?:${alt})['"\`]\\s*:\\s*$`);
  const inner = new RegExp(`^\\s*(?:(?:label|shortLabel|name|title|short|qual)\\s*:\\s*|return\\s+)['"\`][^'"\`\\n]*${JP}`);
  const lines = text.split('\n');
  let n = 0;
  lines.forEach((line, i) => {
    if (patterns.some((re) => re.test(line))) n += 1;
    else if (opener.test(line) && lines.slice(i + 1, i + 5).some((l) => inner.test(l))) n += 1;
  });
  return n;
}

/**
 * 正本の検査を実行する。
 * @returns {{ registry, ids: string[], config: { files: number, violations: { file, path }[], allowed: { file, path, reason }[] },
 *   code: { files: number, counts: Record<string, number>, over: { file, count, baseline }[], under: { file, count, baseline }[] } }}
 */
export function auditQualificationSsot(root) {
  const registry = readJson(root, REGISTRY_PATH);
  const ids = new Set([...(registry.qualifications ?? []).map((q) => q.id), ...Object.keys(registry.families ?? {})]);
  const allow = readJson(root, ALLOW_PATH).allow ?? [];
  const baseline = readJson(root, BASELINE_PATH).counts ?? {};

  const configFiles = walk(join(root, '.claude', 'config'), (n) => n.endsWith('.json'))
    .map((abs) => posix(relative(root, abs)))
    .filter((rel) => rel !== REGISTRY_PATH && rel !== ALLOW_PATH && rel !== BASELINE_PATH);
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

  const codeFiles = CODE_DIRS.flatMap((d) => walk(join(root, d), (n) => CODE_EXT.test(n)))
    .map((abs) => posix(relative(root, abs)))
    .filter((rel) => !rel.endsWith('qualification-registry.mjs') && !rel.endsWith('qualification-ssot.mjs'));
  const counts = {};
  for (const file of codeFiles) {
    const n = countCodeCopies(readFileSync(join(root, file), 'utf8'), ids);
    if (n > 0) counts[file] = n;
  }
  const over = [];
  const under = [];
  for (const [file, count] of Object.entries(counts)) if (count > (baseline[file] ?? 0)) over.push({ file, count, baseline: baseline[file] ?? 0 });
  for (const [file, b] of Object.entries(baseline)) if ((counts[file] ?? 0) < b) under.push({ file, count: counts[file] ?? 0, baseline: b });

  return {
    registry,
    ids: [...ids],
    config: { files: configFiles.length, violations, allowed },
    code: { files: codeFiles.length, counts, over, under },
  };
}
