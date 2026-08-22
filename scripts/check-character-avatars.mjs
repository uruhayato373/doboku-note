#!/usr/bin/env node
/**
 * check-character-avatars.mjs
 *
 * サイト CTA のキャラアバターについて、3 者の整合を機械検知する。
 *
 *   ① `.claude/config/character-poses.json` の `siteCta: true`（＝どのポーズを配信するかの真実源）
 *   ② `public/images/character/avatar-{pose}.webp`（配信実体）
 *   ③ `src/lib/note-magazines.ts` の `ctaPose` union（MDX/SoT から指定できる値）
 *
 * 塞ぐ事故: ③ だけ広げて ② の生成（npm run character-avatars）を忘れると、
 * 有料 CTA バナーのアバターが本番で 404 になる（og:image 404 を防ぐ check-ogp-coverage と同じクラス）。
 * 逆に ② だけ増やすと配信されない死蔵ファイルになる。type-check では ①② を検査できないため独立ゲートにする。
 *
 * 使い方:
 *   node scripts/check-character-avatars.mjs        # 不整合があれば exit 1
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MANIFEST = '.claude/config/character-poses.json';
const SOT = 'src/lib/note-magazines.ts';

const poses = require(join(ROOT, MANIFEST)).poses;
const sitePoses = poses.filter((p) => p.siteCta).map((p) => p.slug).sort();

// ③ note-magazines.ts の `readonly ctaPose?: 'a' | 'b';` から許可値を抜く
const src = readFileSync(join(ROOT, SOT), 'utf8');
const m = src.match(/ctaPose\?:\s*([^;]+);/);
if (!m) {
  console.error(`[check-character-avatars] FAIL: ${SOT} に ctaPose の型定義が見つからない`);
  process.exit(1);
}
const unionPoses = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();

const errors = [];

// ① vs ③: manifest の siteCta 集合と union が一致するか
for (const p of sitePoses) {
  if (!unionPoses.includes(p)) {
    errors.push(`manifest が siteCta:true としている '${p}' が ${SOT} の ctaPose union に無い`);
  }
}
for (const p of unionPoses) {
  if (!sitePoses.includes(p)) {
    errors.push(
      `${SOT} の ctaPose union にある '${p}' が manifest で siteCta:true になっていない（${MANIFEST} に追記するか union から外す）`,
    );
  }
}

// ① vs ②: siteCta のポーズに配信 webp が実在するか（＝本番 404 の直接原因）
for (const p of sitePoses) {
  const rel = `public/images/character/avatar-${p}.webp`;
  if (!existsSync(join(ROOT, rel))) {
    errors.push(`'${p}' の配信アバターが無い: ${rel}（npm run character-icons ${p} && npm run character-avatars ${p}）`);
  }
}

// manifest 未登録の pose を siteCta にしていないか（file 配線の健全性）
for (const p of poses.filter((x) => x.siteCta)) {
  if (!existsSync(join(ROOT, 'content/sns/_assets/character', p.file))) {
    errors.push(`'${p.slug}' の元素材が無い: content/sns/_assets/character/${p.file}`);
  }
}

if (errors.length) {
  console.error('[check-character-avatars] FAIL');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `[check-character-avatars] ✓ サイト CTA ポーズ ${sitePoses.length} 件（${sitePoses.join(', ')}）は manifest・webp・ctaPose union の三者が整合`,
);
