#!/usr/bin/env node
/**
 * check-standard-articles.mjs — 構造化章記事（レイヤー2）の生成物を 12 検査で検証する。
 *
 *   node scripts/check-standard-articles.mjs                # 設定 build.documents を検査
 *   node scripts/check-standard-articles.mjs chubu/common   # 対象を明示
 *   node scripts/check-standard-articles.mjs --json         # 機械可読出力
 *
 * 終了コード:
 *   0 = 全検査 PASS（WARN のみも 0）
 *   1 = 検査で違反を検出（FAIL）
 *   2 = 検査不成立（対象文書ゼロ・manifest 不在・原典欠落など「1 件も検査できていない」状態）
 *
 * なぜ 2 を分けるか: 「異常 0 件」と「1 件も検査していない」は出力が同じ緑になりやすく、
 * 後者は事故を隠す。各検査は必ず「何件検査したか」を出力し、対象ゼロは PASS と呼ばない。
 *
 * この検査器は生成物・パーサーを一切書き換えない（read-only）。
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ARTICLES_ROOT,
  LIBRARY_ROOT,
  analyzeDocument,
  getCatalog,
  loadDocumentPages,
  loadOverrides,
  patterns,
} from './lib/standards-structure.mjs';
import { loadManifest as loadAssetManifest } from './lib/asset-storage.mjs';
import { pathToFileURL } from 'node:url';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/** 検査の定義。INCONCLUSIVE を作るときも同じ並びで 12 件返せるようにここを唯一の並び順とする。 */
const CHECK_DEFS = [
  { id: 1, name: '本文の取りこぼしゼロ' },
  { id: 2, name: '全ページ割当' },
  { id: 3, name: '除去の監査記録' },
  { id: 4, name: '章・節番号の重複と逆行' },
  { id: 5, name: '見出しレベルの飛び越しなし' },
  { id: 6, name: 'U+FFFD ゼロ' },
  { id: 7, name: '原典ページリンクが有効' },
  { id: 8, name: 'sourcePages が実在' },
  { id: 9, name: 'source SHA-256 が catalog と一致' },
  { id: 10, name: 'outputSha256 が記録され一致' },
  { id: 11, name: '未処理行・低確信行なし' },
  { id: 12, name: '同一章の重複 indexable なし（全文書横断）' },
  { id: 13, name: 'catalog 全文書の被覆と除外理由の実証（全文書横断）' },
  { id: 14, name: '表の復元が台帳と一致し GFM が可逆' },
  { id: 15, name: '章ごとの OGP 画像がそろっている' },
];

const PASS = 'PASS';
const WARN = 'WARN';
const FAIL = 'FAIL';
const INCONCLUSIVE = 'INCONCLUSIVE';

/**
 * 検査 1 件の結果を組み立てる。
 * checked が 0 のときに黙って PASS を返さないよう、呼び出し側で必ず不成立を明示させる。
 */
function result(def, { status, checked, unit, violations = [], notes = [] }) {
  return { id: def.id, name: def.name, status, checked, unit, violations, notes };
}

/** 違反が 1 件でもあれば FAIL、警告だけなら WARN。 */
function verdict(violations, warnings) {
  if (violations.length > 0) return FAIL;
  if (warnings.length > 0) return WARN;
  return PASS;
}

// ---- 入力の読み込み -------------------------------------------------------

function readManifest(agencyId, documentId) {
  const path = join(ARTICLES_ROOT, agencyId, documentId, 'manifest.json');
  if (!existsSync(path)) throw new Error(`manifest.json が無い: ${path}（先に build-standard-articles.mjs を回す）`);
  const raw = readFileSync(path, 'utf8');
  return { path, raw, manifest: JSON.parse(raw) };
}

function readChapterFile(agencyId, documentId, file) {
  const path = join(ARTICLES_ROOT, agencyId, documentId, file);
  if (!existsSync(path)) return { path, text: null };
  return { path, text: readFileSync(path, 'utf8') };
}

/**
 * 見出し行を抜き出す。コードブロック（原文レイアウトの表）の中には
 * `#` で始まる行が現れうるので、フェンスの内側は必ず除外する。
 */
