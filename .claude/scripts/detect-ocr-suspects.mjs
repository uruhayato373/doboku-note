#!/usr/bin/env node
// .claude/scripts/detect-ocr-suspects.mjs
//
// 過去問 MDX 全ファイルを走査し、OCR 誤読の疑いがあるテキスト断片を
// 候補として抽出する。
//
// 出力:
//   .claude/state/ocr-audit/YYYY-MM-DD.json    (機械可読)
//   stdout にサマリ
//
// 検出ヒューリスティクス:
//   1. よくある OCR 誤読ペア（手/千、機/棟、象/像、取/耳 等）— 候補なのでこれ単独では確信度低
//   2. 文字種遷移の異常（漢字文脈内に非漢字の 1 字混入）
//   3. 全コーパス内で 1 回しか現れない珍しい 2-3 字熟語（希少語フィルタ）
//   4. 全角半角数字混在（日本語本文で半角数字が浮いている等）
//
// 使い方:
//   node .claude/scripts/detect-ocr-suspects.mjs
//
// 真因追跡は人手でやる想定。本スクリプトは候補をできるだけ拾って提示する側。

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';

const ROOT = process.cwd();
const POSTS_ROOT = join(ROOT, 'content/site');
const OUTPUT_DIR = join(ROOT, '.claude/state/ocr-audit');
const TODAY = new Date().toISOString().slice(0, 10);
const OUTPUT_FILE = join(OUTPUT_DIR, `${TODAY}.json`);

// ── 対象 MDX の収集 ───────────────────────────────────

/**
 * 過去問 MDX のパスを列挙する。
 * - 総監: content/site/pe-comprehensive-management/{h|r}\d+-(primary|secondary)/article.mdx
 * - 1級土木: content/site/civil-construction-1/(primary|secondary)-<year>-<x>/article.mdx
 */
function collectExamMdxFiles() {
  const results = [];

  // 総監
  const peRoot = join(POSTS_ROOT, 'pe-comprehensive-management');
  if (existsSync(peRoot)) {
    for (const dir of readdirSync(peRoot)) {
      if (!/^(h|r)\d+-(primary|secondary)$/.test(dir)) continue;
      const article = join(peRoot, dir, 'article.mdx');
      if (existsSync(article)) {
        results.push({
          path: article,
          category: 'pe-comprehensive-management',
          slug: dir,
          year: dir.match(/^(h|r)\d+/)?.[0],
          type: /primary/.test(dir) ? 'primary' : 'secondary',
        });
      }
    }
  }

  // 1級土木
  const civilRoot = join(POSTS_ROOT, 'civil-construction-1');
  if (existsSync(civilRoot)) {
    for (const dir of readdirSync(civilRoot)) {
      const m = dir.match(/^(primary|secondary)-([hr]\d+)(?:-(a|b))?$/);
      if (!m) continue;
      const article = join(civilRoot, dir, 'article.mdx');
      if (existsSync(article)) {
        results.push({
          path: article,
          category: 'civil-construction-1',
          slug: dir,
          year: m[2],
          type: m[1],
        });
      }
    }
  }

  return results.sort((a, b) => a.path.localeCompare(b.path));
}

// ── テキスト抽出 ────────────────────────────────────

/**
 * MDX からテキスト本文を行単位で抽出する。
 * 除外: frontmatter、JSX コンポーネント、フェンス付きコードブロック、HTML タグ、
 *       details summary、import/export 行
 * 各行に元の MDX の行番号を保持する。
 */
