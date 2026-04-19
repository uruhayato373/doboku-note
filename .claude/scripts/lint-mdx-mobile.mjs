#!/usr/bin/env node
/**
 * MDXモバイル視認性リンター
 *
 * review-mobile スキルのチェック項目のうち、機械判定可能なものを強制する。
 *
 * ルール根拠の単一真実源: `.claude/content-principles.md`
 *   - §4 表は2軸比較にのみ使う        → カテゴリ1 (1-1〜1-5)
 *   - §5 ExamPointは文脈の後に配置    → カテゴリ9 (9-1〜9-6)
 *   - §7 過剰装飾を避ける               → カテゴリ7 (将来追加)
 *   - §8 図表は説明の流れの中に配置     → カテゴリ10 (10-1〜10-5, ArticleImage 規約)
 *   - §8 リンクの使い分け               → カテゴリ8 (8-1, 8-2)
 *   - §9 参考資料の構成                 → カテゴリ9-4
 *
 * Usage:
 *   node scripts/lint-mdx-mobile.mjs <file.mdx>
 *   node scripts/lint-mdx-mobile.mjs <dir>
 *   node scripts/lint-mdx-mobile.mjs                # git diff で変更された MDX を対象
 *
 * 検出ルール:
 *   0-1 HIGH   改行コードの混在（CRLF + LF）— pre-commit hook と同等のガード
 *   1-1 HIGH   表セル内に長いKaTeX数式
 *   1-3 MEDIUM 4列以上の表
 *   1-4 MEDIUM 3列以上の表でセル内テキスト15文字超
 *   1-5 HIGH   キーバリュー表
 *   6-1 MEDIUM 表の直前行が見出しのみで導入文がない
 *   8-1 MEDIUM 末尾の「関連キーワード:」列挙行
 *   8-2 LOW    法令条文の未リンク
 *   9-1 HIGH   <ExamPoint> が3個以上（過去問MDX除外）
 *   9-2 MEDIUM 最初の<ExamPoint>が記事の上位60%以内
 *   9-3 HIGH   <ExamPoint>のsummaryに「誤り選択肢」等を含む
 *   9-4 MEDIUM ## 参考資料 配下の外部リンクが2件未満 or 単一ドメイン
 *   9-5 LOW    「とは」H2セクション直下に<ExamPoint>
 *   9-6 HIGH   本文に「正答：」「❌」「✅」「代表的な誤り」が出現（過去問MDX除外）
 *  10-1 HIGH   <ArticleImage caption="..."> を検出（§8 違反、alt のみにする）
 *  10-2 MEDIUM 生 <img> タグ検出（<ArticleImage> への移行を推奨）
 *  10-3 MEDIUM 画像 alt 属性が 80 字超過
 *  10-5 HIGH   画像ファイル不在 or mime 不整合（HTML エラーページの .jpg 等）
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const CELL_MAX = 15;

// ── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function resolveTargets(args) {
  if (args.length === 0) {
    // git diff モード
    try {
      const out = execSync('git diff --name-only', { encoding: 'utf8' });
      return out
        .split(/\r?\n/)
        .filter((p) => p.endsWith('.mdx') && existsSync(p));
    } catch {
      return [];
    }
  }
  const files = [];
  for (const a of args) {
    if (!existsSync(a)) {
      console.error(`Not found: ${a}`);
      process.exit(2);
    }
    const st = statSync(a);
    if (st.isDirectory()) {
      collectMdx(a, files);
    } else if (a.endsWith('.mdx')) {
      files.push(a);
    }
  }
  return files;
}

function collectMdx(dir, out) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) collectMdx(p, out);
    else if (entry.endsWith('.mdx')) out.push(p);
  }
}

// ── パーサ ───────────────────────────────────────────────────────────────────

/**
 * 行配列から表ブロックを抽出する。
 * 表の条件: 連続する `|` 始まり行のうち、2行目がセパレータ（`|---|---|` 形式）
 * 返値: [{ startLine, endLine, headerLine, separatorLine, dataLines }]
 * 1-based 行番号。
 */