function parseHeadings(text) {
  const headings = [];
  let fence = null;
  text.split('\n').forEach((line, index) => {
    const fenceMatch = line.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      const length = fenceMatch[1].length;
      if (fence === null) fence = { marker, length };
      else if (marker === fence.marker && length >= fence.length && fenceMatch[2].trim() === '') fence = null;
      return;
    }
    if (fence !== null) return;
    const heading = line.match(/^(#{1,6})\s+(\S.*)$/);
    if (heading) headings.push({ line: index + 1, level: heading[1].length, text: heading[2].trim() });
  });
  return headings;
}

/** U+FFFD の出現位置（行番号）を返す。文字化けは 1 件でも公開事故なので位置まで出す。 */
function findReplacementChars(text) {
  const hits = [];
  text.split('\n').forEach((line, index) => {
    if (line.includes('�')) hits.push({ line: index + 1, text: line.trim().slice(0, 80) });
  });
  return hits;
}

// ---- 各検査 ---------------------------------------------------------------

/**
 * 1. 本文の取りこぼしゼロ。
 * manifest の自己申告は信じず analyzeDocument を実走させ、行会計（割当 + 除去 = 本文行）を
 * 再計算したうえで manifest と突合する。台帳だけ直して実体がズレる事故を検出する。
 */
function checkLineAccounting(def, { manifest, analysis }) {
  const violations = [];
  const a = analysis.audit;
  if (a.bodyLineTotal === 0) {
    return result(def, {
      status: INCONCLUSIVE,
      checked: 0,
      unit: '行',
      violations: ['本文行が 0 行。原典を読めていないので検査が成立しない'],
    });
  }
  if (a.assignedLines + a.removedLines !== a.bodyLineTotal) {
    violations.push(
      `再計算の行会計が合わない: 割当 ${a.assignedLines} + 除去 ${a.removedLines} = ${a.assignedLines + a.removedLines} ≠ 本文 ${a.bodyLineTotal}`,
    );
  }
  if (a.unassignedLines !== 0) violations.push(`未割当行 ${a.unassignedLines} 行（再計算値）`);
  if (manifest.audit.unassignedLines !== 0) violations.push(`manifest.audit.unassignedLines = ${manifest.audit.unassignedLines}`);
  for (const key of ['totalPages', 'frontMatterPages', 'bodyPages', 'bodyLineTotal', 'assignedLines', 'removedLines', 'unassignedLines']) {
    if (manifest.audit[key] !== a[key]) {
      violations.push(`manifest.audit.${key} = ${manifest.audit[key]} だが再解析は ${a[key]}（台帳と実体のドリフト）`);
    }
  }
  return result(def, { status: verdict(violations, []), checked: a.bodyLineTotal, unit: '行', violations });
}

/**
 * 2. 全ページ割当。
 * PDF の全ページが「前付け」か「いずれかの章」にちょうど 1 回だけ現れることを数え上げる。
 * 欠落（どこにも無いページ＝黙って落ちた本文）と重複（2 章に跨って数えたページ）を両方出す。
 */
function checkPageCoverage(def, { manifest, analysis }) {
  const violations = [];
  const total = manifest.pages;
  if (!Number.isInteger(total) || total <= 0) {
    return result(def, { status: INCONCLUSIVE, checked: 0, unit: 'ページ', violations: [`manifest.pages が不正: ${total}`] });
  }

  const counts = new Map();
  const owners = new Map();
  const bump = (page, owner) => {
    counts.set(page, (counts.get(page) ?? 0) + 1);
    owners.set(page, [...(owners.get(page) ?? []), owner]);
  };

  const front = manifest.frontMatter;
  if (front.pageCount > 0) {
    if (front.firstPage === null || front.lastPage === null) {
      violations.push(`前付け ${front.pageCount} ページなのに firstPage/lastPage が null`);
    } else {
      const span = front.lastPage - front.firstPage + 1;
      // 前付けはページ配列を持たないので連続前提で展開する。連続でなければ展開自体が誤りなので止める。
      if (span !== front.pageCount) violations.push(`前付けが連続でない: ${front.firstPage}-${front.lastPage} は ${span} ページだが pageCount ${front.pageCount}`);
      for (let p = front.firstPage; p <= front.lastPage; p += 1) bump(p, '前付け');
    }
  }
  // 再解析の前付けページ集合と一致するか（manifest の範囲表記だけを信じない）
  const analysisFront = new Set(analysis.frontMatter.pages);
  if (analysisFront.size !== front.pageCount) {
    violations.push(`前付けページ数が再解析と不一致: manifest ${front.pageCount} / 再解析 ${analysisFront.size}`);
  }

  for (const chapter of manifest.chapters) {
    for (const page of chapter.sourcePages) bump(page, chapter.chapterId);
  }

  const missing = [];
  const duplicated = [];
  for (let p = 1; p <= total; p += 1) {
    const count = counts.get(p) ?? 0;
    if (count === 0) missing.push(p);
    else if (count > 1) duplicated.push(`p${p} は ${count} 箇所（${owners.get(p).join(', ')}）`);
  }
  const outOfRange = [...counts.keys()].filter((p) => p < 1 || p > total);
  if (missing.length > 0) violations.push(`どこにも割り当たっていないページ ${missing.length} 件: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ' …' : ''}`);
  for (const dup of duplicated.slice(0, 20)) violations.push(`重複割当: ${dup}`);
  if (duplicated.length > 20) violations.push(`… 重複割当 ほか ${duplicated.length - 20} 件`);
  if (outOfRange.length > 0) violations.push(`範囲外ページ ${outOfRange.length} 件: ${outOfRange.slice(0, 10).join(', ')}`);

  return result(def, { status: verdict(violations, []), checked: total, unit: 'ページ', violations });
}

/**
 * 3. 除去の監査記録。
 * 柱・印刷ページ番号は本文全ページから必ず 1 本ずつ除去される（実測 582/582）。
 * 記録が本文ページ数と一致しない、あるいは 0 件なら「除去を検査していない」ので FAIL。
 */
function checkRemovalAudit(def, { manifest, analysis }) {
  const violations = [];
  const bodyPages = manifest.audit.bodyPages;
  const headers = manifest.audit.removedRunningHeaders;
  const prints = manifest.audit.removedPrintPageNumbers;
  if (!bodyPages) {
    return result(def, { status: INCONCLUSIVE, checked: 0, unit: '除去記録', violations: ['本文ページが 0。除去の検査が成立しない'] });
  }
  if (headers === 0) violations.push('柱の除去記録が 0 件（除去した実体が記録されていない）');
  if (prints === 0) violations.push('印刷ページ番号の除去記録が 0 件（除去した実体が記録されていない）');
  if (headers !== bodyPages) violations.push(`柱の除去記録 ${headers} 件 ≠ 本文 ${bodyPages} ページ`);
  if (prints !== bodyPages) violations.push(`印刷ページ番号の除去記録 ${prints} 件 ≠ 本文 ${bodyPages} ページ`);
  if (analysis.removed.runningHeaders.length !== headers) {
    violations.push(`柱の除去記録が再解析と不一致: manifest ${headers} / 再解析 ${analysis.removed.runningHeaders.length}`);
  }
  if (analysis.removed.printPageNumbers.length !== prints) {
    violations.push(`印刷ページ番号の除去記録が再解析と不一致: manifest ${prints} / 再解析 ${analysis.removed.printPageNumbers.length}`);
  }
  return result(def, {
    status: verdict(violations, []),
    checked: headers + prints,
    unit: `除去記録（柱 ${headers} + 印刷ページ番号 ${prints}・本文 ${bodyPages}p）`,
    violations,
  });
}

/**
 * 4. 章・節番号の重複と逆行。
 * 番号の逆行・重複は柱の読み違いか章の切り直し失敗を意味する（構造が壊れている証拠）。
 * 欠番は原典側が飛ばしている可能性があるので WARN に留める。
 */
function checkNumbering(def, { manifest }) {
  const violations = [];
  const warnings = [];
  const chapters = manifest.chapters;
  if (chapters.length === 0) {
    return result(def, { status: INCONCLUSIVE, checked: 0, unit: '章', violations: ['章が 0 件。番号検査が成立しない'] });
  }

  const seen = new Map();
  for (const chapter of chapters) {
    if (seen.has(chapter.chapterId)) violations.push(`chapterId 重複: ${chapter.chapterId}`);
    seen.set(chapter.chapterId, true);
    const expectedId = `${chapter.bookNumber}-${chapter.chapterNumber}`;
    if (chapter.chapterId !== expectedId) violations.push(`chapterId ${chapter.chapterId} が 編-章 ${expectedId} と不一致`);
  }

  const lastByBook = new Map();
  for (const chapter of chapters) {
    const prev = lastByBook.get(chapter.bookNumber);
    if (prev !== undefined && chapter.chapterNumber <= prev) {
      violations.push(`第${chapter.bookNumber}編の章番号が単調増加でない: ${prev} → ${chapter.chapterNumber}`);
    }
    lastByBook.set(chapter.bookNumber, chapter.chapterNumber);
  }

  let sectionCount = 0;
  for (const chapter of chapters) {
    const numbers = chapter.sections.map((s) => s.number);
    sectionCount += numbers.length;
    if (numbers.length === 0) {
      warnings.push(`${chapter.chapterId}: 節が 0 件`);
      continue;
    }
    if (numbers[0] !== 1) warnings.push(`${chapter.chapterId}: 節が第${numbers[0]}節から始まる（第1節が欠番）`);
    for (let i = 1; i < numbers.length; i += 1) {
      if (numbers[i] <= numbers[i - 1]) {
        violations.push(`${chapter.chapterId}: 節番号が逆行・重複 ${numbers[i - 1]} → ${numbers[i]}`);
      } else if (numbers[i] !== numbers[i - 1] + 1) {
        warnings.push(`${chapter.chapterId}: 節番号に欠番 ${numbers[i - 1]} → ${numbers[i]}`);
      }
    }
  }

  return result(def, {
    status: verdict(violations, warnings),
    checked: chapters.length + sectionCount,
    unit: `番号（章 ${chapters.length} + 節 ${sectionCount}）`,
    violations,
    notes: warnings,
  });
}

/**
 * 5. 見出しレベルの飛び越しなし。
 * ページ側が H1（章タイトル）を描画するので本文の起点は H2。H2→H4 のような飛びは
 * 見出し階層の破綻＝目次と読み手の階層認識が壊れる。実ファイルを読んで判定する。
 */
function checkHeadingLevels(def, { manifest, agencyId, documentId }) {
  const violations = [];
  let checked = 0;
  for (const chapter of manifest.chapters) {
    const { path, text } = readChapterFile(agencyId, documentId, chapter.file);
    if (text === null) {
      violations.push(`${chapter.file}: ファイルが無い（${path}）`);
      continue;
    }
    const headings = parseHeadings(text);
    if (headings.length === 0) violations.push(`${chapter.file}: 見出しが 1 件も無い`);
    checked += headings.length;
    // ページ側の H1 を親とみなすので直前レベルの初期値は 1。
    let previous = 1;
    for (const heading of headings) {
      if (heading.level > previous + 1) {
        violations.push(`${chapter.file}:${heading.line} H${previous} → H${heading.level} の飛び越し（${heading.text.slice(0, 40)}）`);
      }
      previous = heading.level;
    }
  }
  if (checked === 0) {
    return result(def, { status: INCONCLUSIVE, checked: 0, unit: '見出し', violations: [...violations, '見出しを 1 件も読めていない'] });
  }
  return result(def, { status: verdict(violations, []), checked, unit: '見出し', violations });
}

/**
 * 6. U+FFFD ゼロ。
 * 文字化けは PDF 抽出・エンコーディングの取りこぼしの唯一の可視痕跡なので、
 * manifest と全章 .md の両方を走査する。
 */
function checkReplacementChars(def, { manifest, manifestRaw, manifestPath, agencyId, documentId }) {
  const violations = [];
  let files = 0;
  const scan = (label, text) => {
    files += 1;
    for (const hit of findReplacementChars(text)) {
      violations.push(`${label}:${hit.line} U+FFFD（${hit.text}）`);
    }
  };
  scan(manifestPath, manifestRaw);
  for (const chapter of manifest.chapters) {
    const { path, text } = readChapterFile(agencyId, documentId, chapter.file);
    if (text === null) {
      violations.push(`${chapter.file}: ファイルが無い（${path}）`);
      continue;
    }
    scan(chapter.file, text);
  }
  if (files === 0) {
    return result(def, { status: INCONCLUSIVE, checked: 0, unit: 'ファイル', violations: ['走査できたファイルが 0 件'] });
  }
  return result(def, { status: verdict(violations, []), checked: files, unit: 'ファイル', violations });
}

/**
 * 7. 原典ページリンクが有効。
 * <SourceRef> は「表を GFM へ復元しない」判断の代償として置いた原本への逃げ道なので、
 * 指すページが章の担当範囲内かつ catalog の part に実在しなければ意味を成さない。
 */
function checkSourceRefs(def, { manifest, document, agencyId, documentId }) {
  const violations = [];
  const partOf = (page) => document.parts.find((p) => page >= p.firstPage && page <= p.lastPage);
  let refs = 0;

  for (const chapter of manifest.chapters) {
    const { text } = readChapterFile(agencyId, documentId, chapter.file);
    if (text === null) continue; // ファイル欠落は検査 5/6 が FAIL にする
    const pageSet = new Set(chapter.sourcePages);
    for (const match of text.matchAll(/<SourceRef\s+[^>]*pages="([^"]*)"[^>]*\/>/g)) {
      refs += 1;
      const value = match[1];
      const parsed = value.match(/^(\d+)(?:-(\d+))?$/);
      if (!parsed) {
        violations.push(`${chapter.file}: SourceRef pages="${value}" が数値または範囲として読めない`);
        continue;
      }
      const from = Number(parsed[1]);
      const to = parsed[2] === undefined ? from : Number(parsed[2]);
      if (from > to) {
        violations.push(`${chapter.file}: SourceRef pages="${value}" の始点が終点より後`);
        continue;
      }
      // 単一ページ指定（pages="98"）で同じ違反を 2 回出さないよう端点を畳む
      for (const page of from === to ? [from] : [from, to]) {
        if (!pageSet.has(page)) {
          violations.push(`${chapter.file}: SourceRef pages="${value}" の p${page} が章の sourcePages(${chapter.firstPage}-${chapter.lastPage}) の外`);
          continue;
        }
        const part = partOf(page);
        if (!part) {
          violations.push(`${chapter.file}: SourceRef pages="${value}" の p${page} が catalog のどの part 範囲にも無い`);
        } else if (!chapter.sourceParts.includes(part.slug)) {
          violations.push(`${chapter.file}: SourceRef pages="${value}" の p${page} は ${part.slug} 由来だが章の sourceParts(${chapter.sourceParts.join(',')}) に無い`);
        }
      }
    }
  }

  if (refs === 0) {
    // 1 件も SourceRef が無い＝原典への逃げ道を検査できていない。緑にしない。
    return result(def, {
      status: INCONCLUSIVE,
      checked: 0,
      unit: 'SourceRef',
      violations: ['SourceRef が 1 件も無い。原典ページリンクを 1 件も検査できていないので PASS にしない'],
    });
  }
  return result(def, { status: verdict(violations, []), checked: refs, unit: 'SourceRef', violations });
}

