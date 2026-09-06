#!/usr/bin/env node
/**
 * coconala-thumb.mjs — ココナラ商品画像（サービスサムネ）を satori で生成
 * ---------------------------------------------------------------------------
 * ブランド流儀（brand-image-system）に沿い「AI 生成の雰囲気写真（文字なし）」を背景に、
 * サービス名・訴求・価格を satori/HTML で正確に重ねる（AI に日本語を焼き込ませない）。
 * キャンバス 1200×900（4:3・ココナラのサービス画像比率）。
 *
 * 使い方:
 *   node scripts/coconala-thumb.mjs --service coconala-shindan --bg .tmp/coconala/bg-civil.png --out .tmp/coconala/thumb-shindan.png
 *   （--service 省略時は全サービスを既定 bg で生成）
 *
 * テキストはカタログ（価格）＋下記 THUMB_COPY（サムネ用の短い訴求）から。
 * ---------------------------------------------------------------------------
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';
import { readCatalog, readListings } from './lib/coconala-session.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTS_DIR = path.join(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts');
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };

const W = 1200, H = 900;
const NAVY = '#243b63';       // eyebrow / 見出し系
const INK = '#1a1d24';        // 本文濃色
const SUB = '#41485a';        // サブ
const AMBER = '#d4a017';      // CTA（価格チップ・editorial CTA 色）

// ---------------------------------------------------------------------------
// 級別テーマ＋商品別クロップ（2026-08-05）
//   背景はブランド背景マスター（brand-image-system・Codex 生成済み・資格別 tint）を再利用する。
//   civil-1=青トーン（高架橋とクレーン）/ civil-2=緑トーン（盛土とローラ）。級で写真も色も変わる。
//   同じ級でも商品ラインごとにクロップ窓をずらし、一覧で並んだとき見分けがつくようにする。
//   アクセント（上部バー・eyebrow）は級 tint 系、価格チップの AMBER は CTA 色として共通維持。
// ---------------------------------------------------------------------------
const BG_WIDE = {
  'civil-1': '.claude/config/ogp/backgrounds/civil-1.png', // 1600×667
  'civil-2': '.claude/config/ogp/backgrounds/civil-2.png',
};
const THEMES = {
  default: { bar: NAVY, eyebrow: NAVY },
  'civil-2': { bar: '#2a7050', eyebrow: '#215a40' }, // brand tint #2a7050（緑）系
};
// wide 1600×667 から 4:3（889×667）をどの x から切るか（右端 = 1600-889 = 711）
const CROP_X = { moshi: 711, kanseitoan: 380, full: 560, premium: 200 };

/** id → 商品ライン（クロップ窓の選択キー）。該当なしは null＝既定 bg をそのまま使う */
function productLine(id) {
  if (id.includes('premium')) return 'premium';
  if (id.includes('moshi')) return 'moshi';
  if (id.includes('kanseitoan')) return 'kanseitoan';
  if (id.includes('full')) return 'full';
  return null;
}

/** 級別 wide マスターから商品ライン別の窓を切り出して 1200×900 の data URI にする */
async function croppedBgDataUri(examKey, line) {
  const src = path.join(ROOT, BG_WIDE[examKey]);
  const x = CROP_X[line] ?? 560;
  const buf = await sharp(src)
    .extract({ left: x, top: 0, width: 889, height: 667 })
    .resize(W, H)
    .png()
    .toBuffer();
  return `data:image/png;base64,${buf.toString('base64')}`;
}