function extractTables(lines) {
  const tables = [];
  const isPipeLine = (s) => /^\s*\|.*\|\s*$/.test(s);
  const isSeparator = (s) => /^\s*\|[-:\s|]+\|\s*$/.test(s) && /-/.test(s);

  let i = 0;
  while (i < lines.length) {
    if (isPipeLine(lines[i]) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const startLine = i + 1; // 1-based
      const headerLine = lines[i];
      const separatorLine = lines[i + 1];
      let j = i + 2;
      const dataLines = [];
      while (j < lines.length && isPipeLine(lines[j])) {
        dataLines.push({ lineNum: j + 1, text: lines[j] });
        j++;
      }
      tables.push({
        startLine,
        endLine: j, // 1-based inclusive
        headerLine,
        separatorLine,
        dataLines,
      });
      i = j;
    } else {
      i++;
    }
  }
  return tables;
}

/**
 * `| a | b | c |` を ['a', 'b', 'c'] に分解。
 * 先頭末尾の `|` を除去後、`|` で分割。`\|` エスケープは今回考慮しない。
 */
function splitRow(row) {
  const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

/**
 * セル内テキストの実質文字数。
 * - `$...$` を除外（KaTeX 数式は別ルールで検出）
 * - Markdown リンク `[text](url)` は表示テキスト `text` のみ残す
 * - Markdown 記号 `**`, `*`, `` ` `` を除外
 * - 空白は1文字としてカウント（全角半角区別なし）
 */
function cellLength(cell) {
  const withoutMath = cell.replace(/\$[^$]*\$/g, '');
  const withoutLinks = withoutMath.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  const withoutMd = withoutLinks
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '');
  return [...withoutMd.trim()].length;
}

/**
 * セル内の KaTeX 数式が「モバイル表示を崩すほど長いか」を判定する。
 * $\alpha$ や $H_0$ のような短い記号は許容（レンダリング上の実害が小さい）。
 * 単一の数式スパンで 7 文字以上、または累積で 10 文字以上を NG とする。
 */
function hasLongMath(cell) {
  const spans = [...cell.matchAll(/\$([^$]*)\$/g)].map((m) => m[1]);
  if (spans.length === 0) return false;
  const maxLen = Math.max(...spans.map((s) => s.length));
  const sumLen = spans.reduce((a, s) => a + s.length, 0);
  return maxLen >= 7 || sumLen >= 10;
}

// ── 個別ルール ───────────────────────────────────────────────────────────────

function lintTable(table, findings) {
  const header = splitRow(table.headerLine);
  const colCount = header.length;

  // 1-5 キーバリュー表
  const kvHeaders = ['項目', '内容', '正式名称', '目的', '所管', '施行', '概要'];
  const isKeyValue =
    colCount === 2 && kvHeaders.includes(header[0]) && kvHeaders.includes(header[1]);
  if (isKeyValue) {
    findings.push({
      severity: 'HIGH',
      rule: '1-5',
      line: table.startLine,
      endLine: table.endLine,
      message: `キーバリュー表は冒頭散文に統合すべき（ヘッダー: ${header.join(' / ')}）`,
    });
  }

  // 1-3 4列以上
  if (colCount >= 4) {
    findings.push({
      severity: 'MEDIUM',
      rule: '1-3',
      line: table.startLine,
      endLine: table.endLine,
      message: `${colCount}列表。3列以下に整理するか、箇条書きへの変換を検討`,
    });
  }

  // 全行（ヘッダー含む）を走査して 1-1, 1-4 を判定
  const allRows = [
    { lineNum: table.startLine, cells: header },
    ...table.dataLines.map((d) => ({ lineNum: d.lineNum, cells: splitRow(d.text) })),
  ];

  for (const row of allRows) {
    for (let k = 0; k < row.cells.length; k++) {
      const cell = row.cells[k];

      // 1-1 KaTeX 数式混入（長い数式のみ）
      if (hasLongMath(cell)) {
        findings.push({
          severity: 'HIGH',
          rule: '1-1',
          line: row.lineNum,
          endLine: row.lineNum,
          message: `表セル内に長い KaTeX 数式 — 列${k + 1} ${trimPreview(cell)}`,
        });
      }

      // 1-4 3列以上のセル15字超
      if (colCount >= 3) {
        const len = cellLength(cell);
        if (len > CELL_MAX) {
          findings.push({
            severity: 'MEDIUM',
            rule: '1-4',
            line: row.lineNum,
            endLine: row.lineNum,
            message: `${colCount}列表の列${k + 1}セル「${trimPreview(cell, 30)}」が${len}字（上限${CELL_MAX}）`,
          });
        }
      }
    }
  }
}