/**
 * 8. sourcePages が実在。
 * 章が主張するページ・part が catalog の実体に無ければ、原典へ戻る経路が絵に描いた餅になる。
 * part を主張しながら 1 ページも使っていない場合も台帳の嘘なので出す。
 */
function checkSourcePages(def, { manifest, document }) {
  const violations = [];
  const slugs = new Map(document.parts.map((p) => [p.slug, p]));
  let checkedPages = 0;
  let checkedParts = 0;

  for (const chapter of manifest.chapters) {
    checkedPages += chapter.sourcePages.length;
    checkedParts += chapter.sourceParts.length;
    if (chapter.sourcePages.length === 0) violations.push(`${chapter.chapterId}: sourcePages が空`);
    for (const slug of chapter.sourceParts) {
      if (!slugs.has(slug)) violations.push(`${chapter.chapterId}: sourceParts の ${slug} が catalog に無い`);
    }
    const used = new Set();
    for (const page of chapter.sourcePages) {
      if (page < 1 || page > document.pages) {
        violations.push(`${chapter.chapterId}: p${page} が文書のページ範囲 1-${document.pages} の外`);
        continue;
      }
      const owner = chapter.sourceParts
        .map((slug) => slugs.get(slug))
        .find((part) => part && page >= part.firstPage && page <= part.lastPage);
      if (!owner) {
        violations.push(`${chapter.chapterId}: p${page} が sourceParts(${chapter.sourceParts.join(',')}) のページ範囲に含まれない`);
        continue;
      }
      used.add(owner.slug);
    }
    for (const slug of chapter.sourceParts) {
      if (slugs.has(slug) && !used.has(slug)) violations.push(`${chapter.chapterId}: sourceParts の ${slug} を 1 ページも使っていない`);
    }
  }

  if (checkedPages === 0) {
    return result(def, { status: INCONCLUSIVE, checked: 0, unit: 'ページ参照', violations: ['sourcePages が 1 件も無い'] });
  }
  return result(def, {
    status: verdict(violations, []),
    checked: checkedPages + checkedParts,
    unit: `ページ参照（sourcePages ${checkedPages} + sourceParts ${checkedParts}）`,
    violations,
  });
}

