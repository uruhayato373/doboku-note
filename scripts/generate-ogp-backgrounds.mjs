/**
 * OGP 背景画像ジェネレータ（資格ごとに共有・AI 生成）。
 *
 * Codex（scripts/lib/codex-image.mjs）で「文字なしの落ち着いた抽象背景」を資格ごとに 1 枚生成し、
 *   config/ogp/backgrounds/<exam-key>.png （1200×630）
 * に保存する。ogp-create.mjs の resolveBackgroundImage がこのパスを拾い、
 * mono-tag テンプレが背景の上に可読性スクリム + 文字 + テーマ色枠を重ねる。
 *
 * 設計意図:
 *   - 背景は「装飾の下地」。文字は satori が正確に描くので、AI には背景だけを任せる。
 *   - 出力は OGP 上で ~82% のオフホワイトスクリムを被るため、彩度・コントラストは控えめに。
 *   - 資格ごとに 1 枚共有（全記事で使い回し）→ 生成は数枚で済み、コスト最小・統一感。
 *
 * 画像生成は Codex のみ（Gemini は使わない・運営者の決定 2026-10-09）。API キーは不要（codex CLI のログインを使う）。
 *
 * Usage:
 *   node scripts/generate-ogp-backgrounds.mjs --dry-run            # プロンプトのみ表示（Codex を呼ばない）
 *   node scripts/generate-ogp-backgrounds.mjs --all                # 全資格を生成（既存はスキップ）
 *   node scripts/generate-ogp-backgrounds.mjs --exam civil-1 --force
 *   node scripts/generate-ogp-backgrounds.mjs --all --model <codex のモデル名>   # 省略時は codex の既定
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createRequire } from 'node:module';
import { coverExamNames } from './lib/note-character-cover.mjs';
import { datasetDir } from './lib/datasets.mjs';
import { generateWithCodex } from './lib/codex-image.mjs';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const BACKGROUNDS_DIR = path.join(ROOT, datasetDir('config.ogp-backgrounds'));
const coverTokens = require(path.join(ROOT, '.claude/knowledge/design-system/note-cover-tokens.json'));

const W = 1200, H = 630;

// 資格ごとの背景モチーフ（テーマ色は note-cover-tokens.json の base を参照）。
const EXAMS = [
  { key: 'pe-comprehensive', motif: '俯瞰的なマネジメント／5つの管理を象徴する幾何的な格子と等高線' },
  { key: 'civil-1',          motif: '土木構造物の輪郭線・施工現場の図面的なライン' },
  { key: 'civil-2',          motif: '造成・基礎工事を思わせる地形のレイヤー' },
  { key: 'concrete-chief',   motif: 'コンクリート配合・骨材の抽象テクスチャ' },
  { key: 'concrete-diagnosis', motif: '構造物の劣化診断・断面のグラフィカルな抽象' },
  { key: 'pe-construction',  motif: '橋梁・河川・道路インフラの俯瞰的な抽象ライン' },
];

function parseArgs(argv) {
  const a = { all: false, exam: null, force: false, dryRun: false, model: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--all') a.all = true;
    else if (t === '--force') a.force = true;
    else if (t === '--dry-run') a.dryRun = true;
    else if (t === '--exam') a.exam = argv[++i];
    else if (t === '--model') a.model = argv[++i];
  }
  if (!a.all && !a.exam) a.all = true;
  return a;
}

function buildPrompt(exam) {
  const color = coverTokens.exams?.[exam.key]?.base || '#1e3a8a';
  const label = coverExamNames(exam.key)?.label || exam.key;
  return [
    `An abstract, professional background image for a blog OGP card about "${label}" (a Japanese civil-engineering certification).`,
    `Motif: ${exam.motif}.`,
    `CRITICAL — the overall field must be LIGHT, pale and high-key: like a faint technical blueprint printed on near-white / off-white paper. Dark title text will be placed on top, so it must stay bright and airy.`,
    `Use the accent color ${color} ONLY for thin line work and subtle geometric motifs — NEVER as a background fill. No dark areas, no saturated color blocks, no heavy shading.`,
    `Style: calm, minimal, very low-contrast, soft. Keep the left-center area especially quiet and almost empty (title text sits there); place the faint motif toward the upper-right.`,
    `Absolutely NO text, NO letters, NO numbers, NO logos, NO watermarks, NO people, NO photographs of real signage.`,
    `Wide 16:9 landscape, flat vector-like illustration, high resolution.`,
  ].join(' ');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 429（容量不足）や flash のテキスト返答は単発で起きがち。数回リトライで吸収する。
async function withRetry(fn, label, attempts = 4) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (i < attempts) {
        console.log(`      retry ${i}/${attempts - 1} (${label}): ${e.message.slice(0, 70)}`);
        await sleep(2000 * i);
      }
    }
  }
  throw lastErr;
}

// Codex で 1 枚生成して画像のバイト列を返す（出なければ投げて withRetry に任せる）。
async function callCodex(model, prompt) {
  const file = generateWithCodex(prompt, model);
  if (!file) throw new Error('codex: 画像が出力されなかった');
  return fs.readFileSync(file);
}

// AI 出力の明るさは不安定（テーマ色が濃いと地まで濃く返ることがある）。
// 1200×630 にクロップ後、平均輝度を測り、target 未満なら白へ線形ブレンドして淡く持ち上げる
// （output = (1-p)*in + 255*p）。明るい出力は p=0 で不変。これで「暗い地＋濃い文字」を構造的に防ぐ。
async function toBackgroundPng(raw, out, target = 202) {
  const base = await sharp(raw).resize(W, H, { fit: 'cover', position: 'centre' }).toColourspace('srgb').png().toBuffer();
  const c = (await sharp(base).stats()).channels;
  const mean = 0.2126 * c[0].mean + 0.7152 * c[1].mean + 0.0722 * c[2].mean;
  let p = mean >= target ? 0 : (target - mean) / (255 - mean);
  p = Math.min(p, 0.82);
  const pipe = p > 0.005 ? sharp(base).linear(1 - p, 255 * p) : sharp(base);
  await pipe.png().toFile(out);
  return { mean: Math.round(mean), lift: Math.round(p * 100) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = args.exam ? EXAMS.filter(e => e.key === args.exam) : EXAMS;
  if (targets.length === 0) {
    console.error(`[error] 未知の exam-key: ${args.exam}（候補: ${EXAMS.map(e => e.key).join(', ')}）`);
    process.exit(1);
  }
  const model = args.model || null;

  // --dry-run はプロンプトを表示して終了（Codex は呼ばない）。
  if (args.dryRun) {
    for (const e of targets) {
      console.log(`# ${e.key}  (model=${model || 'codex 既定'})`);
      console.log(buildPrompt(e));
      console.log('');
    }
    return;
  }

  fs.mkdirSync(BACKGROUNDS_DIR, { recursive: true });
  let made = 0, skipped = 0, failed = 0;
  for (const e of targets) {
    const out = path.join(BACKGROUNDS_DIR, `${e.key}.png`);
    if (!args.force && fs.existsSync(out)) { console.log(`[skip] ${e.key}（既存）`); skipped++; continue; }
    const prompt = buildPrompt(e);
    console.log(`[gen] ${e.key} … (model=${model || 'codex 既定'})`);
    try {
      const raw = await withRetry(() => callCodex(model, prompt), e.key);
      const { mean, lift } = await toBackgroundPng(raw, out);
      console.log(`      → ${path.relative(ROOT, out)}  (raw輝度 ${mean} → 白ブレンド ${lift}%)`);
      made++;
    } catch (err) {
      console.error(`[fail] ${e.key}: ${err.message.slice(0, 120)}`);
      failed++;
    }
  }
  console.log(`\n[ogp-backgrounds] 完了  生成 ${made} / スキップ ${skipped} / 失敗 ${failed}`);
  console.log('  次: npm run ogp -- --all --force  で全 OGP に背景を反映 → npm run ogp-gallery で目視 QA');
}

main().catch(err => { console.error(err); process.exit(1); });
