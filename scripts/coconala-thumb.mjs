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
    hook: '工種別の完成答案100本超を書いた\n採点者視点で赤入れ＋書き直し1回',
    priceLabel: '2テーマ・書き直し1回込み',
  },
  'coconala-sakusei': {
    eyebrow: '1級・2級土木施工管理技士 ／ 第2次検定 経験記述',
    title: ['経験記述 答案作成', 'ヒアリング→文章化'],
    hook: '質問シートに答えるだけ。\nあなたの実工事を採点者に伝わる答案に',
    priceLabel: '2テーマ・書き直し1回込み',
  },
  'coconala-1kyu-full-pdf': {
    eyebrow: '1級土木施工管理技士 ／ 第2次検定 対策PDF',
    title: ['二次 教材', 'フルパック'],
    hook: '分析・模範答案・学科・模試の全部入り\nPDF 18冊（分析と学科はパック限定）',
    priceLabel: 'PDF 18冊・全部入り',
  },
  'coconala-2kyu-full-pdf': {
    eyebrow: '2級土木施工管理技士 ／ 第2次検定 対策PDF',
    title: ['二次 教材', 'フルパック'],
    hook: '模範答案・学科・模試の全部入り\nPDF 15冊（学科攻略はパック限定）',
    priceLabel: 'PDF 15冊・全部入り',
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
    title: ['二次 予想', '模擬試験 PDF'],
    hook: '本番形式1回分（経験記述2テーマ＋学科記述）\n＋解答解説・自己採点ガイド',
    priceLabel: '問題＋解答解説 PDF',
  },
  'coconala-2kyu-moshi-pdf': {
    eyebrow: '2級土木施工管理技士 ／ 第2次検定',
    title: ['二次 予想', '模擬試験 PDF'],
    hook: '本番形式1回分（経験記述2テーマ＋学科記述）\n＋解答解説・自己採点ガイド',
    priceLabel: '問題＋解答解説 PDF',
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
function template(copy, priceYen, bgUri, hasOptions) {
  const el = (type, props, ...children) => ({ type, props: { ...props, children: children.length <= 1 ? children[0] : children } });
  const div = (style, ...ch) => el('div', { style }, ...ch);
  const priceStr = '¥' + Number(priceYen).toLocaleString('en-US');

  return div(
    { width: W, height: H, display: 'flex', position: 'relative', fontFamily: 'Noto Sans JP' },
    // 背景写真
    el('img', { src: bgUri, width: W, height: H, style: { position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' } }),
    // 左スクリム（左を明るく＝文字可読性）
    div({ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex',
      backgroundImage: 'linear-gradient(100deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0.55) 60%, rgba(255,255,255,0) 78%)' }),
    // 上下アクセントバー（ブランド）
    div({ position: 'absolute', top: 0, left: 0, width: W, height: 12, display: 'flex', backgroundColor: NAVY }),
    // コンテンツ
    div({ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      width: 760, height: H, paddingLeft: 72, paddingRight: 24 },
      // eyebrow
      div({ display: 'flex', alignItems: 'center', marginBottom: 22 },
        div({ width: 40, height: 6, backgroundColor: AMBER, marginRight: 14, display: 'flex' }),
        div({ fontSize: 26, color: NAVY, letterSpacing: 1 }, copy.eyebrow),
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
        div({ fontSize: 24, color: NAVY }, '運営：doboku-note（元自治体土木・技術士総合技術監理）'),
      ),
    ),
  );
}

async function render(serviceId, bgPath, outPath, priceYen, hasOptions) {
  const copy = THUMB_COPY[serviceId];
  if (!copy) throw new Error('THUMB_COPY 未定義: ' + serviceId);
  const svg = await satori(template(copy, priceYen, bgDataUri(bgPath), hasOptions), {
    width: W, height: H, fonts: loadFonts(),
  });
  const abs = path.isAbsolute(outPath) ? outPath : path.join(ROOT, outPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(abs);
  console.log(`[thumb] ${serviceId} → ${outPath}  (¥${priceYen})`);
}

const catalog = readCatalog();
const listings = readListings();
const BG = getArg('--bg') || '.claude/config/coconala/assets/bg-civil.png';
const only = getArg('--service');
const targets = only ? [only] : Object.keys(THUMB_COPY);
for (const id of targets) {
  const svc = catalog[id];
  if (!svc) { console.error('カタログに無い: ' + id); continue; }
  const hasOptions = (listings[id]?.options || []).length > 0;
  const out = getArg('--out') || `.claude/config/coconala/assets/thumb-${id.replace('coconala-', '')}.png`;
  await render(id, BG, out, svc.priceYen, hasOptions);
}