/**
 * 9. source SHA-256 が catalog と一致。
 * 原典（レイヤー1）が書き換わったのに章記事だけ古いまま、という最悪のドリフトを止める。
 * catalog の自己申告も信じず part ファイルの実体から再計算する。
 */
function checkSourceHashes(def, { manifest, document }) {
  const violations = [];
  if (manifest.catalogSourceSha256 !== document.sourceSha256) {
    violations.push(`catalogSourceSha256 が catalog と不一致: manifest ${manifest.catalogSourceSha256} / catalog ${document.sourceSha256}`);
  }
  for (const part of document.parts) {
    const path = join(LIBRARY_ROOT, part.file);
    if (!existsSync(path)) {
      violations.push(`${part.slug}: 原典ファイルが無い（${path}）`);
      continue;
    }
    const buffer = readFileSync(path);
    const actual = sha256(buffer);
    if (actual !== part.sha256) violations.push(`${part.slug}: sha256 不一致（実体 ${actual} / catalog ${part.sha256}）`);
    if (buffer.length !== part.bytes) violations.push(`${part.slug}: bytes 不一致（実体 ${buffer.length} / catalog ${part.bytes}）`);
  }
  const checked = 1 + document.parts.length;
  if (document.parts.length === 0) {
    return result(def, { status: INCONCLUSIVE, checked: 0, unit: 'ハッシュ', violations: ['catalog に part が 1 件も無い'] });
  }
  return result(def, {
    status: verdict(violations, []),
    checked,
    unit: `ハッシュ（文書 1 + part ${document.parts.length}）`,
    violations,
  });
}