// サムネ用の短い訴求コピー（カタログの正式タイトルとは別＝クリック訴求に最適化）
const THUMB_COPY = {
  'coconala-sokan-bunseki-pdf': {
    eyebrow: '技術士総合技術監理部門 ／ 記述式 必須科目I-2',
    title: ['総監 出題', 'テーマ分析'],
    hook: '令和6〜8年度の実績から\n設問3の型と出やすいテーマの読み方',
    priceLabel: 'PDF',
  },
  'coconala-civil-keiken-kit': {
    eyebrow: '1級・2級土木施工管理技士 ／ 第2次検定 経験記述',
    title: ['経験記述', 'AI設計キット'],
    hook: '自分の工事経験から答案を組み立てる\nテンプレ＋検査スクリプト一式（要PC）',
    priceLabel: 'DLキット一式',
  },
  'coconala-shindan': {
    eyebrow: '1級・2級土木施工管理技士 ／ 第2次検定 経験記述',
    title: ['経験記述', '合格診断'],
    hook: '元自治体土木（発注者側）が\n減点ポイント ワースト3 を即指摘',
    priceLabel: '1テーマ診断',
  },
  'coconala-tensaku-set': {
    eyebrow: '1級・2級土木施工管理技士 ／ 第2次検定 経験記述',
    title: ['経験記述 添削', '2テーマセット'],
    hook: '工種別の完成答案100本超を書いた\n発注者視点で赤入れ＋書き直し1回',
    priceLabel: '2テーマ・書き直し1回込み',
  },
  'coconala-sakusei': {
    eyebrow: '1級・2級土木施工管理技士 ／ 第2次検定 経験記述',
    title: ['経験記述', 'ヒアリング構成'],
    hook: '質問シートに答えるだけ。\nあなたの実工事を読み手に伝わる答案に',
    priceLabel: '2テーマ・書き直し1回込み',
  },
  'coconala-sakusei-4theme': {
    eyebrow: '1級・2級土木施工管理技士 ／ 第2次検定 経験記述',
    title: ['経験記述', '4テーマ構成'],
    hook: '当日どの2テーマが出ても大丈夫。\n実工事を4テーマ分そろえて備える',
    priceLabel: '4テーマ・書き直し1回込み／週1名',
  },
  'coconala-1kyu-premium': {
    eyebrow: '1級土木施工管理技士 ／ 第2次検定 教材＋添削',
    title: ['教材一式', '＋経験記述添削'],
    hook: 'PDF22冊(145ページ)で書き方を掴み\nあなたの答案を発注者視点で赤入れ',
    priceLabel: '添削2テーマ・書き直し1回込み／週1名',
  },
  'coconala-1kyu-full-pdf': {
    eyebrow: '1級土木施工管理技士 ／ 第2次検定 対策PDF',
    title: ['二次 教材', 'フルパック'],
    hook: '分析・模範答案・学科・模試の全部入り\nPDF 22冊（分析と学科はパック限定）',
    priceLabel: 'PDF 22冊・全部入り',
  },
  'coconala-2kyu-full-pdf': {
    eyebrow: '2級土木施工管理技士 ／ 第2次検定 対策PDF',
    title: ['二次 教材', 'フルパック'],
    hook: '模範答案・学科・模試の全部入り\nPDF 19冊（学科攻略はパック限定）',
    priceLabel: 'PDF 19冊・全部入り',
  },
  'coconala-bunseki-pdf': {
    eyebrow: '1級土木施工管理技士 ／ 第2次検定 対策PDF',
    title: ['二次 出題分析', '＋直前重点 PDF'],
    hook: '令和3〜7年度の実績から\n直前2週間の攻め所を日割りで',
    priceLabel: 'PDF・約6,000字／6ページ',
  },
  'coconala-kanseitoan-pdf': {
    eyebrow: '1級土木施工管理技士 ／ 第2次検定 経験記述',
    title: ['経験記述', '模範答案セット'],
    hook: 'テーマ別5冊＋年度別5冊の見本答案\n完成答案例＋NG→合格＋置換ガイド',
    priceLabel: 'PDF 10冊・テーマ別＋年度別',
  },
  'coconala-2kyu-kanseitoan-pdf': {
    eyebrow: '2級土木施工管理技士 ／ 第2次検定 経験記述',
    title: ['経験記述', '模範答案セット'],
    hook: 'テーマ別3冊＋年度別5冊の見本答案\n完成答案例＋NG→合格＋置換ガイド',
    priceLabel: 'PDF 8冊・テーマ別＋年度別',
  },
  'coconala-1kyu-kakomon-pdf': {
    eyebrow: '1級土木施工管理技士 ／ 第2次検定 経験記述',
    title: ['経験記述 過去問', '模範答案 PDF'],
    hook: '令和3〜7年度・年度別の\n出題テーマに沿った想定工事の模範答案',
    priceLabel: 'PDF 5本・R03-R07',
  },
  'coconala-2kyu-kakomon-pdf': {
    eyebrow: '2級土木施工管理技士 ／ 第2次検定 経験記述',
    title: ['経験記述 過去問', '模範答案 PDF'],
    hook: '令和3〜7年度・年度別の\n出題テーマに沿った想定工事の模範答案',
    priceLabel: 'PDF 5本・R03-R07',
  },
  'coconala-1kyu-gakka-pdf': {
    eyebrow: '1級土木施工管理技士 ／ 第2次検定 学科記述',
    title: ['二次 学科記述', '出る順 攻略 PDF'],
    hook: '出る順論点（頻度分析）＋書き方の型\n＋直前チェックの頻出語句',
    priceLabel: 'PDF 5本・5論点',
  },
  'coconala-2kyu-gakka-pdf': {
    eyebrow: '2級土木施工管理技士 ／ 第2次検定 学科記述',
    title: ['二次 学科記述', '出る順 攻略 PDF'],
    hook: '出る順論点（頻度分析）＋書き方の型\n＋直前チェックの頻出語句',
    priceLabel: 'PDF 5本・5論点',
  },
  'coconala-1kyu-moshi-pdf': {
    eyebrow: '1級土木施工管理技士 ／ 第2次検定',
    title: ['R8 二次予想', '模試 3回分'],
    hook: '本番形式3回・問題＋解答解説の6冊\n選択問題・時間配分・自己採点まで一体化',
    priceLabel: 'PDF 6冊',
  },
  'coconala-2kyu-moshi-pdf': {
    eyebrow: '2級土木施工管理技士 ／ 第2次検定',
    title: ['R8 二次予想', '模試 3回分'],
    hook: '本番形式3回・問題＋解答解説の6冊\n必須4問＋選択2問を120分で通し演習',
    priceLabel: 'PDF 6冊',
  },
};

