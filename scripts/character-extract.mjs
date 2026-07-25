#!/usr/bin/env node
/**
 * character-extract — ChatGPT 等で「1ポーズ=1画像・無地背景」生成したキャラ画像群を
 * 透過 PNG（背景除去＋トリム）に変換し、ポーズ名で素材ライブラリへ保存する。
 *
 * 真実源/運用: .claude/knowledge/reference/character-asset-policy.md
 * マニフェスト: .claude/config/character-poses.json
 *
 * 使い方:
 *   node scripts/character-extract.mjs --in ~/Downloads/poses [--names "pointing,idea,..."] [--fuzz 12]
 *   node scripts/character-extract.mjs --in ~/Downloads/poses --montage   # 確認用モンタージュのみ
 *
 *   --in       入力ディレクトリ（単一キャラ・無地背景の画像群。mtime 昇順で処理）
 *   --names    出力ファイル名（カンマ区切り。入力枚数と一致させる）。省略時は staging/NN.png
 *   --fuzz     背景除去のしきい値(%) 既定 12（白〜淡色の無地背景向け）
 *   --out      出力先（既定: docs/sns/_assets/character）
 *   --montage  確認用モンタージュ(.tmp/char-extract/montage.png)を出して終了
 *
 * 依存: ImageMagick(magick)。AI品質の切り抜きが要るときは aidesigner remove_image_background(無料)を併用。
 */
import { execSync } from 'node:child_process';
import { readdirSync, statSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

function arg(name, def = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const inDir = arg('in');
if (!inDir) { console.error('ERROR: --in <dir> は必須'); process.exit(1); }
const fuzz = Number(arg('fuzz', 12));
const outDir = resolve(arg('out', 'docs/sns/_assets/character'));
const names = arg('names') ? String(arg('names')).split(',').map((s) => s.trim()).filter(Boolean) : null;
const montageOnly = arg('montage') === true;
const FONT = '.claude/skills/conversion/ogp-create/assets/fonts/NotoSansJP-Bold.ttf';

const IMG = /\.(png|jpe?g|webp)$/i;
const inputs = readdirSync(inDir)
  .filter((f) => IMG.test(f))
  .map((f) => ({ f, p: join(inDir, f), t: statSync(join(inDir, f)).mtimeMs }))
  .sort((a, b) => a.t - b.t);

if (inputs.length === 0) { console.error(`ERROR: ${inDir} に画像なし`); process.exit(1); }
if (names && names.length !== inputs.length) {
  console.error(`ERROR: --names ${names.length}個 と 入力 ${inputs.length}枚 が不一致`);
  process.exit(1);
}

const stg = '.tmp/char-extract';
rmSync(stg, { recursive: true, force: true });
mkdirSync(stg, { recursive: true });

function knockout(src, dst) {
  // 四隅の無地背景を flood-fill で透過 → トリム
  execSync(
    `magick ${JSON.stringify(src)} -alpha set -bordercolor white -border 2 ` +
    `-fuzz ${fuzz}% -fill none -draw "alpha 0,0 floodfill" -shave 2x2 -trim +repage ${JSON.stringify(dst)}`,
    { stdio: 'pipe' }
  );
}

const staged = [];
inputs.forEach((it, i) => {
  const nn = String(i + 1).padStart(2, '0');
  const dst = join(stg, `${nn}.png`);
  knockout(it.p, dst);
  staged.push({ nn, dst, src: it.f, name: names ? names[i] : null });
});

// 確認用モンタージュ
const cols = Math.min(5, staged.length);
const rows = Math.ceil(staged.length / cols);
execSync(
  `magick montage ${staged.map((s) => JSON.stringify(s.dst)).join(' ')} ` +
  `-font ${JSON.stringify(FONT)} -tile ${cols}x${rows} -geometry 320x400+8+8 -background "#999999" ` +
  `${JSON.stringify(join(stg, 'montage.png'))}`,
  { stdio: 'pipe' }
);
console.log(`透過処理: ${staged.length}枚 → ${stg}/`);
console.log(`確認モンタージュ: ${stg}/montage.png（順=mtime昇順）`);

if (montageOnly) {
  console.log('--montage 指定のため保存はスキップ。確認後 --names を付けて再実行してください。');
  process.exit(0);
}

if (!names) {
  console.log('（--names 未指定）staging に NN.png として出力。確認後、--names で本保存してください。');
  process.exit(0);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
for (const s of staged) {
  const dst = join(outDir, `${s.name}.png`);
  execSync(`cp ${JSON.stringify(s.dst)} ${JSON.stringify(dst)}`);
  console.log(`  ${s.src} → ${s.name}.png`);
}
console.log(`\n保存完了: ${staged.length}枚 → ${outDir}`);
console.log('次: .claude/config/character-poses.json に poses を追記し、verified を確認すること。');
