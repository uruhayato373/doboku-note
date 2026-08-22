#!/usr/bin/env node
/**
 * ガイドカバー写真ジェネレータ（資格ごとにプール・AI 生成）。
 *
 * ⚠️ 2026-07-07 廃止（dormant）: 生成プール（public/images/guide-covers/**）は
 *   AI 生成バッチに猫/場違い画像が混入したため一旦廃止し、記事カードのサムネは
 *   記事別 OGP（getOgpImageUrl）へ一本化した（src/app/page.tsx / RelatedArticleCard 参照）。
 *   本ジェネレータは復活用に温存。再開するなら: プロンプト厳格化で再生成 →
 *   card-image.ts 相当のセレクタ + page.tsx の image 解決を戻す。
 *
 * Gemini / Imagen API で「文字なしのプロフェッショナルな土木/建設シーン写真」を資格ごとに
 * 複数枚生成し、
 *   public/images/guide-covers/<category-slug>/<n>.webp （16:9・1024×576）
 * に保存する。DocCard（ガイド記事）が slug ハッシュでプールから1枚選んでカバー表示する。
 *
 * 設計意図:
 *   - ガイドのカード装飾用。AI 生成＝出典/ライセンス表記不要・資格テーマで統一感・調達最速。
 *   - 文字は焼かない（カードのタイトルは別途 DOM で描く）。人物の顔は避ける。
 *   - 1 資格 ~5 枚プール → カテゴリ内で写真が変化（単調回避）。
 *
 * 認証: 環境変数 GEMINI_API_KEY（または GOOGLE_API_KEY）。.env.local から読む。
 *   ※未設定 or --dry-run ではプロンプトのみ表示して終了（API 呼ばない＝課金なし）。
 *
 * Usage:
 *   node scripts/generate-guide-covers.mjs --dry-run              # プロンプトのみ（課金なし）
 *   node scripts/generate-guide-covers.mjs --all                  # 全資格生成（既存スキップ）
 *   node scripts/generate-guide-covers.mjs --category civil-construction-1 --force
 *   node scripts/generate-guide-covers.mjs --all --mode flash     # gemini-2.5-flash-image
 *
 * モデル: --mode imagen（既定 imagen-4.0-generate-001）/ --mode flash（gemini-2.5-flash-image）
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';

const ROOT = process.cwd();
dotenv.config({ path: path.join(ROOT, '.env.local') });
const OUT_ROOT = path.join(ROOT, 'public', 'images', 'guide-covers');
const W = 1024, H = 576;
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
const DEFAULT_MODEL = { imagen: 'imagen-4.0-generate-001', flash: 'gemini-2.5-flash-image' };

const STYLE =
  'Professional editorial photograph, clean composition, soft natural daylight, muted realistic ' +
  'color palette, shallow depth of field, no text, no watermark, no logos, no readable signage, ' +
  'no human faces, high quality, civil engineering and construction theme.';

// 資格（category slug）ごとのカバー写真モチーフ（プール）。
const COVERS = {
  'civil-construction-1': [
    'A tower crane on a large civil construction site against a clear sky',
    'Asphalt paving machinery laying a new road surface',
    'A reinforced concrete bridge under construction with formwork',
    'A surveying total station on a tripod at a construction site',
    'A hydraulic excavator performing earthwork on a building site',
  ],
  'civil-construction-2': [
    'A medium-scale road construction site with a tandem roller compacting asphalt',
    'Concrete drainage culvert and channel construction work',
    'Scaffolding and safety netting on a small civil works site',
    'A bulldozer moving earth on a site-preparation jobsite',
    'Freshly placed concrete kerb and gutter along a new road',
  ],
  'pe-comprehensive-management': [
    'Aerial view of an infrastructure network of highways and bridges at dusk',
    'An overhead flat-lay of engineering blueprints, ruler and pen on a desk',
    'A wide modern cityscape with rivers, bridges and roads from above',
    'Abstract geometric grid and contour lines suggesting systems management',
    'A wide aerial of a large dam and reservoir managing water resources',
  ],
  'pe-construction': [
    'A long cable-stayed bridge spanning a wide river',
    'A river embankment with a flood control gate and levee',
    'An aerial view of a multi-level highway interchange',
    'A tunnel portal entrance through a mountainside',
    'An aerial view of an urban district with planned roads and blocks',
  ],
  'pe-first-stage': [
    'An engineering study desk with a calculator, drafting tools and rolled drawings',
    'A close-up of technical drafting on graph paper with drawing instruments',
    'A structural steel truss against the sky, geometric and clean',
    'A materials testing laboratory with concrete and steel specimens',
    'An overhead of an open engineering textbook with a notebook and pen',
  ],
  'concrete-chief-engineer': [
    'Fresh concrete being poured and screeded at a construction site',
    'A close-up of a dense steel reinforcement rebar grid before concreting',
    'A concrete mixer truck delivering concrete on site',
    'A yard of stacked precast concrete elements',
    'A macro texture of hardened concrete showing aggregate',
  ],
  'concrete-diagnostician': [
    'An engineer in gloves inspecting a crack on a concrete structure, no face',
    'The underside of a concrete bridge deck during a close inspection',
    'A concrete core sample next to testing equipment',
    'Weathered concrete with exposed corroded reinforcement bars',
    'Non-destructive ultrasonic testing equipment placed on a concrete surface',
  ],
};

function parseArgs(argv) {
  const a = { all: false, category: null, force: false, dryRun: false, mode: 'imagen', model: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--all') a.all = true;
    else if (t === '--force') a.force = true;
    else if (t === '--dry-run') a.dryRun = true;
    else if (t === '--category') a.category = argv[++i];
    else if (t === '--mode') a.mode = argv[++i];
    else if (t === '--model') a.model = argv[++i];
  }
  if (!a.all && !a.category) a.all = true;
  return a;
}

function buildPrompt(motif) {
  return `${motif}. ${STYLE}`;
}

async function callImagen(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: '16:9' } }),
  });
  if (!res.ok) throw new Error(`imagen ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const b64 = json?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error(`imagen: 画像データが空（${JSON.stringify(json).slice(0, 300)}）`);
  return Buffer.from(b64, 'base64');
}

async function callFlash(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  const imperative = `${prompt} Output ONLY the generated image. Do not reply with any text.`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: imperative }] }] }),
  });
  if (!res.ok) throw new Error(`flash ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
  const b64 = img?.inlineData?.data || img?.inline_data?.data;
  if (!b64) throw new Error(`flash: 画像データが空（${JSON.stringify(json).slice(0, 300)}）`);
  return Buffer.from(b64, 'base64');
}

async function withRetry(fn, label, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.warn(`  [retry ${i + 1}/${tries}] ${label}: ${String(e.message).slice(0, 120)}`);
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cats = args.category ? [args.category] : Object.keys(COVERS);
  const unknown = cats.filter((c) => !COVERS[c]);
  if (unknown.length) {
    console.error(`[error] 未知の category: ${unknown.join(', ')}（候補: ${Object.keys(COVERS).join(', ')}）`);
    process.exit(1);
  }

  const mode = args.mode === 'flash' ? 'flash' : 'imagen';
  const model = args.model || DEFAULT_MODEL[mode];
  const callFn = mode === 'flash' ? callFlash : callImagen;

  const total = cats.reduce((n, c) => n + COVERS[c].length, 0);
  console.log(`[guide-covers] ${cats.length} カテゴリ・計 ${total} 枚（mode=${mode}, model=${model}）\n`);

  if (args.dryRun || !API_KEY) {
    if (!API_KEY && !args.dryRun) console.log('[note] GEMINI_API_KEY 未設定 → dry-run と同じくプロンプト表示のみ\n');
    for (const cat of cats) {
      console.log(`# ${cat}`);
      COVERS[cat].forEach((motif, i) => console.log(`  [${i + 1}] ${buildPrompt(motif)}`));
      console.log('');
    }
    console.log('[dry-run] API 呼び出しなし・課金なし。本生成は --all（--dry-run なし）で実行。');
    return;
  }

  for (const cat of cats) {
    const dir = path.join(OUT_ROOT, cat);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < COVERS[cat].length; i++) {
      const out = path.join(dir, `${i + 1}.webp`);
      if (fs.existsSync(out) && !args.force) {
        console.log(`  skip（存在）: ${cat}/${i + 1}.webp`);
        continue;
      }
      const prompt = buildPrompt(COVERS[cat][i]);
      const raw = await withRetry(() => callFn(model, prompt), `${cat}/${i + 1}`);
      await sharp(raw).resize(W, H, { fit: 'cover', position: 'centre' }).webp({ quality: 80 }).toFile(out);
      console.log(`  ✓ ${cat}/${i + 1}.webp`);
    }
  }
  console.log('\n[done] public/images/guide-covers/ に出力。config 反映は build-guide-cover-pool（または手動）。');
}

main().catch((e) => {
  console.error('[fatal]', e.message);
  process.exit(1);
});