function trimPreview(s, max = 20) {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? `「${flat}」` : `「${flat.slice(0, max)}…」`;
}

/**
 * 8-1: 末尾リスト形式の `関連キーワード:` を検出
 * 関連キーワードは本文中にインラインで埋め込むべき。
 */
function lintRelatedKeywordList(lines, findings, offset) {
  for (let i = 0; i < lines.length; i++) {
    if (/^関連キーワード[:：]/.test(lines[i])) {
      findings.push({
        severity: 'MEDIUM',
        rule: '8-1',
        line: i + 1,
        endLine: i + 1,
        message:
          '末尾に「関連キーワード: ...」の列挙行を作らない。本文中にインラインでリンクを埋め込む',
      });
    }
  }
}

/**
 * 8-2: 法令条文への未リンクを検出
 * 「◯◯法第◯条」のパターンが e-Gov へのインラインリンクになっていない場合に LOW で警告する。
 * 既存の Markdown リンク [text](url) 内にあるパターンは対象外。
 */
function lintLegalCitations(lines, findings) {
  // 法令名パターン: 「◯◯法」「憲法」「民法」「刑法」「下請法」等
  // 枝番付き（第◯条の◯）はアンカー形式が不明なので検出対象外（末尾の「のN」を negative lookahead で除外）
  const lawCitationRe = /([一-龥ぁ-んァ-ヶー]{1,12}法|憲法|民法|刑法|下請法)\s*第\s*[\d０-９]+\s*条(?:\s*第\s*[\d０-９]+\s*項)?(?!\s*の\s*[\d０-９])/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    lawCitationRe.lastIndex = 0;
    while ((m = lawCitationRe.exec(line)) !== null) {
      const matchStart = m.index;
      // 該当マッチが既存の Markdown リンク [...](url) 内にあるかチェック
      // 簡易判定: マッチ位置より前の「[」と「]」の数を数え、開き括弧が閉じ括弧より多ければリンクテキスト内
      const before = line.slice(0, matchStart);
      const opens = (before.match(/\[/g) || []).length;
      const closes = (before.match(/\]/g) || []).length;
      if (opens > closes) continue; // リンクテキスト内はスキップ
      findings.push({
        severity: 'LOW',
        rule: '8-2',
        line: i + 1,
        endLine: i + 1,
        message: `法令条文「${m[0]}」が e-Gov へのインラインリンクになっていない`,
      });
    }
  }
}

/**
 * 7-1: 太字スコープ過大
 *
 * `**...**` の中身が30字超 → MEDIUM、50字超 → HIGH。
 * 「○○とは…である」概念定義文で長文全体を太字にする失敗を防ぐ。
 * content-principles.md §7「過剰装飾を避ける」に対応。
 *
 * 除外:
 * - コードブロック（```...```）内
 * - frontmatter は呼び出し側で既に除外済み
 *
 * 太字内のマークダウンリンク `[text](url)` はテキスト部分だけを文字数カウント。
 */