/**
 * 10. outputSha256 が記録され一致。
 * 生成物を手で直して台帳を放置する（あるいは逆）ドリフトを検出する唯一の手段。
 * 未記録は「検査していない」と同義なので FAIL にする。
 */
function checkOutputHashes(def, { manifest, agencyId, documentId }) {
  const violations = [];
  let checked = 0;
  for (const chapter of manifest.chapters) {
    checked += 1;
    if (!chapter.outputSha256) {
      violations.push(`${chapter.chapterId}: outputSha256 が未記録`);
      continue;
    }
    const { path, text } = readChapterFile(agencyId, documentId, chapter.file);
    if (text === null) {
      violations.push(`${chapter.file}: ファイルが無い（${path}）`);
      continue;
    }
    const actual = sha256(Buffer.from(text, 'utf8'));
    if (actual !== chapter.outputSha256) {
      violations.push(`${chapter.file}: outputSha256 不一致（実体 ${actual} / manifest ${chapter.outputSha256}）`);
    }
    const bytes = Buffer.byteLength(text, 'utf8');
    if (chapter.outputBytes !== undefined && bytes !== chapter.outputBytes) {
      violations.push(`${chapter.file}: outputBytes 不一致（実体 ${bytes} / manifest ${chapter.outputBytes}）`);
    }
  }
  if (checked === 0) {
    return result(def, { status: INCONCLUSIVE, checked: 0, unit: '章', violations: ['章が 0 件。生成物の照合が成立しない'] });
  }
  return result(def, { status: verdict(violations, []), checked, unit: '章', violations });
}

/**
 * 11. 未処理行・低確信行なし。
 * パーサーが「判定できなかった」と自己申告した行を残したまま緑にしない。
 * 件数だけでなく内訳（kind 別）を必ず出して、どこを見に行けばよいかを示す。
 */
function checkRejects(def, { manifest, analysis }) {
  const violations = [];
  const summarize = (entries) => {
    const byKind = new Map();
    for (const entry of entries) byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1);
    return [...byKind.entries()].map(([kind, count]) => `${kind} ${count} 件`).join(' / ');
  };

  if (manifest.rejects.length > 0) {
    violations.push(`rejects ${manifest.rejects.length} 件（${summarize(manifest.rejects)}）`);
    for (const entry of manifest.rejects.slice(0, 10)) {
      violations.push(`  rejects p${entry.page} ${entry.kind}: ${entry.detail ?? entry.text ?? ''}`);
    }
  }
  if (manifest.reviewQueue.length > 0) {
    violations.push(`reviewQueue ${manifest.reviewQueue.length} 件（${summarize(manifest.reviewQueue)}）`);
    for (const entry of manifest.reviewQueue.slice(0, 10)) {
      violations.push(`  reviewQueue p${entry.page} ${entry.kind}: ${entry.detail ?? ''}`);
    }
  }
  // 台帳を手で空にしても再解析では再現するので突合する
  if (analysis.rejects.length !== manifest.rejects.length) {
    violations.push(`rejects 件数が再解析と不一致: manifest ${manifest.rejects.length} / 再解析 ${analysis.rejects.length}`);
  }
  if (analysis.reviewQueue.length !== manifest.reviewQueue.length) {
    violations.push(`reviewQueue 件数が再解析と不一致: manifest ${manifest.reviewQueue.length} / 再解析 ${analysis.reviewQueue.length}`);
  }
  return result(def, {
    status: verdict(violations, []),
    checked: 2,
    unit: `台帳（rejects ${manifest.rejects.length} 件 / reviewQueue ${manifest.reviewQueue.length} 件）`,
    violations,
  });
}

/**
 * 12. 同一章の重複 indexable なし（全文書横断）。
 * 同一原本を複数機関が公開しているため、canonical 以外まで索引対象になると
 * 検索結果で自サイト同士が競合する。編・章の組で二重登録を検出する。
 */
/** GFM の許容理由コード。標準以外の値が manifest に出たら生成器の変更を見落としている。 */
const TABLE_REASONS = new Set([
  'restored', 'too-few-rows', 'tab-character', 'empty-layout', 'columns-out-of-range',
  'lossy', 'ragged-rows', 'empty-cell', 'pipe-in-cell',
]);

/**
 * 表の扱いを検査する。
 *
 * ここで見たいのは 2 つ。**台帳が実体と合っているか**（GFM にしたと言っている数だけ本当に
 * GFM が出ているか）と、**GFM 化で文字が失われていないか**。後者は生成器の内部検査に任せず、
 * 出力された GFM のセルを連結したものが原典ページの本文に実在することを独立に確認する
 * （生成器と検査で同じ関数を使うと、その関数のバグは永久に見つからない）。
 */
