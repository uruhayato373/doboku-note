#!/usr/bin/env node
/**
 * check-image-assets.mjs — 画像アセットの品質ガード（サイズ上限・危険ファイル名・未参照・webp 欠落）。
 *
 * 閾値 SSOT: .claude/config/image-limits.json（真実源 .claude/knowledge/reference/image-policy.md）。
 * baseline: .claude/state/quality/image-baseline.json（既存超過を grandfather）。
 *
 * チェック:
 *   C1 サイズ超過   … baseline に無い新規超過・記録から増えたものを --ci でブロック
 *   C2 危険名       … 空白・非 ASCII 等（filenamePattern 外）を --ci でブロック
 *   C3 未参照       … 記事本文に stem が現れない一般画像（figure- 接頭辞・ogp・cover と過去問 dir は除外）。report-only
 *   C4 webp 欠落    … png/jpg に兄弟 webp が無い候補。report-only
 *
 * 使い方:
 *   node scripts/check-image-assets.mjs                 # レポート（.claude/state/quality/image-audit.{json,md}）
 *   node scripts/check-image-assets.mjs --ci            # C1 新規/増加 + C2 のみで exit 1・レポート書込なし
 *   node scripts/check-image-assets.mjs --update-baseline
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, lstatSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyBySize, isDangerousName, diffBaseline, buildBaseline, fmtBytes, extOf } from '#lib/image-audit.mjs';

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const CONFIG = join(ROOT, '.claude', 'config', 'image-limits.json');
const BASELINE = join(ROOT, '.claude', 'state', 'quality', 'image-baseline.json');
const OUT_JSON = join(ROOT, '.claude', 'state', 'quality', 'image-audit.json');
const OUT_MD = join(ROOT, '.claude', 'state', 'quality', 'image-audit.md');

const argv = process.argv.slice(2);
const CI = argv.includes('--ci');
const UPDATE = argv.includes('--update-baseline');

const IMG_EXT = /\.(svg|png|jpg|jpeg|webp|gif)$/i;
const IGNORE_DIRS = new Set(['node_modules', '.git', 'out', '.next']);

function readJson(p, fb) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fb; } }

// symlink を辿らない再帰 walk（public/posts 等の symlink 二重計上を防ぐ）
function walk(dir, onFile) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir)) {
    if (IGNORE_DIRS.has(e)) continue;
    const p = join(dir, e);
    let st;
    try { st = lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) walk(p, onFile);
    else onFile(p, st);
  }
}

function collectImages(cfg) {
  const files = []; // { rel, bytes }
  for (const root of cfg.roots) {
    const base = join(ROOT, root.dir);
    walk(base, (p, st) => {
      if (!IMG_EXT.test(p)) return;
      const rel = relative(ROOT, p).split('\\').join('/');
      // match: "img" が指定されたら /img/ 配下のみ
      if (root.match === 'img' && !/\/img\//.test(rel)) return;
      files.push({ rel, bytes: st.size });
    });
  }
  return files;
}

// C3: 記事本文に stem（拡張子抜き basename）が現れるか。sibling article.mdx/md を読む。
function isReferenced(absImg) {
  const dir = dirname(absImg); // .../slug/img
  const articleDir = dirname(dir); // .../slug
  const stem = basename(absImg).replace(/\.[a-z0-9]+$/i, '');
  for (const cand of ['article.mdx', 'article.md']) {
    const a = join(articleDir, cand);
    if (existsSync(a)) {
      const text = readFileSync(a, 'utf8');
      if (text.includes(basename(absImg)) || text.includes(stem)) return true;
    }
  }
  return false;
}

function main() {
  const cfg = readJson(CONFIG, null);
  if (!cfg) { console.error('image-limits.json が読めません'); process.exit(2); }
  const baseline = readJson(BASELINE, {});
  const examRe = new RegExp(cfg.examDirPattern);
  const unrefExRe = new RegExp(cfg.unreferencedExcludePattern);

  const images = collectImages(cfg);

  // C1 サイズ
  const oversized = [];
  for (const f of images) {
    const c = classifyBySize(f.rel, f.bytes, cfg.maxBytes);
    if (c && c.over) oversized.push(c);
  }
  const { fresh, grew } = diffBaseline(oversized, baseline);

  // C2 危険名
  const dangerous = images.filter((f) => isDangerousName(f.rel, cfg.filenamePattern));

  // --update-baseline
  if (UPDATE) {
    mkdirSync(dirname(BASELINE), { recursive: true });
    writeFileSync(BASELINE, JSON.stringify(buildBaseline(oversized), null, 2) + '\n');
    console.error(`[check-image-assets] baseline 更新: ${oversized.length} 件の超過を grandfather`);
    return;
  }

  // C3 未参照（report-only。posts の img 配下のみ・figure-*/ogp/cover・過去問 dir 除外）
  const unreferenced = [];
  // C4 webp 欠落（report-only）
  const webpMissing = [];
  if (!CI) {
    const posts = images.filter((f) => f.rel.startsWith('content/site/') && /\/img\//.test(f.rel));
    for (const f of posts) {
      const base = basename(f.rel);
      const abs = join(ROOT, f.rel);
      if (examRe.test('/' + f.rel)) continue;
      if (cfg.unreferencedExcludeBasenames.includes(base) || unrefExRe.test(base)) continue;
      if (!isReferenced(abs)) unreferenced.push(f.rel);
      const ext = extOf(f.rel);
      if ((ext === 'png' || ext === 'jpg' || ext === 'jpeg') && !unrefExRe.test(base)) {
        const webpSibling = f.rel.replace(/\.[a-z0-9]+$/i, '.webp');
        if (!images.some((g) => g.rel === webpSibling)) webpMissing.push(f.rel);
      }
    }
  }

  // 出力
  const ciViolations = fresh.length + grew.length + dangerous.length;
  if (CI) {
    if (ciViolations) {
      console.error(`[check-image-assets] ✗ サイズ新規超過 ${fresh.length} / 肥大 ${grew.length} / 危険名 ${dangerous.length}`);
      for (const o of fresh) console.error(`  [size-new] ${o.relPath} ${fmtBytes(o.bytes)} > ${fmtBytes(o.limit)}`);
      for (const o of grew) console.error(`  [size-grew] ${o.relPath} ${fmtBytes(o.was)} → ${fmtBytes(o.bytes)}`);
      for (const d of dangerous) console.error(`  [bad-name] ${d.relPath}`);
      console.error(`  対処: 画像を圧縮 or 許容超過なら npm run update-image-baseline。危険名はリネーム(参照元も更新)。`);
      process.exit(1);
    }
    console.error(`[check-image-assets] ✓ 画像 ${images.length} 件・新規サイズ超過0・危険名0（grandfather 済 ${Object.keys(baseline).length} 件）`);
    return;
  }

  const record = {
    generated_at: new Date().toISOString(),
    totals: { images: images.length, oversized: oversized.length, grandfathered: Object.keys(baseline).length, fresh: fresh.length, grew: grew.length, dangerous: dangerous.length, unreferenced: unreferenced.length, webpMissing: webpMissing.length },
    fresh, grew, dangerous, unreferenced, webpMissing,
  };
  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(record, null, 2));
  const md = [
    '# 画像アセット監査 (check-image-assets)',
    '',
    `- 生成: ${record.generated_at}`,
    `- 画像 ${images.length} 件 / サイズ超過 ${oversized.length}（grandfather ${record.totals.grandfathered}・新規 ${fresh.length}・肥大 ${grew.length}）`,
    `- 危険名 ${dangerous.length} / 未参照候補 ${unreferenced.length} / webp 欠落候補 ${webpMissing.length}`,
    '',
    '## 新規サイズ超過（--ci ブロック対象）',
    fresh.length ? fresh.map((o) => `- ${o.rel} — ${fmtBytes(o.bytes)} > ${fmtBytes(o.limit)}`).join('\n') : '- なし',
    '',
    '## 未参照候補（report-only・要目視。誤検知は別拡張子参照/装飾画像）',
    unreferenced.length ? unreferenced.slice(0, 50).map((r) => `- ${r}`).join('\n') : '- なし',
    unreferenced.length > 50 ? `\n（他 ${unreferenced.length - 50} 件）` : '',
    '',
    '## webp 欠落候補（report-only・generate-webp で生成可）',
    webpMissing.length ? webpMissing.slice(0, 50).map((r) => `- ${r}`).join('\n') : '- なし',
    webpMissing.length > 50 ? `\n（他 ${webpMissing.length - 50} 件）` : '',
    '',
  ].join('\n');
  writeFileSync(OUT_MD, md);
  console.error(`[check-image-assets] レポート: ${relative(ROOT, OUT_JSON)} / ${relative(ROOT, OUT_MD)}`);
  console.error(`  画像 ${images.length}・超過 ${oversized.length}（新規 ${fresh.length}）・危険名 ${dangerous.length}・未参照 ${unreferenced.length}・webp欠落 ${webpMissing.length}`);
}

main();