/**
 * 7-2: 太字デリミタ境界のレンダリング破綻
 *
 * CommonMark の強調（`**`）は「閉じ側の直前文字と直後文字」で境界判定される。
 * `**...（X）**の` のように閉じ `**` の直前が全角パンクチュエーション、直後が
 * 非パンクチュエーション（日本語助詞・漢字等）の場合、太字として認識されず
 * 生の `**` がそのまま表示される既知の罠。
 *
 * 検出パターン:
 *   `**.*?[全角パンクチュエーション]\*\*[日本語非パンクチュエーション]`
 *
 * 修正方針: 全角括弧などを太字の外へ出す（例: `**X**（Y）の` or `X（**Y**）の`）
 */
function lintBoldDelimiterBoundary(lines, findings) {
  // 閉じ `**` 直前にあるとレンダリング失敗を引き起こす全角パンクチュエーション
  const CLOSING_PUNCT = '）」』】〕］｝〉》、。・：；！？';
  // `**` 直後で右フランキングを無効化する日本語文字（助詞・漢字等）
  const NON_PUNCT_JP_RE = /[ぁ-んァ-ン一-龥々ー]/;
  const closingPunctRe = new RegExp(`[${CLOSING_PUNCT}]`);

  let inFenced = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      inFenced = !inFenced;
      continue;
    }
    if (inFenced) continue;

    // 行内の `**` 出現位置を収集し、前から順にペアリング（0-1=1st bold, 2-3=2nd bold ...）
    const positions = [];
    let idx = 0;
    while ((idx = line.indexOf('**', idx)) !== -1) {
      positions.push(idx);
      idx += 2;
    }

    for (let p = 0; p + 1 < positions.length; p += 2) {
      const openIdx = positions[p];
      const closeIdx = positions[p + 1];
      const charBefore = line[closeIdx - 1];
      const charAfter = line[closeIdx + 2];
      if (
        charBefore &&
        charAfter &&
        closingPunctRe.test(charBefore) &&
        NON_PUNCT_JP_RE.test(charAfter)
      ) {
        const preview = line.slice(openIdx, closeIdx + 2);
        const shortPreview = preview.length > 30 ? preview.slice(0, 30) + '…' : preview;
        findings.push({
          severity: 'MEDIUM',
          rule: '7-2',
          line: i + 1,
          endLine: i + 1,
          message: `太字デリミタが CommonMark 規則違反でレンダリングされない可能性: 「${shortPreview}${charAfter}」。全角パンクチュエーションを太字の外へ出す（例: \`**X**（Y）の\`）`,
        });
      }
    }
  }
}

function lintBoldScope(lines, findings) {
  const MEDIUM_THRESHOLD = 30;
  const HIGH_THRESHOLD = 50;
  let inFenced = false;

  // 簡易パターン: `**...**` で間に `*` を含まないもの
  const boldRe = /\*\*([^*\n]+?)\*\*/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      inFenced = !inFenced;
      continue;
    }
    if (inFenced) continue;

    boldRe.lastIndex = 0;
    let m;
    while ((m = boldRe.exec(line)) !== null) {
      const inner = m[1];
      // マークダウンリンクのテキスト部分のみカウント
      const stripped = inner.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      const len = [...stripped].length; // 絵文字・サロゲートペアを正しく数える

      if (len > HIGH_THRESHOLD) {
        findings.push({
          severity: 'HIGH',
          rule: '7-1',
          line: i + 1,
          endLine: i + 1,
          message: `太字スコープが ${len} 字（${HIGH_THRESHOLD} 字超）。核心キーワードのみに絞ること: 「${trimPreview(stripped, 30)}」`,
        });
      } else if (len > MEDIUM_THRESHOLD) {
        findings.push({
          severity: 'MEDIUM',
          rule: '7-1',
          line: i + 1,
          endLine: i + 1,
          message: `太字スコープが ${len} 字（${MEDIUM_THRESHOLD} 字超）。核心キーワードのみに絞ることを推奨: 「${trimPreview(stripped, 30)}」`,
        });
      }
    }
  }
}

/**
 * 6-1: 表の直前行が見出しのみで導入文がない
 * 表開始行の直前にある非空行が `##` / `###` で始まる場合は違反。
 */