function checkTables(def, { manifest, agencyId, documentId, document }) {
  const violations = [];
  const notes = [];
  let gfmFound = 0;
  let verbatimFound = 0;
  let verified = 0;

  // 原典ページの本文（空白除去）をページ単位で用意し、GFM セルの実在確認に使う
  const pageText = new Map();
  for (const part of document.parts) {
    const source = readFileSync(join(LIBRARY_ROOT, part.file), 'utf8');
    const heads = [...source.matchAll(/^## PDF page (\d+)\s*$/gm)];
    heads.forEach((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end = heads[index + 1]?.index ?? source.length;
      const body = source.slice(start, end).match(/`{3,4}text\s*\r?\n([\s\S]*?)\r?\n`{3,4}/);
      if (body) pageText.set(Number(match[1]), body[1].replace(/[\s　]/g, ''));
    });
  }

  for (const chapter of manifest.chapters) {
    for (const [reason, count] of Object.entries(chapter.tableOutcomes ?? {})) {
      if (!TABLE_REASONS.has(reason)) {
        violations.push(`${chapter.chapterId}: 未知の表理由コード ${reason}（${count} 件）`);
      }
    }
    const declared = (chapter.stats.tablesGfm ?? 0) + (chapter.stats.tablesVerbatim ?? 0);
    if (declared !== chapter.stats.tables) {
      violations.push(
        `${chapter.chapterId}: 表 ${chapter.stats.tables} 件に対し内訳が ${declared} 件（GFM ${chapter.stats.tablesGfm} + 版面 ${chapter.stats.tablesVerbatim}）`,
      );
    }

    const { text } = readChapterFile(agencyId, documentId, chapter.file);
    if (text === null) {
      violations.push(`${chapter.chapterId}: 章ファイルが無く表を検査できない`);
      continue;
    }
    const lines = text.split('\n');
    let inCode = false;
    for (let i = 0; i < lines.length; i += 1) {
      if (/^```/.test(lines[i])) { if (!inCode) verbatimFound += 1; inCode = !inCode; continue; }
      if (inCode) continue;
      if (!/^\|.*\|$/.test(lines[i]) || !/^\|( *-{3,} *\|)+$/.test(lines[i + 1] ?? '')) continue;
      gfmFound += 1;
      let end = i + 2;
      const cells = [];
      for (const row of [lines[i], ...lines.slice(i + 2)]) {
        if (!/^\|/.test(row)) break;
        cells.push(row.replace(/^\||\|$/g, '').split('|').join(''));
      }
      while (end < lines.length && /^\|/.test(lines[end])) end += 1;
      // 復元セルの連結が原典のどこかのページに実在するか（章の出所ページ内で探す）
      const joined = cells.join('').replace(/[\s　]/g, '').replace(/\\([\\`*_[\]<>{}|])/g, '$1');
      const found = chapter.sourcePages.some((page) => (pageText.get(page) ?? '').includes(joined));
      if (!found) {
        violations.push(`${chapter.chapterId}: GFM 表のセル内容が原典 p.${chapter.firstPage}-${chapter.lastPage} に見つからない（GFM 化で文字が変わった疑い）`);
      } else {
        verified += 1;
      }
      i = end - 1;
    }
  }

  const declaredGfm = manifest.audit.tablesGfm ?? 0;
  const declaredVerbatim = manifest.audit.tablesVerbatim ?? 0;
  if (gfmFound !== declaredGfm) {
    violations.push(`GFM 表の実数 ${gfmFound} 件 ≠ 台帳 ${declaredGfm} 件`);
  }
  if (verbatimFound !== declaredVerbatim) {
    violations.push(`コードブロックの実数 ${verbatimFound} 件 ≠ 台帳 ${declaredVerbatim} 件`);
  }
  const total = gfmFound + verbatimFound;
  if (total === 0) {
    return result(def, { status: INCONCLUSIVE, checked: 0, unit: '表', violations: ['表が 1 件も無い。検査が成立しない'] });
  }
  notes.push(
    `GFM ${gfmFound} 件（うち原典との一致確認 ${verified} 件） / 版面保持 ${verbatimFound} 件・理由内訳 ${Object.entries(manifest.tableOutcomes ?? {}).filter(([r]) => r !== 'restored').map(([r, c]) => `${r} ${c}`).join(' / ') || 'なし'}`,
  );
  return result(def, { status: verdict(violations, []), checked: total, unit: '表', violations, notes });
}

/**
 * 章ごとの OGP 画像の被覆。
 *
 * 章記事は MDX ではないので check-ogp-coverage（published な MDX を数える）の射程外にあり、
 * 放っておくと「章の OGP が 1 枚も無くても全部緑」になる。ここで章数と画像枚数を突き合わせる。
 *
 * 画像の実体はローカルに無いことがある（R2 へ退避されるため）。ローカル実体と退避台帳の
 * どちらかにあれば OK とし、両方に無いものだけを違反にする（asset-storage の他の検査と同じ考え方）。
 */
function checkChapterOgp(def, { manifest, agencyId, documentId, assetManifest }) {
  const violations = [];
  const notes = [];
  let local = 0;
  let offloaded = 0;

  for (const chapter of manifest.chapters) {
    const relPath = `content/site/standards-articles/${agencyId}/${documentId}/chapters/${chapter.chapterId}/ogp.png`;
    const onDisk = existsSync(join(process.cwd(), relPath));
    const inLedger = Boolean(assetManifest?.entries?.[relPath]);
    if (onDisk) local += 1;
    else if (inLedger) offloaded += 1;
    else violations.push(`${chapter.chapterId}: OGP 画像がローカルにも退避台帳にも無い（${relPath}）`);
  }

  if (manifest.chapters.length === 0) {
    return result(def, { status: INCONCLUSIVE, checked: 0, unit: '章', violations: ['章が 0 件'] });
  }
  // 台帳に 1 件も載っていない状態は、未供給と「参照の壊れ」の区別がつかない。
  // ローカル実体で緑になっている裏で参照が死んでいても気づけるよう、台帳側の件数も必ず出す。
  const ledgerHits = manifest.chapters.filter(
    (c) => assetManifest?.entries?.[
      `content/site/standards-articles/${agencyId}/${documentId}/chapters/${c.chapterId}/ogp.png`
    ],
  ).length;
  notes.push(
    `ローカル実体 ${local} 件 / 退避台帳のみ ${offloaded} 件 / 台帳に載っている ${ledgerHits} 件（生成: npm run build-standards-ogp）`,
  );
  return result(def, {
    status: verdict(violations, []),
    checked: manifest.chapters.length,
    unit: '章',
    violations,
    notes,
  });
}

