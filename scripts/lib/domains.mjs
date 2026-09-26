/**
 * domains.mjs — 事業の領域（ドメイン）の正本 `.claude/config/domains.json` を読む唯一の実装。
 *
 * サイドバーの並び・バックログの [領域:]・スケジュール・スキル/エージェントの frontmatter `domain:`・
 * 文書の割り当て（documents＝パス接頭辞、長い一致が優先）は全てここを経由して領域 id に解決する。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DOMAINS_PATH = '.claude/config/domains.json';

export function loadDomains(root) {
  return JSON.parse(readFileSync(join(root, DOMAINS_PATH), 'utf8'));
}

/** 領域 id → 定義。ラベル（例「商品」）でも引ける（バックログは日本語で書くため）。 */
export function domainIndex(cfg) {
  const byKey = new Map();
  for (const d of cfg.domains) {
    byKey.set(d.id, d);
    byKey.set(d.label, d);
  }
  return byKey;
}

/** 文書パス（リポジトリ相対）→ 領域 id。一致しなければ null。 */
export function documentDomain(cfg, path) {
  const p = path.split('\\').join('/');
  let best = null;
  for (const [key, id] of Object.entries(cfg.documents ?? {})) {
    const hit = key.endsWith('/') ? p.startsWith(key) : p === key;
    if (hit && (!best || key.length > best.key.length)) best = { key, id };
  }
  return best?.id ?? null;
}

/** frontmatter の `domain:` を読む（無ければ null）。 */
export function frontmatterDomain(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const line = m?.[1].split(/\r?\n/).find((l) => /^domain:/.test(l));
  return line ? line.slice('domain:'.length).trim() : null;
}
