#!/usr/bin/env node
/**
 * standardize-civil1-note-intro.mjs
 * ---------------------------------------------------------------------------
 * 1級土木 note 記事の冒頭（最初の `## ` より前＝note の目次より前）を標準形へそろえる。
 * 商品の案内に関わる部品だけを入れ替え、記事固有の文章（こんな人・わかること・リード文・図）は元の順で残す。
 *
 *   H1 → 著者画像（POP）→ 説明文2段落 → 記事固有の部品 → --- → ココナラ導線 → 収録元マガジン → 上位パック
 *      → 失格注意 → 土木もくじ（元からある記事だけ）
 *
 * 入れ替える部品: 著者画像・説明文2段落・バナーの締めの一文（削除）・ココナラ導線・マガジンのカードと案内文・
 * pack-top ブロック・区切り線・失格注意（末尾へ移動）。マガジンの割り当てと案内文は config/note-intro-standard.json。
 * 冒頭より後ろ（本文・末尾）は触らない。末尾の著者画像（冒頭と同じ画像の2枚目）だけは削除する（note は同じ画像2枚で更新が止まる）。
 *
 * 使い方:
 *   node scripts/standardize-civil1-note-intro.mjs                 # dry-run（件数と要確認）
 *   node scripts/standardize-civil1-note-intro.mjs --apply         # 書き込み
 *   node scripts/standardize-civil1-note-intro.mjs --only <パスの一部> [--show]   # 絞り込み・差分表示
 *   node scripts/standardize-civil1-note-intro.mjs --variant civil2 [--apply]   # 2級
 * exit: 0 成功 / 1 要確認あり（--apply でも要確認の記事は書かない）/ 2 設定エラー
 * 正典: .claude/knowledge/reference/author-authority-banner.md「1級 note の冒頭・末尾の標準形」
 * ---------------------------------------------------------------------------
 */
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { readMdxFile, writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { listFiles } from './lib/fs-walk.mjs';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const SHOW = args.includes('--show');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
// 型は config/note-intro-standard.json の variants（既定は 1級＝civil1。2級は --variant civil2）
const VARIANT = args.includes('--variant') ? args[args.indexOf('--variant') + 1] : 'civil1';
const CONFIG = readDataset(REPO_ROOT, 'config.note-intro-standard').variants[VARIANT];
if (!CONFIG) throw new Error(`${datasetPath('config.note-intro-standard')} に型 ${VARIANT} が無い`);
const ROOT = join(REPO_ROOT, CONFIG.root);
const BANNER_SRC = join(REPO_ROOT, 'content/note/共通/著者オーソリティ/img', CONFIG.banner);

export const P1 = 'この教材は、技術士（総合技術監理部門）を持つ元・地方自治体の土木職（発注者）がつくっています。1級・2級土木施工管理技士にも自分で合格しており、受験者と同じ答案を書いた当事者です。';
export const P2 = '総監の5つの管理の視点で記述を分析し、発注者として施工計画書や工事成績評定の書類を審査してきた目で「評価される書き方」を整理しています。';

/** 冒頭のブロック（空行区切り）を種類に分ける。種類は組み直しの規則にだけ使う。 */
export function classify(b) {
  if (/^# /.test(b)) return 'H1';
  if (/^!\[[^\]]*\]\(img\/figure-author-authority[^)]*\)$/.test(b)) return 'BANNER';
  if (b.startsWith('この教材は、技術士（総合技術監理部門）を持つ')) return 'P1';
  if (b.startsWith('総監の5つの管理の視点で記述を分析し')) return 'P2';
  if (b === '---') return 'HR';
  if (/^<!-- cta:coconala-custom -->/.test(b)) return 'COCO';
  if (/^https:\/\/coconala\.com\/services\/\d+$/.test(b)) return 'COCO';
  if (/^まだ答案が無い人は/.test(b)) return 'COCO';
  if (/^<!-- cta:pack-top -->/.test(b)) return 'MAG';
  if (/^https:\/\/note\.com\/dobokunote\/m\/\w+$/.test(b)) return 'MAG';
  if (/^<!-- cta:civil-mokuji -->/.test(b)) return 'MOKUJI';
  if (/^https:\/\/note\.com\/dobokunote\/n\/\w+$/.test(b)) return 'NOTEURL';
  if (/上位資格の分析力・発注者として書類を評価してきた目/.test(b)) return 'BRIDGE';
  if (/^本記事は\s*(\*\*|「)?[^。*」]{2,40}?(\*\*|」)?[^。]{0,24}の(収録記事|補充答案)です/.test(b)
    || /別マガジン|もあわせてご(覧|活用)ください/.test(b) && b.length < 260) return 'MAG';
  if (/失格/.test(b) && /経験/.test(b)) return 'DQ';
  if (/^(数値の\s*)?【?〇〇】?\s*は/.test(b) || /^本記事の答案はそのまま書き写すためのものではなく/.test(b)) return 'DQ+';
  return 'KEEP';
}

const splitBlocks = (s) => s.split(/\n[ \t]*\n/).map((b) => b.replace(/^\n+|\s+$/g, '')).filter(Boolean);

export function ruleFor(rel) {
  return CONFIG.rules.find((r) => rel.includes(r.match));
}

function magBlock(id, kind) {
  const m = CONFIG.magazines[id];
  if (!m) throw new Error(`magazines に ${id} が無い`);
  if (kind === 'home') return [`本記事は「${m.title}」の収録記事です。${m.desc}`, m.url];
  return ['<!-- cta:pack-top -->\n' + m.desc.replace(/です。$/, 'もあります。'), m.url];
}