function checkDuplicateIndexable(def, documents) {
  const violations = [];
  const notes = [];
  const keys = new Map();
  let chapters = 0;
  let indexable = 0;

  for (const doc of documents) {
    for (const chapter of doc.manifest.chapters) {
      chapters += 1;
      if (!chapter.indexable) continue;
      indexable += 1;
      const key = `${chapter.bookNumber}-${chapter.chapterNumber}`;
      keys.set(key, [...(keys.get(key) ?? []), `${doc.target}:${chapter.chapterId}`]);
    }
  }
  for (const [key, owners] of keys) {
    if (owners.length > 1) violations.push(`第${key.split('-')[0]}編第${key.split('-')[1]}章 が ${owners.length} 箇所で indexable: ${owners.join(', ')}`);
  }
  if (chapters === 0) {
    return result(def, { status: INCONCLUSIVE, checked: 0, unit: '章', violations: ['章が 0 件。重複検査が成立しない'] });
  }
  if (indexable === 0) {
    // 対象文書が非 canonical だけのときは重複が起こりえない。緑の意味を誤読させないため明示する。
    notes.push(
      `indexable:true の章が 0 件（${documents.map((d) => `${d.target}=${d.manifest.indexableReason}`).join(' / ')}）。重複判定の対象が無い状態`,
    );
  }
  return result(def, {
    status: verdict(violations, []),
    checked: chapters,
    unit: `章（うち indexable ${indexable} 件）`,
    violations,
    notes,
  });
}

/**
 * catalog の全文書が「生成対象」か「理由つきの除外」のどちらかに入っているかを検査する。
 *
 * 生成対象を 1 件減らしても他の検査は緑のままなので、被覆を見ないと「対象から外して緑」が
 * 通ってしまう。さらに除外理由は**主張したままにせず実データで裏を取る**:
 *   duplicate-source        … 本当に他文書と原本 SHA-256 が一致するか
 *   no-book-chapter-structure … 本当に編・章の柱を持たないか（柱の出現率 < 90%）
 * これをやらないと `documents: "*"` が「何でも除外してよい」抜け道になる。
 */
function checkCatalogCoverage(def, catalog, overrides) {
  const violations = [];
  const notes = [];
  const built = new Set(overrides.build?.documents ?? []);
  const reasons = overrides.skipped?.reasons ?? {};
  const explicitSkips = new Map();
  let wildcardReason = null;

  for (const [key, entry] of Object.entries(reasons)) {
    if (entry.documents === '*') { wildcardReason = key; continue; }
    for (const target of entry.documents ?? []) explicitSkips.set(target, key);
  }

  const shaOwners = new Map();
  for (const doc of catalog.documents) {
    shaOwners.set(doc.sourceSha256, [...(shaOwners.get(doc.sourceSha256) ?? []), `${doc.agencyId}/${doc.documentId}`]);
  }

  let covered = 0;
  const tally = { built: 0, wildcard: 0 };
  for (const doc of catalog.documents) {
    const target = `${doc.agencyId}/${doc.documentId}`;
    if (built.has(target)) { covered += 1; tally.built += 1; continue; }

    const reason = explicitSkips.get(target) ?? wildcardReason;
    if (!reason) {
      violations.push(`${target} が build.documents にも skipped にも無い（黙って対象外にしている）`);
      continue;
    }
    covered += 1;
    tally[reason] = (tally[reason] ?? 0) + 1;
    if (reason === wildcardReason && !explicitSkips.has(target)) tally.wildcard += 1;

    // 主張した除外理由が実データで成り立つか
    if (reason === 'duplicate-source') {
      const owners = (shaOwners.get(doc.sourceSha256) ?? []).filter((o) => o !== target);
      if (owners.length === 0) {
        violations.push(`${target} を duplicate-source として除外しているが、原本 SHA-256 が一致する他文書が無い`);
      }
    } else if (reason === 'no-book-chapter-structure') {
      let ratio = null;
      try {
        const pages = loadDocumentPages(doc);
        const withHeader = pages.filter((page) => {
          const first = page.lines.find((line) => line.trim());
          return first ? patterns.RE_RUNNING_HEADER.test(first) : false;
        }).length;
        ratio = withHeader / pages.length;
      } catch (error) {
        violations.push(`${target} の除外理由を検証できない（原典を読めない: ${error.message}）`);
        continue;
      }
      if (ratio >= 0.9) {
        violations.push(
          `${target} を「編・章の柱を持たない」として除外しているが、実際は ${(ratio * 100).toFixed(1)}% のページが柱を持つ（構造化できるはず）`,
        );
      }
    }
  }

  if (catalog.documents.length === 0) {
    return result(def, { status: INCONCLUSIVE, checked: 0, unit: '文書', violations: ['catalog の文書が 0 件'] });
  }
  notes.push(
    `内訳: 生成 ${tally.built} / ${Object.entries(tally)
      .filter(([k]) => k !== 'built' && k !== 'wildcard')
      .map(([k, v]) => `${k} ${v}`)
      .join(' / ')}（うち除外理由の実データ検証 ${covered - tally.built} 件）`,
  );
  return result(def, {
    status: verdict(violations, []),
    checked: catalog.documents.length,
    unit: '文書（catalog 全件）',
    violations,
    notes,
  });
}

// ---- 文書単位の実行 -------------------------------------------------------

function inspectDocument(target, catalog, overrides) {
  const [agencyId, documentId] = target.split('/');
  const document = catalog.documents.find((d) => d.agencyId === agencyId && d.documentId === documentId);
  if (!document) throw new Error(`catalog.json に ${target} が無い`);
  const { path: manifestPath, raw: manifestRaw, manifest } = readManifest(agencyId, documentId);
  const analysis = analyzeDocument(document, overrides);
  return { target, agencyId, documentId, document, manifest, manifestRaw, manifestPath, analysis };
}

