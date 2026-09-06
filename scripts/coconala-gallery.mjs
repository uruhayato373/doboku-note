#!/usr/bin/env node
/**
 * ココナラ主力商品の追加ギャラリー画像を生成する。
 * 顧客答案・レビューは使わず、商品構成と明示した架空例だけを1200×900へ描画する。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, '.claude/config/coconala/assets');
const FONTS_DIR = path.join(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts');
const W = 1200;
const H = 900;

const el = (type, props, ...children) => ({
  type,
  props: { ...props, children: children.length <= 1 ? children[0] : children },
});
const div = (style, ...children) => el('div', { style }, ...children);

const palettes = {
  blue: { accent: '#243b63', soft: '#eef3fa', line: '#cbd7e8', ink: '#1a1d24' },
  green: { accent: '#2a7050', soft: '#edf7f1', line: '#c6dfd1', ink: '#17231d' },
};

const specs = [
  {
    file: 'gallery-1kyu-moshi-contents.png',
    eyebrow: 'R8対応｜1級土木 第2次検定',
    title: '予想模試3回分の中身',
    lead: '問題冊子＋解答解説を、各回1冊ずつ。合計PDF6冊です。',
    cards: [
      ['第1回', '経験記述2テーマ\n学科9問\n追加演習10問'],
      ['第2回', '施工計画×環境対策\nコンクリート・安全\n土工'],
      ['第3回', '工程×品質\n鉄筋型枠・盛土\n舗装'],
    ],
    footer: '各回に独自配点・自己採点欄・復習計画を収録',
    theme: 'blue',
  },
  {
    file: 'gallery-1kyu-moshi-flow.png',
    eyebrow: '丸付けで終わらせない',
    title: '1回ずつ、この順番で使う',
    lead: '本番と同じ流れを3回繰り返し、弱点を次の演習へつなげます。',
    cards: [
      ['01', '時間を計って解く\n選択→記述→見直し'],
      ['02', '解答解説で自己採点\n独自配点で現在地を確認'],
      ['03', '弱点だけ復習\n次の模試で再確認'],
    ],
    footer: '出題の的中ではなく「本番形式で使える状態」を目指す自主教材です',
    theme: 'blue',
  },
  {
    file: 'gallery-1kyu-moshi-upgrade.png',
    eyebrow: '重複購入を防ぐご案内',
    title: '模試からフルパックへ進めます',
    lead: '模試を試した後に教材を広げたい場合も、購入済み分を無駄にしません。',
    cards: [
      ['予想模試', '模試3回\n問題＋解答解説\nPDF6冊'],
      ['購入後', '購入済み額を調整\nお見積もりをご案内'],
      ['フルパック', '出題分析・模範答案\n学科攻略＋模試3回\nPDF22冊'],
    ],
    footer: 'ご希望時は「購入前の相談」からお問い合わせください',
    theme: 'blue',
  },
  {
    file: 'gallery-shindan-sample.png',
    eyebrow: '成果物サンプル｜架空例',
    title: '診断で返すのは、この3点です',
    lead: '書き換え文を渡す添削とは分け、まず減点リスクと現在地を整理します。',
    cards: [
      ['A/B/C判定', '例：B（要修正）\n理由を短く明示'],
      ['減点ワースト3', '該当箇所\nなぜ弱いか\n改善の方向性'],
      ['字数確認', '解答欄に収まるか\n短すぎないか'],
    ],
    footer: '実際の返却は、ご提出いただいた1テーマの内容に合わせて作成します',
    theme: 'blue',
  },
  {
    file: 'gallery-tensaku-sample.png',
    eyebrow: '赤入れサンプル｜架空例',
    title: '抽象表現を、現場の行動へ',
    lead: 'ご本人が回答した事実の範囲で、読み手が状況を追える文章へ整えます。',
    cards: [
      ['NG例', '安全対策を徹底し、\n第三者災害を防止した。'],
      ['確認する事実', 'どこを区画したか\n何を設置したか\n誰を配置したか'],
      ['改善の方向', '措置・数量・結果を\n本人回答から具体化'],
    ],
    footer: '経験していない工事・措置・数値をこちらで作り足すことはありません',
    theme: 'blue',
  },
  {
    file: 'gallery-1kyu-full-map.png',
    eyebrow: 'R8対応｜1級土木 第2次検定',
    title: 'フルパック22冊・145ページ',
    lead: '分析→見本→論点整理→本番演習まで、二次対策を1つにまとめました。',
    cards: [
      ['経験記述', 'テーマ別5冊\n年度別5冊\n完成答案・置換ガイド'],
      ['学科記述', '出る順5論点\n頻出事項・書き方の型'],
      ['仕上げ', '出題分析1冊\n予想模試3回\nPDF6冊'],
    ],
    footer: '出題分析と学科記述攻略はフルパック限定収録',
    theme: 'blue',
  },
];

function card([heading, body], palette) {
  return div(
    {
      width: 320,
      minHeight: 270,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      border: `3px solid ${palette.line}`,
      borderRadius: 22,
      padding: 26,
    },
    div({ fontSize: 32, color: palette.accent, marginBottom: 20 }, heading),
    div(
      { display: 'flex', flexDirection: 'column', fontSize: 27, lineHeight: 1.48, color: palette.ink },
      ...body.split('\n').map((line) => div({ display: 'flex' }, line)),
    ),
  );
}

function template(spec) {
  const palette = palettes[spec.theme];
  return div(
    {
      width: W,
      height: H,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: palette.soft,
      fontFamily: 'Noto Sans JP',
      padding: '58px 68px 50px',
      borderTop: `14px solid ${palette.accent}`,
    },
    div({ fontSize: 28, color: palette.accent, letterSpacing: 1, marginBottom: 16 }, spec.eyebrow),
    div({ fontSize: 58, lineHeight: 1.25, color: palette.ink, marginBottom: 16 }, spec.title),
    div({ fontSize: 29, lineHeight: 1.5, color: '#465064', marginBottom: 34 }, spec.lead),
    div(
      { display: 'flex', justifyContent: 'space-between', gap: 22, marginBottom: 32 },
      ...spec.cards.map((item) => card(item, palette)),
    ),
    div({ display: 'flex', alignItems: 'center', marginTop: 'auto' },
      div({ width: 34, height: 6, backgroundColor: '#d4a017', marginRight: 14, display: 'flex' }),
      div({ fontSize: 26, color: palette.accent }, spec.footer),
    ),
    div({ fontSize: 21, color: '#657086', marginTop: 18 }, 'doboku-note｜元自治体土木・技術士（建設／総監）'),
  );
}

const fonts = [
  {
    name: 'Noto Sans JP',
    data: fs.readFileSync(path.join(FONTS_DIR, 'NotoSansJP-Bold.ttf')),
    weight: 700,
    style: 'normal',
  },
];

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const spec of specs) {
  const svg = await satori(template(spec), { width: W, height: H, fonts });
  const output = path.join(OUT_DIR, spec.file);
  await sharp(Buffer.from(svg)).png().toFile(output);
  console.log(`[gallery] ${spec.file}`);
}