/**
 * 冒頭を組み直す。戻り値 { intro, review[] }。review が空でなければ書き込まない。
 */
export function rebuildIntro(introRaw, rel) {
  const rule = ruleFor(rel);
  const bs = splitBlocks(introRaw);
  const review = [];
  if (!bs.length || classify(bs[0]) !== 'H1') return { intro: introRaw, review: ['冒頭が H1 で始まらない'] };
  const keep = [], dq = [], mokuji = [];
  let lastWasDq = false;
  for (let i = 1; i < bs.length; i++) {
    const b = bs[i]; const k = classify(b);
    if (k === 'DQ') { dq.push(b); lastWasDq = true; continue; }
    if (k === 'DQ+') { if (lastWasDq || dq.length) { dq.push(b); continue; } review.push(`失格注意の続きが単独: ${b.slice(0, 30)}`); continue; }
    lastWasDq = false;
    if (k === 'MOKUJI') { mokuji.push(b); if (classify(bs[i + 1] || '') === 'NOTEURL') mokuji.push(bs[++i]); continue; }
    // 上位の案内が単品記事（/n/ のカード）のとき、URL は直前の案内（MAG）の一部。2回目の実行で記事固有扱いにしない
    if (k === 'NOTEURL' && classify(bs[i - 1] || '') === 'MAG') continue;
    // 設定にある商品の URL は標準の位置に付け直すので、途中に残っていたら外す（2回目以降の実行で迷子にしない）
    if (k === 'NOTEURL' && Object.values(CONFIG.magazines).some((m) => m.url === b)) continue;
    if (['BANNER', 'P1', 'P2', 'HR', 'COCO', 'MAG', 'BRIDGE'].includes(k)) continue;
    keep.push(b);
  }
  if (rule.dq && !dq.length) review.push('失格注意が見つからない（経験記述の答案記事）');
  const lead = CONFIG.coconala.lead[rule.coconalaLead || 'default'];
  const commerce = ['<!-- cta:coconala-custom -->\n' + lead, ...CONFIG.coconala.urls];
  if (rule.home) commerce.push(...magBlock(rule.home, 'home'));
  if (rule.upper) commerce.push(...magBlock(rule.upper, 'upper'));
  const out = [bs[0], `![](img/${CONFIG.banner})`, P1, P2, ...keep, '---', ...commerce, ...dq, ...mokuji];
  return { intro: out.join('\n\n') + '\n\n', review };
}

/** 冒頭と同じ著者画像が後ろにもあれば消す（締めの一文も一緒に）。 */
export function dropTailBanners(rest) {
  return rest
    .replace(/\n*!\[[^\]]*\]\(img\/figure-author-authority[^)]*\)\n*/g, '\n\n')
    .replace(/\n*上位資格の分析力・発注者として書類を評価してきた目・合格者の当事者性で、あなたの答案を合格ラインへ引き上げます。\n*/g, '\n\n')
    // 本文側に残った旧ココナラ導線（冒頭の標準形と重複）も外す
    .replace(/\n*<!-- cta:coconala-custom -->\n[^\n]*\n(\n*(https:\/\/coconala\.com\/services\/\d+|まだ答案が無い人は[^\n]*)\n)*/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n');
}

function main() {
  let changed = 0, same = 0, reviewed = 0, scanned = 0;
  // include があれば root 直下のそのフォルダだけ（1級・2級土木/ 直下の横断記事用）
  const roots = CONFIG.include ? CONFIG.include.map((d) => join(ROOT, d)) : [ROOT];
  for (const file of roots.flatMap((r) => listFiles(r, { followLinks: true, match: (_p, name) => /^article(-[^/\\]+)?\.md$/.test(name) }))) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (ONLY && !rel.includes(ONLY)) continue;
    const { raw, eol } = readMdxFile(file);
    const s = raw.replace(/\r\n/g, '\n');
    const fm = s.match(/^---\n[\s\S]*?\n---\n/);
    if (!fm || !/^note(Url|Id):/m.test(fm[0])) continue; // 未公開は対象外
    scanned++;
    const body = s.slice(fm[0].length);
    const h2 = body.search(/^## /m);
    if (h2 < 0) { reviewed++; console.log(`[要確認] ${rel}: ## 見出しが無い`); continue; }
    const { intro, review } = rebuildIntro(body.slice(0, h2), rel);
    if (review.length) { reviewed++; console.log(`[要確認] ${rel}: ${review.join(' / ')}`); continue; }
    const next = fm[0] + intro + dropTailBanners(body.slice(h2));
    if (next === s) { same++; continue; }
    changed++;
    if (SHOW) console.log(`\n===== ${rel}\n${intro}`);
    if (APPLY) {
      writeMdxFile(file, next, eol);
      const img = join(dirname(file), 'img', CONFIG.banner);
      if (!existsSync(img)) { mkdirSync(dirname(img), { recursive: true }); copyFileSync(BANNER_SRC, img); }
    }
  }
  console.log(`[standardize-civil1-note-intro] 公開記事 ${scanned} 本を実検査 / 変更 ${changed} / 変更なし ${same} / 要確認 ${reviewed}${APPLY ? '（書き込み済み・要確認は未変更）' : '（dry-run）'}`);
  process.exit(reviewed ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