function runDocumentChecks(context) {
  return [
    checkLineAccounting(CHECK_DEFS[0], context),
    checkPageCoverage(CHECK_DEFS[1], context),
    checkRemovalAudit(CHECK_DEFS[2], context),
    checkNumbering(CHECK_DEFS[3], context),
    checkHeadingLevels(CHECK_DEFS[4], context),
    checkReplacementChars(CHECK_DEFS[5], context),
    checkSourceRefs(CHECK_DEFS[6], context),
    checkSourcePages(CHECK_DEFS[7], context),
    checkSourceHashes(CHECK_DEFS[8], context),
    checkOutputHashes(CHECK_DEFS[9], context),
    checkRejects(CHECK_DEFS[10], context),
  ];
}

/** 入力を読めなかった文書は 12 件すべてを「検査不成立」として並べる（緑にも赤にもしない）。 */
function inconclusiveChecks(reason) {
  return CHECK_DEFS.map((def) => result(def, { status: INCONCLUSIVE, checked: 0, unit: '-', violations: [reason] }));
}

// ---- 出力 -----------------------------------------------------------------

function renderText(report) {
  const lines = [];
  for (const doc of report.documents) {
    lines.push('');
    lines.push(`=== ${doc.target}${doc.title ? `（${doc.title}）` : ''} ===`);
    for (const check of doc.checks) {
      const label = check.status === INCONCLUSIVE ? '検査不成立' : check.status;
      const count = check.checked === 0 && check.status === INCONCLUSIVE ? '検査 0 件' : `検査 ${check.checked} ${check.unit}`;
      lines.push(`[${check.id}/${CHECK_DEFS.length}] ${check.name} ... ${label} (${count})`);
      for (const violation of check.violations) lines.push(`    - ${violation}`);
      for (const note of check.notes) lines.push(`    (注) ${note}`);
    }
  }
  const t = report.totals;
  lines.push('');
  lines.push(`合計: 対象文書 ${report.documents.length} 件 / PASS ${t.pass} ・ WARN ${t.warn} ・ FAIL ${t.fail} ・ 検査不成立 ${t.inconclusive}`);
  lines.push(
    report.exitCode === 0
      ? '判定: 全検査 PASS'
      : report.exitCode === 1
        ? '判定: 違反あり（FAIL）'
        : '判定: 検査不成立（1 件も検査できていない項目がある）',
  );
  return lines.join('\n');
}

// ---- 本体 -----------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const explicit = args.filter((a) => !a.startsWith('--'));

  const report = { ok: false, documents: [], totals: { pass: 0, warn: 0, fail: 0, inconclusive: 0 }, exitCode: 2 };

  let overrides;
  let catalog;
  let targets = [];
  try {
    overrides = loadOverrides();
    catalog = getCatalog();
    targets = explicit.length > 0 ? explicit : (overrides.build?.documents ?? []);
  } catch (error) {
    report.error = `設定・catalog を読めない: ${error.message}`;
    report.documents = [];
    emit(report, asJson, report.error);
    return;
  }

  if (targets.length === 0) {
    report.error = '検査対象が 0 件（.claude/config/standards-structure.json の build.documents を確認する）。検査不成立。';
    emit(report, asJson, report.error);
    return;
  }

  // 退避台帳（R2 へ出した OGP の記録）。手書きで JSON を解析するとキー形状がズレても
  // ローカルに実体がある環境では気づけない（実際にそれで CI だけ赤にした）。
  // 退避システムと同じ loadManifest を使い、形状の真実源を 1 つにする。
  let assetManifest = null;
  try {
    assetManifest = loadAssetManifest();
  } catch {
    assetManifest = null;
  }

  const contexts = [];
  for (const target of targets) {
    try {
      contexts.push(inspectDocument(target, catalog, overrides));
    } catch (error) {
      report.documents.push({ target, title: null, checks: inconclusiveChecks(`検査不成立: ${error.message}`) });
    }
  }

  const crossCheck = contexts.length > 0
    ? checkDuplicateIndexable(CHECK_DEFS[11], contexts)
    : result(CHECK_DEFS[11], { status: INCONCLUSIVE, checked: 0, unit: '章', violations: ['検査できた文書が 0 件'] });
  // 被覆検査は「対象を明示指定して 1 文書だけ回した」ときに赤くしても意味が無いので、
  // 既定（build.documents 全量）で走ったときだけ判定する。
  const coverageCheck = explicit.length > 0
    ? result(CHECK_DEFS[12], {
        status: INCONCLUSIVE,
        checked: 0,
        unit: '文書',
        violations: ['対象を明示指定した実行では被覆を判定しない（引数なしで実行する）'],
      })
    : checkCatalogCoverage(CHECK_DEFS[12], catalog, overrides);

  for (const context of contexts) {
    report.documents.push({
      target: context.target,
      title: context.manifest.documentTitle,
      checks: [
        ...runDocumentChecks(context),
        crossCheck,
        coverageCheck,
        checkTables(CHECK_DEFS[13], context),
        checkChapterOgp(CHECK_DEFS[14], { ...context, assetManifest }),
      ],
    });
  }

  for (const doc of report.documents) {
    for (const check of doc.checks) {
      if (check.status === PASS) report.totals.pass += 1;
      else if (check.status === WARN) report.totals.warn += 1;
      else if (check.status === FAIL) report.totals.fail += 1;
      else report.totals.inconclusive += 1;
    }
  }

  report.exitCode = report.totals.inconclusive > 0 ? 2 : report.totals.fail > 0 ? 1 : 0;
  report.ok = report.exitCode === 0;
  emit(report, asJson);
}

/** console.log の直後に process.exit を書くと出力がパイプで切れるので exitCode だけ設定する。 */
function emit(report, asJson, fallbackMessage) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.documents.length === 0 && fallbackMessage) {
    console.error(fallbackMessage);
  } else {
    console.log(renderText(report));
  }
  process.exitCode = report.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

export { CHECK_DEFS, parseHeadings };
