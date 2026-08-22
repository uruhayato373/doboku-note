#!/usr/bin/env node
/**
 * whitepaper-grep-check.mjs — 白書オフライン照合チェッカー
 *
 * ⚠️ 2026-06-17 退役: ローカル白書 PDF（content/sources/textbook/白書等）はユーザーが削除し、
 *    白書照合は NotebookLM 白書ノートブック（2bf7f0dd-3935-49be-8cef-2d428c59eaa9）へ移行した。
 *    本スクリプトは PDF 不在で exit 1（偽合格しない）になり、NotebookLM 代替を案内する。
 *    現行のスコープ D 手順は .claude/agents/note-fact-checker.md を参照。
 *    （PDF を再配置すれば従来どおり動作する＝完全削除はしない）
 *
 * note 記事・キーワードページ内の「白書由来の数値・固有名」が、ローカル白書 PDF の
 * 原文に実在するかを offline で grep 照合する。NotebookLM や Web に依存せず、
 * `content/sources/textbook/白書等/*.pdf` をキャッシュ付きテキスト化して突合する。
 *
 * 2026-05-29 新設。背景: 5管理クロストレードオフ マガジン制作で、NotebookLM 抽出値の
 * ハルシネーション検出をローカル白書 grep で行い成果を上げた（feedback_whitepaper_source_check）。
 * この照合を再利用可能な仕組みに固定する。note-fact-checker の「D. 外部ファクト=スコープ外」を補完。
 *
 * 使い方:
 *   # 記事を照合（数値・固有名を自動抽出して白書に存在するか確認）
 *   node .claude/scripts/whitepaper-grep-check.mjs --file content/note/.../article.md
 *   node .claude/scripts/whitepaper-grep-check.mjs --file <path> --json
 *
 *   # 特定の語/数値だけ照合
 *   node .claude/scripts/whitepaper-grep-check.mjs --terms "約3割,八潮,2,600件,群マネ"
 *
 *   # 使う白書を限定（既定: 国土交通,交通政策。部分一致でファイル名にマッチ）
 *   node .claude/scripts/whitepaper-grep-check.mjs --file <path> --papers "国土交通,交通政策,情報通信"
 *
 *   # キャッシュ再構築（PDF 更新時）
 *   node .claude/scripts/whitepaper-grep-check.mjs --rebuild-cache
 *
 * 終了コード:
 *   0  照合実行成功（未ヒット term があっても 0。判定は出力を見る）
 *   1  引数エラー / 対象ファイル不在
 *   2  PDF テキスト化失敗（pdftotext / PyMuPDF いずれも不可）
 *   5  未ヒット term が 1 件以上（--fail-on-miss 指定時のみ）
 *
 * 依存: PDF→txt 化に Python の PyMuPDF(fitz) を第一候補、pdftotext を第二候補で使う。
 *       テキストは .tmp/whitepaper-cache/<safe-name>.txt にキャッシュ（PDF より新しければ再利用）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { TEXTBOOK_SOURCES_ROOT } from '../../scripts/lib/repository-paths.mjs';

const ROOT = process.cwd();
const PDF_DIR = join(TEXTBOOK_SOURCES_ROOT, '白書等');
const CACHE_DIR = join(ROOT, '.tmp', 'whitepaper-cache');

// ---- args ----
const args = process.argv.slice(2);
function opt(name, def = null) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
}
const hasFlag = (name) => args.includes(name);

const FILE = opt('--file');
const TERMS_ARG = opt('--terms');
// 既定は国交白書＋交通施策白書（ファイル名は「交通施策白書」。"交通"で両系統に部分一致させる）
const PAPERS = (opt('--papers', '国土交通,交通施策') || '').split(',').map((s) => s.trim()).filter(Boolean);
const AS_JSON = hasFlag('--json');
const REBUILD = hasFlag('--rebuild-cache');
const FAIL_ON_MISS = hasFlag('--fail-on-miss');

// ---- PDF -> text (cached) ----
function safeName(f) {
  return f.replace(/[^\w.-]/g, '_');
}

function pdfToText(pdfPath) {
  const cachePath = join(CACHE_DIR, safeName(basename(pdfPath)) + '.txt');
  if (!REBUILD && existsSync(cachePath)) {
    if (statSync(cachePath).mtimeMs >= statSync(pdfPath).mtimeMs) {
      return readFileSync(cachePath, 'utf8');
    }
  }
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  // 第一候補: PyMuPDF (fitz) — 日本語・全角に強い。python -X utf8 で cp932 クラッシュ回避
  const py = `import sys,io\ntry:\n import fitz\n d=fitz.open(sys.argv[1])\n io.open(sys.argv[2],'w',encoding='utf-8').write('\\n'.join(p.get_text() for p in d))\n print('OK',d.page_count)\nexcept Exception as e:\n sys.stderr.write(str(e)); sys.exit(9)`;
  let r = spawnSync('python', ['-X', 'utf8', '-c', py, pdfPath, cachePath], { encoding: 'utf8' });
  if (r.status === 0 && existsSync(cachePath)) return readFileSync(cachePath, 'utf8');
  // 第二候補: pdftotext (poppler)
  r = spawnSync('pdftotext', ['-enc', 'UTF-8', pdfPath, cachePath], { encoding: 'utf8' });
  if (r.status === 0 && existsSync(cachePath)) return readFileSync(cachePath, 'utf8');
  return null;
}

function selectPdfs() {
  if (!existsSync(PDF_DIR)) return [];
  const all = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.toLowerCase().endsWith('.pdf')) all.push(p);
    }
  };
  walk(PDF_DIR);
  if (!PAPERS.length) return all;
  return all.filter((p) => PAPERS.some((kw) => basename(p).includes(kw)));
}

// ---- term extraction from article ----
// 白書照合の価値が高いのは「具体的数値（年度・地域に紐づく）」と「固有名」。
// 一般的すぎる語は除外し、誤検出を抑える。
function extractTerms(text) {
  const terms = new Set();
  // 数値+単位（割合・件数・人数・距離・台数・型式・ダム・都市・港湾・年度 等）
  const numRe = /[0-9０-９]{1,3}(?:[,，][0-9０-９]{3})*(?:\.[0-9０-９]+)?\s*(?:割|％|%|件|人|人・日|万人|億|兆|km|台|型式|ダム|都市|港湾|海域|か所|団体|市町村|年度|時間|分)/g;
  let m;
  while ((m = numRe.exec(text))) terms.add(m[0].replace(/\s+/g, ''));
  // 固有名（白書頻出の施策・事業・事案名。カタカナ/英字混じりの固有表現＋代表的キーワード）
  const NAMED = [
    '八潮', '群マネ', '地域インフラ群再生戦略マネジメント', 'ウォーターPPP', '成瀬ダム', 'A4CSEL',
    'i-Construction', 'CCUS', '建設ディレクター', 'TEC-FORCE', '名古屋港', 'サイバーポート', 'CONPAS',
    '流域治水', '田んぼダム', '盛土規制法', '貯留機能保全区域', '洋上風力', '基地港湾', 'PLATEAU',
    'Project LINKS', '空間ID', '橋ログ', 'My水アプリ', 'スーパーフェニックス', 'ハイブリッドダム',
    'GX建設機械', 'ダブル連結トラック', 'エコレールマーク', 'Park-PFI', '十勝バス', '下仁田',
    '平田村', '足利市', '豊田市', '伊予鉄', '第三次・担い手3法', '建設Gメン', 'ライドシェア',
  ];
  for (const n of NAMED) if (text.includes(n)) terms.add(n);
  return [...terms];
}

// ---- main ----
if (!FILE && !TERMS_ARG && !REBUILD) {
  console.error('usage: --file <path> | --terms "a,b,c" | --rebuild-cache  [--papers ..] [--json] [--fail-on-miss]');
  process.exit(1);
}

const pdfs = selectPdfs();
if (!pdfs.length) {
  console.error(`No matching PDFs under ${PDF_DIR} (papers filter: ${PAPERS.join(',') || 'all'})`);
  console.error(`[DEPRECATED] ローカル白書 PDF は 2026-06-17 に削除済み。白書照合は NotebookLM へ移行しました。`);
  console.error(`  代替: node .claude/scripts/notebooklm-cross-query.mjs --notebook-id 2bf7f0dd-3935-49be-8cef-2d428c59eaa9 "<数値・固有名の実在確認>"`);
  console.error(`  詳細: .claude/agents/note-fact-checker.md スコープ D`);
  process.exit(1);
}

// 照合は空白・改行を除去した正規化テキストで行う（白書 PDF は数値と単位の間に空白が入る:
// 「30 年間」「11 件 40 地方公共団体」など。これを吸収しないと false-positive miss が出る）。
const normalize = (s) => s.replace(/[\s　]/g, '');

const corpora = {};
let anyText = false;
for (const p of pdfs) {
  const t = pdfToText(p);
  if (t) {
    corpora[basename(p)] = normalize(t);
    anyText = true;
  } else {
    console.error(`WARN: could not extract text from ${basename(p)}`);
  }
}
if (!anyText) {
  console.error('FATAL: no PDF could be converted to text (need PyMuPDF or pdftotext)');
  process.exit(2);
}

if (REBUILD && !FILE && !TERMS_ARG) {
  console.log(`cache rebuilt for ${Object.keys(corpora).length} papers`);
  process.exit(0);
}

let terms;
if (TERMS_ARG) terms = TERMS_ARG.split(',').map((s) => s.trim()).filter(Boolean);
else {
  if (!existsSync(FILE)) {
    console.error(`file not found: ${FILE}`);
    process.exit(1);
  }
  terms = extractTerms(readFileSync(FILE, 'utf8'));
}

// 全角/半角・カンマ・空白ゆれを吸収して照合（corpora は normalize 済みなので term 側も合わせる）
function variants(term) {
  const t = normalize(term);
  const half = t.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/，/g, ',');
  const full = t.replace(/[0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0)).replace(/,/g, '，');
  // カンマ無し版も追加（白書は「2,600」「2600」表記ゆれがある）
  const noComma = half.replace(/[,，]/g, '');
  return [...new Set([t, half, full, noComma])];
}

const results = [];
for (const term of terms) {
  const vs = variants(term);
  const hits = [];
  for (const [paper, text] of Object.entries(corpora)) {
    for (const v of vs) {
      if (v && text.includes(v)) { hits.push(paper); break; }
    }
  }
  results.push({ term, found: hits.length > 0, papers: [...new Set(hits)] });
}

const misses = results.filter((r) => !r.found);

if (AS_JSON) {
  console.log(JSON.stringify({ file: FILE || null, papers: Object.keys(corpora), total: results.length, miss: misses.length, results }, null, 2));
} else {
  console.log(`=== whitepaper-grep-check ===`);
  console.log(`papers: ${Object.keys(corpora).join(', ')}`);
  console.log(`terms checked: ${results.length} | FOUND ${results.length - misses.length} | MISS ${misses.length}\n`);
  for (const r of results) {
    const mark = r.found ? 'OK  ' : 'MISS';
    console.log(`[${mark}] ${r.term}${r.found ? '  <- ' + r.papers.join(',') : ''}`);
  }
  if (misses.length) {
    console.log(`\n要確認（白書原文で未ヒット = 表記ゆれ or 出典外 or 要再確認）:`);
    for (const r of misses) console.log(`  - ${r.term}`);
  }
}

process.exit(FAIL_ON_MISS && misses.length ? 5 : 0);