function lintHeadingBeforeTable(table, lines, findings) {
  let idx = table.startLine - 2; // 直前行の0-based index
  while (idx >= 0 && lines[idx].trim() === '') idx--;
  if (idx < 0) return;
  const prev = lines[idx];
  if (/^#{2,4}\s/.test(prev)) {
    findings.push({
      severity: 'MEDIUM',
      rule: '6-1',
      line: table.startLine,
      endLine: table.startLine,
      message: `表の直前に導入文がない（直前行: ${trimPreview(prev, 30)}）`,
    });
  }
}

/**
 * カテゴリ9: コンポーネント原則（content-principles.md §5・§9）
 *
 * 過去問MDX（r*-primary, h*-primary, r*-secondary）は ExamPoint 多数や ❌✅ が正常なため除外。
 *
 * 9-1 HIGH   <ExamPoint> が3個以上
 * 9-2 MEDIUM 最初の <ExamPoint> が記事の上位60%以内
 * 9-3 HIGH   <ExamPoint> の summary/items に「誤り選択肢」「代表的な誤り」等を含む
 * 9-4 MEDIUM ## 参考資料 配下の外部リンクが2件未満 or 単一ドメイン100%
 * 9-5 LOW    「とは」を含む H2 の直下に <ExamPoint> がある
 * 9-6 HIGH   本文に「正答：」「❌」「✅」「代表的な誤り」が出現
 */
function isExamArchive(filePath) {
  return /[\\\/](?:r|h)\d{2}-(?:primary|secondary)[\\\/]/.test(filePath);
}

