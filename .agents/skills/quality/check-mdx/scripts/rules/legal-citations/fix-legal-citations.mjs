#!/usr/bin/env node
/**
 * 法令条文を e-Gov 法令検索インラインリンクに一斉変換するスクリプト
 *
 * Usage:
 *   node scripts/fix-legal-citations.mjs --dry-run    # diff 出力のみ
 *   node scripts/fix-legal-citations.mjs --apply      # 実ファイル書き換え
 *   node scripts/fix-legal-citations.mjs --file <p>   # 単一ファイル
 *
 * ルール:
 * - 法令名＋第◯条 (+ 第◯項) のパターンを [**法令名第◯条**](url) に置換
 * - 同一ファイル内で「初出のみリンク」
 * - 「同法」「未知の法律」はスキップ
 * - 既に [...](...) 内にあるものはスキップ
 * - バックアップを /tmp/fix-legal-citations-backup/ に保存
 *
 * ── 実行環境 ──
 *   macOS only。パスはスクリプト位置からプロジェクトルートを解決する。
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { readMdxFile, writeMdxFile } from '#lib/mdx-io.mjs';

const ROOT = process.cwd();
const POSTS_ROOT = join(ROOT, '.local/r2/posts/pe-comprehensive-management');
const BACKUP_ROOT = '/tmp/fix-legal-citations-backup';

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');
const FILE_IDX = args.indexOf('--file');
const SINGLE_FILE = FILE_IDX !== -1 ? args[FILE_IDX + 1] : null;

// ── 法令 ID マップ ─────────────────────────────────────────────
const LAW_ID_MAP = {
  '日本国憲法': '321CONSTITUTION',
  '憲法': '321CONSTITUTION',
  '民法': '129AC0000000089',
  '刑法': '140AC0000000045',
  '独占禁止法': '322AC0000000054',
  '労働基準法': '322AC0000000049',
  '労働組合法': '324AC0000000174',
  '労働契約法': '419AC0000000128',
  '労働安全衛生法': '347AC0000000057',
  '男女雇用機会均等法': '347AC0000000113',
  '育児介護休業法': '403AC0000000076',
  '育児・介護休業法': '403AC0000000076',
  '高年齢者雇用安定法': '346AC0000000068',
  '労働施策総合推進法': '341AC0000000132',
  '建設業法': '324AC0000000100',
  '下請代金支払遅延等防止法': '331AC0000000120',
  '下請法': '331AC0000000120',
  '特許法': '334AC0000000121',
  '実用新案法': '334AC0000000123',
  '意匠法': '334AC0000000125',
  '商標法': '334AC0000000127',
  '著作権法': '345AC0000000048',
  '不正競争防止法': '405AC0000000047',
  '知的財産基本法': '414AC0000000122',
  '個人情報保護法': '415AC0000000057',
  '行政機関の保有する情報の公開に関する法律': '411AC0000000042',
  '情報公開法': '411AC0000000042',
  'サイバーセキュリティ基本法': '426AC0000000104',
  '災害対策基本法': '336AC0000000223',
  '環境基本法': '405AC0000000091',
  '環境影響評価法': '409AC0000000081',
  '生物多様性基本法': '420AC0000000058',
  '大気汚染防止法': '343AC0000000097',
  '製造物責任法': '406AC0000000085',
  '電気通信事業法': '359AC0000000086',
  '技術士法': '358AC0000000124',
  '教育基本法': '418AC0000000120',
  '労働審判法': '416AC0000000045',
  '個別労働関係紛争解決促進法': '413AC0000000112',
};

const ALIAS_MAP = {
  '独禁法': '独占禁止法',
  '労基法': '労働基準法',
  '安衛法': '労働安全衛生法',
  '労安法': '労働安全衛生法',
  '労組法': '労働組合法',
  '均等法': '男女雇用機会均等法',
  '介護休業法': '育児介護休業法',
};

// 長い名前を優先してマッチするため、長さ降順でソート
const ALL_LAW_NAMES = [...Object.keys(LAW_ID_MAP), ...Object.keys(ALIAS_MAP)]
  .sort((a, b) => b.length - a.length);

// ── ヘルパー ───────────────────────────────────────────────────

function toHalfWidth(str) {
  return str.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
}

function collectMdxFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) collectMdxFiles(full, out);
    else if (entry === 'article.mdx') out.push(full);
  }
  return out;
}

/**
 * 指定位置が既存の Markdown リンク [text](url) 内にあるかを判定
 */
function isInsideLink(line, pos) {
  const before = line.slice(0, pos);
  const opens = (before.match(/\[/g) || []).length;
  const closes = (before.match(/\]/g) || []).length;
  return opens > closes;
}

/**
 * 行内から 1 件の法令条文マッチを試み、置換情報を返す
 * 返却: { found: boolean, rawText, lawName, articleNum, position, endPos }
 */
