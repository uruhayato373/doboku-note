#!/usr/bin/env node
/**
 * Tag Index ビルダー（doc 17 §5.2）
 *
 * 全 MDX の frontmatter tags を集計して src/config/tag-dictionary.json に出力する。
 * 既存の `src/config/tags.json` （30 件の手動 allowlist）とドリフトを比較し、
 * 未登録タグ・typo 候補を警告する。
 *
 * ── 出力スキーマ ──
 *   {
 *     version, generated_at,
 *     summary: { total_mdx_files, total_unique_tags, unknown_count, typo_candidates_count },
 *     tags: [ { name, count, inAllowlist, usedIn: [slug...] } ],
 *     unknown: [ name ],         // allowlist に無いタグ
 *     typo_candidates: [ { tag, suggestion, distance } ]
 *   }
 *
 * Usage:
 *   node .claude/scripts/build-tag-index.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const POSTS_ROOT = join(ROOT, 'content/site');
const TAGS_ALLOWLIST_PATH = join(ROOT, 'src/config/tags.json');
const OUT_PATH = join(ROOT, 'src/config/tag-dictionary.json');

const TYPO_MAX_USED = 100; // Levenshtein チェックを走らせる上限

// ── MDX 列挙 ────────────────────────────────────────────────────

function walkMdx(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMdx(p));
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.mdx') {
      out.push(p);
    }
  }
  return out;
}

// ── slug 生成 ──────────────────────────────────────────────────

function toSlug(filePath) {
  const rel = relative(POSTS_ROOT, filePath);
  const withoutExt = rel.replace(/\.mdx$/i, '');
  return withoutExt.split(/[\\/]/).filter((s) => s && s !== 'article').join('-');
}

// ── Levenshtein 距離 (制限付き、距離 1 のみ興味がある) ──────

function levenshteinLE1(a, b) {
  // 距離 1 以内だけ true を返す軽量実装
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  // 長い方を a にする
  if (a.length < b.length) [a, b] = [b, a];
  // 1 文字削除 or 置換で一致するかチェック
  let i = 0,
    j = 0,
    diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      diff++;
      if (diff > 1) return false;
      if (a.length > b.length) i++;
      else {
        i++;
        j++;
      }
    }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}

// ── メイン処理 ─────────────────────────────────────────────────

function main() {
  // allowlist 読み込み ── `{ name, slug }` の両方を allow 扱いに
  const allowlistSet = new Set();
  if (existsSync(TAGS_ALLOWLIST_PATH)) {
    try {
      const json = JSON.parse(readFileSync(TAGS_ALLOWLIST_PATH, 'utf8'));
      if (Array.isArray(json)) {
        for (const e of json) {
          if (typeof e === 'string') allowlistSet.add(e);
          else if (e && typeof e === 'object') {
            if (e.slug) allowlistSet.add(e.slug);
            if (e.name) allowlistSet.add(e.name);
          }
        }
      }
    } catch (e) {
      console.warn(`[tag-index] tags.json 読み込み失敗: ${e.message}`);
    }
  }

  // 全 MDX を scan
  const files = walkMdx(POSTS_ROOT);
  console.log(`[tag-index] ${files.length} MDX を走査`);

  const tagMap = new Map(); // name → { count, usedIn: Set<slug> }

  for (const filePath of files) {
    let data;
    try {
      data = matter(readFileSync(filePath, 'utf8')).data || {};
    } catch {
      continue;
    }
    const tags = Array.isArray(data.tags) ? data.tags : [];
    if (tags.length === 0) continue;

    const slug = toSlug(filePath);
    for (const raw of tags) {
      if (typeof raw !== 'string') continue;
      const tag = raw.trim();
      if (!tag) continue;
      if (!tagMap.has(tag)) tagMap.set(tag, { count: 0, usedIn: new Set() });
      const entry = tagMap.get(tag);
      entry.count += 1;
      entry.usedIn.add(slug);
    }
  }

  // 集計
  const allTags = Array.from(tagMap.entries())
    .map(([name, { count, usedIn }]) => ({
      name,
      count,
      inAllowlist: allowlistSet.has(name),
      usedIn: Array.from(usedIn).sort(),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const unknown = allTags.filter((t) => !t.inAllowlist).map((t) => t.name);

  // typo 候補: unknown の各タグに対して、allowlist のタグと距離 1 で一致するものを探す
  const typoCandidates = [];
  if (unknown.length <= TYPO_MAX_USED) {
    for (const unk of unknown) {
      for (const ok of allowlistSet) {
        if (levenshteinLE1(unk, ok) && unk !== ok) {
          typoCandidates.push({ tag: unk, suggestion: ok, distance: 1 });
          break; // 1 個見つければ十分
        }
      }
    }
  }

  const output = {
    version: 1,
    generated_at: new Date().toISOString(),
    summary: {
      total_mdx_files: files.length,
      total_unique_tags: allTags.length,
      allowlist_size: allowlistSet.size,
      known_count: allTags.length - unknown.length,
      unknown_count: unknown.length,
      typo_candidates_count: typoCandidates.length,
    },
    tags: allTags,
    unknown,
    typo_candidates: typoCandidates,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  console.log(`[tag-index] ✓ ${relative(ROOT, OUT_PATH)} に出力`);
  console.log(`  total unique tags: ${allTags.length}`);
  console.log(`  known (in allowlist): ${allTags.length - unknown.length}`);
  console.log(`  unknown: ${unknown.length}`);
  console.log(`  typo candidates: ${typoCandidates.length}`);
  if (typoCandidates.length > 0) {
    console.log('\n  typo 候補サンプル:');
    typoCandidates.slice(0, 5).forEach((c) => console.log(`    "${c.tag}" → "${c.suggestion}"?`));
  }
}

main();