function lintComponentPrinciples(lines, filePath, findings) {
  if (isExamArchive(filePath)) return;

  // ExamPoint 開始行を全て収集
  const examPointStarts = [];
  for (let i = 0; i < lines.length; i++) {
    if (/<ExamPoint(\s|$|\/)/.test(lines[i])) {
      examPointStarts.push(i + 1); // 1-based
    }
  }

  // 9-1: ExamPoint 3個以上
  if (examPointStarts.length >= 3) {
    findings.push({
      severity: 'HIGH',
      rule: '9-1',
      line: examPointStarts[0],
      endLine: examPointStarts[examPointStarts.length - 1],
      message: `<ExamPoint> が ${examPointStarts.length} 個。原則1個・最大2個（content-principles.md §5）`,
    });
  }

  // 9-2: 総括 ExamPoint（記事末尾60%以降）が存在しない
  // 「最後の」ExamPoint が60%地点以降にない = 総括ExamPointが欠落、または前に偏っている
  if (examPointStarts.length > 0 && lines.length > 0) {
    const lastEpRatio = examPointStarts[examPointStarts.length - 1] / lines.length;
    if (lastEpRatio < 0.6) {
      findings.push({
        severity: 'MEDIUM',
        rule: '9-2',
        line: examPointStarts[examPointStarts.length - 1],
        endLine: examPointStarts[examPointStarts.length - 1],
        message: `総括 <ExamPoint> が記事の ${(lastEpRatio * 100).toFixed(0)}% 地点。記事末尾「総合技術監理における位置づけ」の総括ExamPointを必須とする（§5）`,
      });
    }
  }

  // 9-3: ExamPoint summary/items に「誤り選択肢」等
  // ExamPointブロック全体（開始タグから自己終了 /> または </ExamPoint> まで）を結合してチェック
  for (const startLine of examPointStarts) {
    const startIdx = startLine - 1;
    let endIdx = startIdx;
    while (endIdx < lines.length) {
      if (/\/>\s*$/.test(lines[endIdx]) || /<\/ExamPoint>/.test(lines[endIdx])) break;
      endIdx++;
    }
    const block = lines.slice(startIdx, endIdx + 1).join('\n');
    if (/誤り選択肢|選択肢パターン|代表的な誤り|頻出の誤り/.test(block)) {
      findings.push({
        severity: 'HIGH',
        rule: '9-3',
        line: startLine,
        endLine: endIdx + 1,
        message: '<ExamPoint> に「誤り選択肢」「代表的な誤り」等の過去問解説に属する内容を書かない（過去問MDXの <details> へ移管）',
      });
    }
  }

  // 9-4: ## 参考資料 配下の外部リンク数とドメイン
  const refStartIdx = lines.findIndex((l) => /^##\s+参考資料/.test(l));
  if (refStartIdx >= 0) {
    let refEnd = refStartIdx + 1;
    while (refEnd < lines.length && !/^##\s/.test(lines[refEnd])) refEnd++;
    const refSection = lines.slice(refStartIdx + 1, refEnd).join('\n');
    const urls = [...refSection.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]);
    const domains = new Set(urls.map((u) => {
      try {
        return new URL(u).hostname;
      } catch {
        return u;
      }
    }));
    if (urls.length < 2) {
      findings.push({
        severity: 'MEDIUM',
        rule: '9-4',
        line: refStartIdx + 1,
        endLine: refEnd,
        message: `参考資料の外部リンクが ${urls.length} 件（公的＋民間 各最低1件 = 2件以上必要、§9）`,
      });
    } else if (domains.size === 1) {
      findings.push({
        severity: 'MEDIUM',
        rule: '9-4',
        line: refStartIdx + 1,
        endLine: refEnd,
        message: `参考資料が単一ドメイン（${[...domains][0]}）。公的＋民間の組み合わせが必要（§9）`,
      });
    } else {
      // 公的（go.jp/ac.jp/or.jp）と民間の両方があるか判定
      const hasOfficial = [...domains].some((d) => /\.(go|ac|or)\.jp$/.test(d));
      const hasPrivate = [...domains].some((d) => !/\.(go|ac|or)\.jp$/.test(d));
      if (!hasOfficial || !hasPrivate) {
        findings.push({
          severity: 'MEDIUM',
          rule: '9-4',
          line: refStartIdx + 1,
          endLine: refEnd,
          message: `参考資料が${hasOfficial ? '公的のみ' : '民間のみ'}。公的＋民間 各1件以上が必要（§9）`,
        });
      }
    }
  }

  // 9-5: 「とは」H2 の直下（最初のH3より前）に <ExamPoint>
  // H3 サブセクション内の ExamPoint は対象外（BCPページ等で正常パターン）
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+.*とは/.test(lines[i])) {
      for (let j = i + 1; j < lines.length; j++) {
        // 次の H2 または H3 が来たら打ち切り（H3 サブセクション以降は対象外）
        if (/^##\s/.test(lines[j]) || /^###\s/.test(lines[j])) break;
        if (/<ExamPoint(\s|$|\/)/.test(lines[j])) {
          findings.push({
            severity: 'LOW',
            rule: '9-5',
            line: j + 1,
            endLine: j + 1,
            message: `「とは」H2 の直下（H3前）に <ExamPoint>。概念説明の前に試験ポイントを置かない（§5）`,
          });
          break;
        }
      }
    }
  }

  // 9-6: 本文に過去問判定記号
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // <ExamPoint> ブロック内・details ブロック内は別ルール（9-3）でカバー
    const m = line.match(/(正答[：:]|代表的な誤り|❌|✅)/);
    if (m) {
      findings.push({
        severity: 'HIGH',
        rule: '9-6',
        line: i + 1,
        endLine: i + 1,
        message: `本文に過去問判定記号「${m[0]}」。キーワードページは概念解説に専念し、判定記号は過去問MDXのみに（§5）`,
      });
    }
  }
}

// ── カテゴリ10: 画像・<ArticleImage> 規約 ──────────────────────────────────

/**
 * 10-1 HIGH   <ArticleImage caption="..."> の caption 属性（§8 違反）
 * 10-2 MEDIUM 生 <img> タグ（<ArticleImage> への移行推奨）
 * 10-3 MEDIUM alt 属性が 80 字超過
 * 10-5 HIGH   画像ファイル不在 or mime が拡張子と不一致（HTML エラーページ偽 JPG 等）
 *
 * 真実源: .claude/content-principles.md §8 L146
 *   「<ArticleImage> の caption は使わない。alt 属性のみ設定する」
 */