function loadFonts() {
  return [
    { name: 'Noto Sans JP', data: fs.readFileSync(path.join(FONTS_DIR, 'NotoSansJP-Bold.ttf')), weight: 700, style: 'normal' },
    { name: 'Inter', data: fs.readFileSync(path.join(FONTS_DIR, 'Inter-Bold.ttf')), weight: 700, style: 'normal' },
  ];
}

function bgDataUri(bgPath) {
  const buf = fs.readFileSync(path.isAbsolute(bgPath) ? bgPath : path.join(ROOT, bgPath));
  return `data:image/png;base64,${buf.toString('base64')}`;
}

/** satori 要素ツリー（軽量 JSX 相当のオブジェクト）。hasOptions=true なら価格に「〜」を付ける */
function template(copy, priceYen, bgUri, hasOptions, theme = THEMES.default) {
  const el = (type, props, ...children) => ({ type, props: { ...props, children: children.length <= 1 ? children[0] : children } });
  const div = (style, ...ch) => el('div', { style }, ...ch);
  const priceStr = '¥' + Number(priceYen).toLocaleString('en-US');

  return div(
    { width: W, height: H, display: 'flex', position: 'relative', fontFamily: 'Noto Sans JP' },
    // 背景写真
    el('img', { src: bgUri, width: W, height: H, style: { position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' } }),
    // 左スクリム（左を明るく＝文字可読性）
    div({ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex',
      // 級別マスターは絵柄がクロップごとに変わるため、テキスト帯（左 ~63%）は不透明寄りに保つ
      backgroundImage: 'linear-gradient(100deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.95) 52%, rgba(255,255,255,0.72) 66%, rgba(255,255,255,0) 84%)' }),
    // 上下アクセントバー（ブランド・級別 tint）
    div({ position: 'absolute', top: 0, left: 0, width: W, height: 12, display: 'flex', backgroundColor: theme.bar }),
    // コンテンツ
    div({ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      width: 760, height: H, paddingLeft: 72, paddingRight: 24 },
      // eyebrow
      div({ display: 'flex', alignItems: 'center', marginBottom: 22 },
        div({ width: 40, height: 6, backgroundColor: AMBER, marginRight: 14, display: 'flex' }),
        div({ fontSize: 26, color: theme.eyebrow, letterSpacing: 1 }, copy.eyebrow),
      ),
      // title（2行）。最長行の重み付き幅（半角=0.55）でフォントを自動調整（折返し崩れ防止）
      ...(() => {
        const w = (s) => [...s].reduce((a, c) => a + (/[ -~]/.test(c) ? 0.55 : 1), 0);
        const maxW = Math.max(...copy.title.map(w));
        const titleFont = maxW <= 6.5 ? 92 : maxW <= 8 ? 74 : 62;
        return [div({ display: 'flex', flexDirection: 'column', marginBottom: 26 },
          ...copy.title.map((line) => div({ fontSize: titleFont, lineHeight: 1.14, color: INK }, line)))];
      })(),
      // hook
      div({ display: 'flex', flexDirection: 'column', marginBottom: 40 },
        ...copy.hook.split('\n').map((line) => div({ fontSize: 34, lineHeight: 1.5, color: SUB }, line)),
      ),
      // 価格チップ
      div({ display: 'flex', alignItems: 'flex-end' },
        div({ display: 'flex', alignItems: 'baseline', backgroundColor: AMBER, paddingTop: 12, paddingBottom: 14, paddingLeft: 28, paddingRight: 28, borderRadius: 14 },
          div({ fontSize: 62, color: '#ffffff', fontFamily: 'Inter' }, priceStr),
          ...(hasOptions ? [div({ fontSize: 30, color: '#ffffff', marginLeft: 10 }, '〜')] : []),
        ),
        div({ fontSize: 24, color: SUB, marginLeft: 20, marginBottom: 10, display: 'flex' }, copy.priceLabel),
      ),
      // footer
      div({ position: 'absolute', bottom: 40, left: 72, display: 'flex', alignItems: 'center' },
        div({ fontSize: 24, color: theme.eyebrow }, '運営：doboku-note（元自治体土木・技術士総合技術監理）'),
      ),
    ),
  );
}

async function render(serviceId, bgUri, outPath, priceYen, hasOptions, theme, note) {
  const copy = THUMB_COPY[serviceId];
  if (!copy) throw new Error('THUMB_COPY 未定義: ' + serviceId);
  const svg = await satori(template(copy, priceYen, bgUri, hasOptions, theme), {
    width: W, height: H, fonts: loadFonts(),
  });
  const abs = path.isAbsolute(outPath) ? outPath : path.join(ROOT, outPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(abs);
  console.log(`[thumb] ${serviceId} → ${outPath}  (¥${priceYen} / ${note})`);
}

/**
 * サービスの examScope と商品ラインから背景（data URI）とテーマを決める。
 * - 単一資格（civil-1 / civil-2）かつ商品ラインが判定できる → 級別マスターの商品別クロップ
 * - それ以外（S系の 1級2級 兼用・総監・kit）→ 既定 bg をそのまま（従来どおり）
 */
async function resolveVisual(id, svc, bgOverride) {
  if (bgOverride) return { uri: bgDataUri(bgOverride), theme: THEMES.default, note: 'bg=指定' };
  const scope = svc.examScope ?? [];
  const line = productLine(id);
  const examKey = scope.length === 1 ? scope[0] : null;
  if (examKey && BG_WIDE[examKey] && line) {
    return {
      uri: await croppedBgDataUri(examKey, line),
      theme: THEMES[examKey] ?? THEMES.default,
      note: `bg=${examKey} crop=${line}`,
    };
  }
  return { uri: bgDataUri(DEFAULT_BG), theme: THEMES.default, note: 'bg=既定(共通)' };
}

const catalog = readCatalog();
const listings = readListings();
const DEFAULT_BG = '.claude/config/coconala/assets/bg-civil.png';
const bgOverride = getArg('--bg');
const only = getArg('--service');
const targets = only ? [only] : Object.keys(THUMB_COPY);
for (const id of targets) {
  const svc = catalog[id];
  if (!svc) { console.error('カタログに無い: ' + id); continue; }
  const hasOptions = (listings[id]?.options || []).length > 0;
  const out = getArg('--out') || `.claude/config/coconala/assets/thumb-${id.replace('coconala-', '')}.png`;
  const { uri, theme, note } = await resolveVisual(id, svc, bgOverride);
  await render(id, uri, out, svc.priceYen, hasOptions, theme, note);
}