function extractTextLines(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const result = [];

  let inFrontmatter = false;
  let frontmatterClosed = false;
  let inCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // frontmatter 開閉
    if (line.trim() === '---') {
      if (!frontmatterClosed && !inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else if (inFrontmatter) {
        inFrontmatter = false;
        frontmatterClosed = true;
        continue;
      }
    }
    if (inFrontmatter) continue;

    // コードフェンス
    if (/^```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    // import/export 行は除外
    if (/^\s*(import|export)\s/.test(line)) continue;

    // JSX コンポーネント開閉行（純粋な JSX 単独行）は除外
    // 本文中のインライン JSX (<Underline>text</Underline> 等) は対象に含める
    const trimmed = line.trim();
    if (/^<[A-Z][A-Za-z0-9]*(\s|\/?>)/.test(trimmed) || /^<\/[A-Z][A-Za-z0-9]*>\s*$/.test(trimmed)) continue;
    if (trimmed === '/>' || trimmed === '>' || /^(items|summary|code|title|children)=/.test(trimmed)) continue;
    if (/^<details>|^<\/details>|^<summary>|^<\/summary>/.test(trimmed)) continue;

    // 本文抽出: HTML / MDX inline の JSX を除去してプレーンテキスト化
    let text = line
      .replace(/<[^>]+>/g, '')            // <tag> 除去
      .replace(/\{[^}]*\}/g, '')           // {expr} 除去
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Markdown link → anchor text

    if (!text.trim()) continue;
    // コメント行は除外
    if (/^\s*(<!--|\/\*|\/\/)/.test(trimmed)) continue;

    result.push({ lineNo, text });
  }

  return result;
}

// ── 全コーパスからの N-gram 頻度 ───────────────────────

/**
 * 日本語テキストから 2 文字の漢字熟語を抽出し、頻度マップを作る。
 */
function buildKanjiBigramFreq(allTextByFile) {
  const freq = new Map();
  const kanjiRun = /[一-鿿㐀-䶿々〆〤]{2,}/g;

  for (const { text } of allTextByFile) {
    const matches = text.match(kanjiRun) || [];
    for (const run of matches) {
      for (let i = 0; i + 2 <= run.length; i++) {
        const bigram = run.slice(i, i + 2);
        freq.set(bigram, (freq.get(bigram) || 0) + 1);
      }
    }
  }
  return freq;
}

// ── ヒューリスティクス ────────────────────────────────

// よくある OCR 誤読ペア（ゴシック・明朝でよく似る漢字ペア）
const CONFUSION_PAIRS = [
  ['取', '耳'], ['機', '棟'], ['象', '像'], ['手', '千'],
  ['旦', '日'], ['司', '可'], ['己', '巳'], ['已', '己'],
  ['目', '日'], ['入', '人'], ['太', '大'], ['犬', '大'],
  ['末', '未'], ['土', '士'], ['千', '干'],
];

// 怪しいと既知の「誤読されたに違いない」字面パターン
// （頻出する誤字の固有文字列を直接ヒットさせる）
const DIRECT_PATTERNS = [
  { re: /取機的手象/, reason: 'known_multi_char_misread', confidence: 'very_high' },
];

/**
 * 文字種遷移の異常を検出。
 * 漢字が連続する熟語の中に非漢字が混入している場合を候補とする。
 * 例: 「手段」の「段」が「段」以外に化けるケース。
 */
function detectCharTypeAnomaly(line, context) {
  const suspects = [];
  // 3 文字以上連続する漢字列の中にカタカナ/ひらがなが 1 字だけ挟まるパターン
  // （漢字漢字_漢字 where _ is 非漢字 1 文字 — 熟語の誤読候補）
  const re = /([一-鿿]{1,2})([ぁ-んァ-ヶ]{1})([一-鿿]{1,2})/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    const whole = m[0];
    // 自然な送り仮名や助詞は除外する（「の/を/に/が/は/て/で」など）
    const middle = m[2];
    if (/[のをにがはでとへもやか、。]/.test(middle)) continue;
    // 「する」「ある」「なる」などの動詞化語尾を除外
    if (/[するさしてなっまりれろるい]/.test(middle)) continue;
    suspects.push({
      matched: whole,
      reason: 'char_type_anomaly',
      confidence: 'low',
    });
  }
  return suspects;
}

/**
 * 希少 2 字熟語の検出 — 全コーパスで 1 回だけ出現する 2 字熟語を候補に。
 */
function detectRareBigrams(line, freq) {
  const suspects = [];
  const kanjiRun = /[一-鿿]{2,}/g;
  const runs = line.match(kanjiRun) || [];
  for (const run of runs) {
    for (let i = 0; i + 2 <= run.length; i++) {
      const bigram = run.slice(i, i + 2);
      const count = freq.get(bigram) || 0;
      if (count === 1) {
        suspects.push({
          matched: bigram,
          reason: 'rare_bigram_freq_1',
          confidence: 'low',
        });
      }
    }
  }
  return suspects;
}

/**
 * 直接パターン（既知誤読字列）にヒットするか。
 */
function detectDirectPatterns(line) {
  const suspects = [];
  for (const { re, reason, confidence } of DIRECT_PATTERNS) {
    const m = line.match(re);
    if (m) suspects.push({ matched: m[0], reason, confidence });
  }
  return suspects;
}

/**
 * 全角半角数字混在: 日本語本文で半角数字が 1 字だけ漢字に挟まれるパターン。
 * 例: 「事業5年」→「事業５年」のはずが混在している etc.
 */
function detectDigitMixing(line) {
  const suspects = [];
  // 漢字 + 半角数字 1 文字 + 漢字 パターンで、前後が純粋に年号／単位を
  // 示していないもの
  const re = /([一-鿿])([0-9])([一-鿿])/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    // 前後が「第X章」「令和X年」「第X号」「第X節」みたいな自然な数値は除外
    const before = m[1];
    const after = m[3];
    // よくある数値フォーマットは除外
    if (['第', '令', '平', '昭', '明', '大'].includes(before)) continue;
    if (['章', '条', '号', '節', '項', '年', '月', '日', '版', '次'].includes(after)) continue;
    suspects.push({
      matched: m[0],
      reason: 'digit_mixing_in_kanji',
      confidence: 'low',
    });
  }
  return suspects;
}

// ── メインループ ───────────────────────────────────

function main() {
  console.log('OCR suspects detection — scanning exam MDX files');

  const files = collectExamMdxFiles();
  console.log(`Found ${files.length} exam MDX files`);

  // 全コーパスを一旦読み込んで bigram freq を作る
  const allText = [];
  const parsed = [];
  for (const f of files) {
    const raw = readFileSync(f.path, 'utf-8');
    const lines = extractTextLines(raw);
    parsed.push({ ...f, lines });
    for (const l of lines) allText.push({ text: l.text });
  }
  const bigramFreq = buildKanjiBigramFreq(allText);
  console.log(`Built bigram frequency map: ${bigramFreq.size} unique bigrams`);

  // 各ファイル・各行で検査
  const suspects = [];
  for (const file of parsed) {
    for (const { lineNo, text } of file.lines) {
      const found = [];

      for (const s of detectDirectPatterns(text)) found.push(s);
      for (const s of detectCharTypeAnomaly(text)) found.push(s);
      for (const s of detectRareBigrams(text, bigramFreq)) found.push(s);
      for (const s of detectDigitMixing(text)) found.push(s);

      // confusion pair は「本文中に両方ある熟語」のみ (false positive 多いので後段で絞るのに使う材料のみ)
      // （現在は採用保留。必要なら有効化）

      if (found.length === 0) continue;

      // 候補をまとめる
      const contextStart = Math.max(0, text.indexOf(found[0].matched) - 20);
      const contextEnd = Math.min(text.length, text.indexOf(found[0].matched) + (found[0].matched?.length || 0) + 20);

      suspects.push({
        file: relative(ROOT, file.path),
        category: file.category,
        slug: file.slug,
        year: file.year,
        type: file.type,
        line: lineNo,
        matches: found,
        context: text.slice(contextStart, contextEnd),
      });
    }
  }

  // confidence でソート（very_high → high → low）
  const rank = { very_high: 0, high: 1, medium: 2, low: 3 };
  const maxConfidence = (s) => Math.min(...s.matches.map((m) => rank[m.confidence] ?? 9));
  suspects.sort((a, b) => maxConfidence(a) - maxConfidence(b) || a.file.localeCompare(b.file) || a.line - b.line);

  // 統計
  const byCategory = {};
  const byConfidence = {};
  for (const s of suspects) {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    for (const m of s.matches) {
      byConfidence[m.confidence] = (byConfidence[m.confidence] || 0) + 1;
    }
  }

  // 出力
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const output = {
    generated_at: new Date().toISOString(),
    scanned_files: files.length,
    total_suspects: suspects.length,
    by_category: byCategory,
    by_confidence: byConfidence,
    heuristics: [
      'direct_pattern (known multi-char misreads)',
      'char_type_anomaly (kanji run interrupted by single non-kanji)',
      'rare_bigram_freq_1 (2-char kanji appearing only once across all exam MDX)',
      'digit_mixing_in_kanji (half-width digit between kanji, excluding legitimate numerical formats)',
    ],
    suspects,
  };
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log('');
  console.log('=== Summary ===');
  console.log(`Total suspects: ${suspects.length}`);
  console.log(`By category: ${JSON.stringify(byCategory)}`);
  console.log(`By confidence: ${JSON.stringify(byConfidence)}`);
  console.log('');
  console.log(`Top 10 highest-confidence candidates:`);
  for (const s of suspects.slice(0, 10)) {
    const top = s.matches[0];
    console.log(`  [${top.confidence}] ${s.slug}:${s.line} "${top.matched}" (${top.reason})`);
    console.log(`    ${s.context}`);
  }
  console.log('');
  console.log(`Full output: ${relative(ROOT, OUTPUT_FILE)}`);
}

main();