function lintImages(lines, findings) {
  const content = lines.join('\n');

  // マルチライン JSX タグに対応（属性が複数行にまたがる場合あり）
  // `<img ... />` または `<ArticleImage ... />` を検出
  const tagRegex = /<(img|ArticleImage)\b([\s\S]*?)\/?>/g;

  for (const match of content.matchAll(tagRegex)) {
    const tagName = match[1];
    const attrs = match[2];
    // frontmatter 除去後の相対行番号
    const lineNum = content.slice(0, match.index).split('\n').length;

    // 10-1: <ArticleImage> に caption 属性
    if (tagName === 'ArticleImage' && /\bcaption\s*=/.test(attrs)) {
      findings.push({
        severity: 'HIGH',
        rule: '10-1',
        line: lineNum,
        endLine: lineNum,
        message: `<ArticleImage caption="..."> を検出。content-principles §8: caption は使わず alt のみ設定する`,
      });
    }

    // 10-2: 生 <img> タグ
    if (tagName === 'img') {
      findings.push({
        severity: 'MEDIUM',
        rule: '10-2',
        line: lineNum,
        endLine: lineNum,
        message: `生 <img> タグを検出。<ArticleImage> への移行を推奨（image-policy.md「推奨コンポーネント」参照）`,
      });
    }

    // 10-3: alt 80 字超過
    const altMatch = attrs.match(/\balt\s*=\s*["']([^"']*)["']/);
    if (altMatch) {
      const altLen = [...altMatch[1]].length;
      if (altLen > 80) {
        findings.push({
          severity: 'MEDIUM',
          rule: '10-3',
          line: lineNum,
          endLine: lineNum,
          message: `alt 属性が ${altLen} 字（上限 80）。機種名・特徴は本文 or {/* source: */} コメントに移す`,
        });
      }
    }

    // 10-5: 画像ファイル実在＋mime チェック（/posts/... で始まる内部参照のみ）
    const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/);
    if (srcMatch && srcMatch[1].startsWith('/posts/')) {
      const localPath = 'public' + srcMatch[1];
      if (!existsSync(localPath)) {
        findings.push({
          severity: 'HIGH',
          rule: '10-5',
          line: lineNum,
          endLine: lineNum,
          message: `画像ファイルが存在しない: ${localPath}`,
        });
      } else {
        try {
          const buf = readFileSync(localPath);
          const head = buf.slice(0, 200).toString('utf8');
          const first4 = buf.slice(0, 4);
          const isJPEG = first4[0] === 0xff && first4[1] === 0xd8 && first4[2] === 0xff;
          const isPNG =
            first4[0] === 0x89 &&
            first4[1] === 0x50 &&
            first4[2] === 0x4e &&
            first4[3] === 0x47;
          const isGIF = /^GIF8/.test(head);
          const isWebP =
            buf.slice(0, 4).toString() === 'RIFF' &&
            buf.slice(8, 12).toString() === 'WEBP';
          const isSVG = /<svg[\s>]|<\?xml[\s\S]{0,200}<svg/.test(head);
          const looksHTMLerror =
            !isSVG && /^<(!DOCTYPE|!doctype|html|HTML|\?xml[\s\S]{0,200}<(html|body))/i.test(head.trim());

          const ext = srcMatch[1].toLowerCase().split('.').pop();
          let mimeOk = true;
          if (ext === 'jpg' || ext === 'jpeg') mimeOk = isJPEG;
          else if (ext === 'png') mimeOk = isPNG;
          else if (ext === 'gif') mimeOk = isGIF;
          else if (ext === 'webp') mimeOk = isWebP;
          else if (ext === 'svg') mimeOk = isSVG;

          if (looksHTMLerror) {
            findings.push({
              severity: 'HIGH',
              rule: '10-5',
              line: lineNum,
              endLine: lineNum,
              message: `画像ファイルが HTML/テキスト（エラーページの可能性）: ${localPath} (${buf.length} bytes)`,
            });
          } else if (!mimeOk) {
            const headerHex = [...first4].map((b) => b.toString(16).padStart(2, '0')).join(' ');
            findings.push({
              severity: 'HIGH',
              rule: '10-5',
              line: lineNum,
              endLine: lineNum,
              message: `画像の mime が拡張子と不一致: ${localPath} (ext=${ext}, 先頭バイト=${headerHex})`,
            });
          }
        } catch {
          // 読み取り失敗は握り潰す（権限エラー等）
        }
      }
    }
  }
}

