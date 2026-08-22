/**
 * OGP 背景画像ジェネレータ（資格ごとに共有・AI 生成）。
 *
 * Gemini / Imagen API で「文字なしの落ち着いた抽象背景」を資格ごとに 1 枚生成し、
 *   .claude/config/ogp/backgrounds/<exam-key>.png （1200×630）
 * に保存する。ogp-create.mjs の resolveBackgroundImage がこのパスを拾い、
 * mono-tag テンプレが背景の上に可読性スクリム + 文字 + テーマ色枠を重ねる。
 *
 * 設計意図:
 *   - 背景は「装飾の下地」。文字は satori が正確に描くので、AI には背景だけを任せる。
 *   - 出力は OGP 上で ~82% のオフホワイトスクリムを被るため、彩度・コントラストは控えめに。
 *   - 資格ごとに 1 枚共有（全記事で使い回し）→ 生成は数枚で済み、コスト最小・統一感。
 *
 * 認証: 環境変数 GEMINI_API_KEY（または GOOGLE_API_KEY）。AI Studio で取得。
 *   ※未設定でも --dry-run 同様にプロンプトを表示して終了する（雛形として安全に動く）。
 *
 * Usage:
 *   node scripts/generate-ogp-backgrounds.mjs --dry-run            # プロンプトのみ表示（API 呼ばない）
 *   node scripts/generate-ogp-backgrounds.mjs --all                # 全資格を生成（既存はスキップ）
 *   node scripts/generate-ogp-backgrounds.mjs --exam civil-1 --force
 *   node scripts/generate-ogp-backgrounds.mjs --all --mode flash   # gemini-2.5-flash-image（Nano Banana）
 *   node scripts/generate-ogp-backgrounds.mjs --all --model imagen-4.0-generate-001
 *
 * モデル:
 *   --mode imagen (既定)  models/imagen-3.0-generate-002:predict        （text→image, aspectRatio 16:9）
 *   --mode flash          models/gemini-2.5-flash-image:generateContent （inlineData 返却）
 *   --model <id>          上記の既定モデル ID を上書き
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
// .env.local（GEMINI_API_KEY 等）を読み込む。既存スクリプトの慣習に合わせる。
dotenv.config({ path: path.join(ROOT, '.env.local') });
const BACKGROUNDS_DIR = path.join(ROOT, '.claude', 'config', 'ogp', 'backgrounds');
const coverTokens = require(path.join(ROOT, '.claude/knowledge/design-system/note-cover-tokens.json'));

const W = 1200, H = 630;
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
// 既定モデル（このキーで利用可を ListModels で確認済み, 2026-06-18）。
//   imagen-4.0-generate-001（標準）/ -fast-（速い・安い）/ -ultra-（高品質）に --model で切替可。
const DEFAULT_MODEL = { imagen: 'imagen-4.0-generate-001', flash: 'gemini-2.5-flash-image' };

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
  const a = { all: false, exam: null, force: false, dryRun: false, mode: 'imagen', model: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--all') a.all = true;
    else if (t === '--force') a.force = true;
    else if (t === '--dry-run') a.dryRun = true;
    else if (t === '--exam') a.exam = argv[++i];
    else if (t === '--mode') a.mode = argv[++i];
    else if (t === '--model') a.model = argv[++i];
  }
  if (!a.all && !a.exam) a.all = true;
  return a;
}

function buildPrompt(exam) {
  const color = coverTokens.exams?.[exam.key]?.base || '#1e3a8a';
  const label = coverTokens.exams?.[exam.key]?.label || exam.key;
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

async function callImagen(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '16:9' },
    }),
  });
  if (!res.ok) throw new Error(`imagen ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const b64 = json?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error(`imagen: 画像データが空（${JSON.stringify(json).slice(0, 300)}）`);
  return Buffer.from(b64, 'base64');
}

async function callFlash(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  // flash 画像モデルはたまに説明文だけ返す。画像のみを返すよう明示する。
  const imperative = `${prompt} Output ONLY the generated image. Do not reply with any text.`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: imperative }] }] }),
  });
  if (!res.ok) throw new Error(`flash ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const img = parts.find(p => p.inlineData?.data || p.inline_data?.data);
  const b64 = img?.inlineData?.data || img?.inline_data?.data;
  if (!b64) throw new Error(`flash: 画像データが空（${JSON.stringify(json).slice(0, 300)}）`);
  return Buffer.from(b64, 'base64');
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
  const model = args.model || DEFAULT_MODEL[args.mode];
  if (!model) {
    console.error(`[error] 未知の --mode: ${args.mode}（imagen | flash）`);
    process.exit(1);
  }

  // キー未設定 or --dry-run はプロンプトを表示して終了（API は叩かない）。
  if (!API_KEY || args.dryRun) {
    if (!API_KEY) {
      console.log('[ogp-backgrounds] GEMINI_API_KEY 未設定 → プロンプトのプレビューのみ表示します。\n');
      console.log('  本生成の準備:');
      console.log('    1) https://aistudio.google.com/apikey で API キーを取得');
      console.log('    2) export GEMINI_API_KEY=xxxx');
      console.log('    3) GCP コンソールで Generative Language API の 1日 Quota を低く設定（コスト上限）\n');
    }
    for (const e of targets) {
      console.log(`# ${e.key}  (model=${model})`);
      console.log(buildPrompt(e));
      console.log('');
    }
    return;
  }

  fs.mkdirSync(BACKGROUNDS_DIR, { recursive: true });
  const callFn = args.mode === 'flash' ? callFlash : callImagen;
  let made = 0, skipped = 0, failed = 0;
  for (const e of targets) {
    const out = path.join(BACKGROUNDS_DIR, `${e.key}.png`);
    if (!args.force && fs.existsSync(out)) { console.log(`[skip] ${e.key}（既存）`); skipped++; continue; }
    const prompt = buildPrompt(e);
    console.log(`[gen] ${e.key} … (model=${model})`);
    try {
      const raw = await withRetry(() => callFn(model, prompt), e.key);
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