function findNextCitation(line, startPos = 0) {
  // 条文パターン: 第◯条 [第◯項] [第◯号]
  const articleRe = /第\s*([\d０-９]+)\s*条(?:\s*第\s*([\d０-９]+)\s*項)?(?:\s*第\s*([\d０-９]+)\s*号)?/g;
  articleRe.lastIndex = startPos;
  const m = articleRe.exec(line);
  if (!m) return null;

  const articleStart = m.index;
  const articleEnd = articleStart + m[0].length;

  // 枝番（第◯条の◯）はアンカー形式が不明なのでスキップ
  // 「第38条」の直後に「の3」「の10」等が続くパターンを検出
  const afterArticle = line.slice(articleEnd);
  if (/^の\s*[\d０-９]+/.test(afterArticle)) {
    return findNextCitation(line, articleEnd);
  }

  // 条文の直前に法令名があるか探す
  // 前方 20 文字以内に法令名の末尾があるはず
  const searchStart = Math.max(0, articleStart - 20);
  const prefixRegion = line.slice(searchStart, articleStart);

  // 法令名のうち最も右寄り・最長のものを探す
  for (const name of ALL_LAW_NAMES) {
    if (prefixRegion.endsWith(name)) {
      const nameStart = articleStart - name.length;
      // 既存リンク内ならスキップ
      if (isInsideLink(line, nameStart)) continue;

      const articleNum = toHalfWidth(m[1]);
      const sectionNum = m[2] ? toHalfWidth(m[2]) : null;
      const itemNum = m[3] ? toHalfWidth(m[3]) : null;

      return {
        lawName: name, // 原文まま（略称含む）
        canonical: ALIAS_MAP[name] || name,
        articleNum,
        sectionNum,
        itemNum,
        rawText: line.slice(nameStart, articleEnd),
        position: nameStart,
        endPos: articleEnd,
      };
    }
  }
  // 法令名が見つからなかった → 次の条文パターンを探す
  return findNextCitation(line, articleEnd);
}

/**
 * 法令名＋条文の置換テキストを生成
 */
function generateReplacement(citation) {
  const id = LAW_ID_MAP[citation.canonical];
  if (!id) return null;
  const url = `https://laws.e-gov.go.jp/law/${id}#Mp-At_${citation.articleNum}`;
  // そのままの表示テキスト（略称・項・号含む）をリンクに
  return `[**${citation.rawText}**](${url})`;
}

// ── メイン処理 ────────────────────────────────────────────────

function processFile(filePath) {
  const { raw, eol } = readMdxFile(filePath);
  // frontmatter を分離
  const fmMatch = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const fm = fmMatch ? fmMatch[0] : '';
  const body = raw.slice(fm.length);
  const lines = body.split(/\r?\n/);

  // このファイル内で初出のリンクかどうかを追跡するセット（法令名＋条文）
  const linkedCitations = new Set();
  // 既存のリンク済み条文を事前スキャン
  const existingLinkRe = /\[\*\*([^*]+?第\s*\d+\s*条[^*]*?)\*\*\]/g;
  let em;
  while ((em = existingLinkRe.exec(body)) !== null) {
    linkedCitations.add(em[1].replace(/\s+/g, ''));
  }

  const changes = [];
  const newLines = lines.map((line, idx) => {
    let modifiedLine = line;
    let offset = 0;
    let cursor = 0;

    while (true) {
      const citation = findNextCitation(modifiedLine.slice(cursor));
      if (!citation) break;
      const absPos = cursor + citation.position;
      const absEnd = cursor + citation.endPos;

      // 初出判定用のキー
      const key = citation.rawText.replace(/\s+/g, '');

      if (linkedCitations.has(key)) {
        // 既にリンク済み: スキップ
        cursor = absEnd;
        continue;
      }

      const replacement = generateReplacement(citation);
      if (!replacement) {
        // 未知の法律: スキップ
        cursor = absEnd;
        continue;
      }

      // 置換
      modifiedLine =
        modifiedLine.slice(0, absPos) + replacement + modifiedLine.slice(absEnd);
      linkedCitations.add(key);
      changes.push({
        line: idx + 1,
        before: citation.rawText,
        after: replacement,
      });
      cursor = absPos + replacement.length;
    }

    return modifiedLine;
  });

  if (changes.length === 0) return { filePath, changes: [] };

  // 改行は LF で組み立て、書き込み時に writeMdxFile が eol へ正規化する
  const newRaw = fm + newLines.join('\n');

  return { filePath, changes, newRaw, eol };
}

// ── 実行 ───────────────────────────────────────────────────────

const targets = SINGLE_FILE ? [SINGLE_FILE] : collectMdxFiles(POSTS_ROOT);

if (!existsSync(BACKUP_ROOT)) mkdirSync(BACKUP_ROOT, { recursive: true });

let totalChanges = 0;
let totalFiles = 0;
const fileReports = [];

for (const filePath of targets) {
  const result = processFile(filePath);
  if (result.changes.length === 0) continue;
  totalChanges += result.changes.length;
  totalFiles++;
  fileReports.push(result);

  if (!DRY_RUN) {
    // バックアップを作成（バイナリコピーなので元の改行コードがそのまま保持される）
    const rel = relative(POSTS_ROOT, filePath);
    const backupPath = join(BACKUP_ROOT, rel);
    if (!existsSync(dirname(backupPath))) mkdirSync(dirname(backupPath), { recursive: true });
    writeFileSync(backupPath, readFileSync(filePath));
    // 元ファイルの改行コードに揃えて書き込む（混在防止）
    writeMdxFile(filePath, result.newRaw, result.eol);
  }
}

// ── 出力 ───────────────────────────────────────────────────────

console.log(`\n=== ${DRY_RUN ? 'DRY RUN' : 'APPLIED'} ===\n`);
for (const rep of fileReports) {
  const rel = relative(POSTS_ROOT, rep.filePath).replace(/\\/g, '/');
  console.log(`${rel}: ${rep.changes.length} changes`);
  for (const c of rep.changes.slice(0, 3)) {
    console.log(`  L${c.line}: "${c.before}" → "${c.after.slice(0, 60)}..."`);
  }
  if (rep.changes.length > 3) console.log(`  ... (+${rep.changes.length - 3} more)`);
}

console.log(`\nSummary: ${totalChanges} edits across ${totalFiles} files`);
if (DRY_RUN) console.log(`\n(dry-run mode. Use --apply to write changes)`);