// ── メイン ───────────────────────────────────────────────────────────────────

function lintFile(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const findings = [];

  // 0-1: 改行コードの混在（CRLF + LF）
  // pre-commit hook と同じロジックで早期検出
  if (raw.includes('\r\n')) {
    const afterCRLFRemoval = raw.split('\r\n').join('');
    if (afterCRLFRemoval.includes('\n') || afterCRLFRemoval.includes('\r')) {
      findings.push({
        severity: 'HIGH',
        rule: '0-1',
        line: 1,
        endLine: 1,
        message: '改行コードの混在（CRLF + LF）。.claude/scripts/lib/mdx-io.mjs を経由して書き込むこと',
      });
    }
  } else if (raw.includes('\r')) {
    // 純粋な CR のみ（旧Mac）
    findings.push({
      severity: 'HIGH',
      rule: '0-1',
      line: 1,
      endLine: 1,
      message: '改行コードに CR が混入。.claude/scripts/lib/mdx-io.mjs を経由して書き込むこと',
    });
  }

  // frontmatter を除外
  const content = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  const offset = (raw.length - content.length > 0)
    ? raw.slice(0, raw.length - content.length).split(/\r?\n/).length - 1
    : 0;
  const lines = content.split(/\r?\n/);

  const tables = extractTables(lines);
  for (const t of tables) {
    lintTable(t, findings);
    lintHeadingBeforeTable(t, lines, findings);
  }

  lintRelatedKeywordList(lines, findings);
  lintLegalCitations(lines, findings);
  lintBoldScope(lines, findings);
  lintBoldDelimiterBoundary(lines, findings);
  lintComponentPrinciples(lines, filePath, findings);
  lintImages(lines, findings);

  // 行番号を frontmatter 分シフト（ただし 0-1 はファイル全体の問題なので対象外）
  for (const f of findings) {
    if (f.rule === '0-1') continue;
    f.line += offset;
    f.endLine += offset;
  }

  return findings;
}

function severityRank(s) {
  return { HIGH: 0, MEDIUM: 1, LOW: 2 }[s] ?? 3;
}

function main() {
  const targets = resolveTargets(args);
  if (targets.length === 0) {
    console.log('No MDX files to lint.');
    process.exit(0);
  }

  let totalHigh = 0;
  let totalMedium = 0;
  let totalLow = 0;
  let anyFindings = false;

  for (const file of targets) {
    const findings = lintFile(file);
    if (findings.length === 0) continue;
    anyFindings = true;

    findings.sort(
      (a, b) => severityRank(a.severity) - severityRank(b.severity) || a.line - b.line,
    );

    console.log(`\n=== ${file} ===`);
    for (const f of findings) {
      const range = f.line === f.endLine ? `L${f.line}` : `L${f.line}-${f.endLine}`;
      console.log(`[${f.severity}] ${range} (${f.rule}) ${f.message}`);
      if (f.severity === 'HIGH') totalHigh++;
      else if (f.severity === 'MEDIUM') totalMedium++;
      else totalLow++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  if (!anyFindings) {
    console.log(`✓ ${targets.length} file(s) passed.`);
    process.exit(0);
  }
  console.log(`Summary: HIGH ${totalHigh} / MEDIUM ${totalMedium} / LOW ${totalLow}`);
  process.exit(totalHigh > 0 ? 1 : 0);
}

main();
