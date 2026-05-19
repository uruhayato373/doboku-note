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
 *   - §8 リンクの使い分け               → カテゴリ8 (8-1, 8-2, 8-3)
 *   - §9 参考資料の構成                 → カテゴリ9-4
 *
 * カテゴリ2（見出し構造）のみ根拠が異なる:
 *   CLAUDE.md「見出しは H2 以下のみ（H1 は frontmatter から自動生成）」/
 *   .claude/reference/exam-content-policy.md /
 *   .claude/skills/conversion/exam-questions-import/SKILL.md → カテゴリ2 (2-1, 2-3)
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
 *   2-1 HIGH   本文 H1（# ）— ページ H1 は frontmatter title から自動描画
 *   2-3 MEDIUM 見出しがページタイトルとほぼ重複
 *   6-1 MEDIUM 表の直前行が見出しのみで導入文がない
 *   8-1 MEDIUM 末尾の「関連キーワード:」列挙行
 *   8-2 LOW    法令条文の未リンク
 *   8-3 MEDIUM note 記事リンクが <NoteLink> 外（生 markdown・Callout・LinkCard）
 *   9-1 HIGH   <ExamPoint> が3個以上（過去問MDX除外）
 *   9-2 MEDIUM 最初の<ExamPoint>が記事の上位60%以内
 *   9-3 HIGH   <ExamPoint>のsummaryに「誤り選択肢」等を含む
 *   9-4 MEDIUM ## 参考資料 配下の外部リンクが2件未満 or 単一ドメイン
 *   9-5 LOW    「とは」H2セクション直下に<ExamPoint>
 *   9-6 HIGH   本文に「正答：」「❌」「✅」「代表的な誤り」が出現（過去問MDX除外）
 *   9-7 MEDIUM 総監ページに教材外の実務応用セクション（pe-comprehensive-management 限定）
 *   9-8 HIGH   <RelatedKeywords> の prop 名が `keywords=`（正: `items=`）— 誤ると無描画
 *   9-9 MEDIUM <RelatedKeywords> の slug に PE 接頭辞「pe-comprehensive-management-」付与（PE 既定のため冗長。civil 接頭辞は必須なので対象外）
 *   9-10 HIGH  <RelatedKeywords> が `## 参考資料` の後に配置（§18 違反、MDX が描画失敗することあり）
 *   9-11 HIGH  <ExamPoint items> の各文字列に句読点（、。，．）を含む（機械分割バグ検出）
 *   9-12 HIGH  civil secondary-r0X で `## 問題` 数 > `<details>` 数（解答欠落検出）
 *   9-13 MEDIUM civil 過去問 MDX に textbook/guide への内部リンクが無い（内部リンク密度の指標）
 *   0-2 HIGH   Docusaurus 旧 frontmatter（id/sidebar_label/toc_min_heading_level/toc_max_heading_level）残存
 *  10-1 HIGH   <ArticleImage caption> が 60 字超（説明型 caption、§8 違反）
 *  10-2 MEDIUM 生 <img> タグ検出（<ArticleImage> への移行を推奨）
 *  10-3 MEDIUM 画像 alt 属性が 80 字超過
 *  10-5 HIGH   画像ファイル不在 or mime 不整合（HTML エラーページの .jpg 等）
 *  11-1 MEDIUM \frac{} の分子 or 分母に \text{} を含む（CJK 縮小回避のため \dfrac を推奨）
 *  11-2 MEDIUM 単行 $$<content>$$ を検出（remark-math v6 で inline 扱い、複数行化推奨）
 *  12-1 MEDIUM group: guide で `## 総合技術監理における位置づけ` を検出（キーワード専用、content-principles.md §20）
 *  12-2 MEDIUM group: guide で `## 参考資料` または `## 参考文献` を検出（外部離脱を最小化、§20）
 *  12-3 LOW    group: guide で末尾 H2 が承認パターン外（次のステップ / 関連リソース / ○○の選択肢）
 *  13-1 MEDIUM r8-essay-theme-* spoke で許可外の ### ペルソナ名を検出（content-principles.md §21）
 *  13-2 MEDIUM r8-essay-theme-* spoke で「## ペルソナ別の取り組み方」配下の ### サブセクション数が 5 個でない（content-principles.md §21、4 ペルソナ + 業界外救済 = 5 個が正常）
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
 * 8-3: note 記事リンクが <NoteLink> 外で書かれているのを検出
 *
 * note.com/dobokunote/n/ への記事リンクは <NoteLink> コンポーネントに統一する。
 * 生 markdown リンク・<Callout type="reference">・<LinkCard> 内の note 記事リンクを
 * MEDIUM で警告する。magazine リンク（/m/）は <MagazineInlineCard> 担当のため対象外。
 * 真実源: .claude/reference/content-authoring.md「リンク系コンポーネントの使い分け」
 */
function lintNoteLink(lines, findings) {
  let inFence = false;
  let inNoteLink = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // フェンスコードブロックをスキップ
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    // <NoteLink> ブロックの開始を追跡（同一行 self-close も含む）
    if (line.includes('<NoteLink')) inNoteLink = true;
    // note 記事リンク（/n/）が <NoteLink> 外にあれば警告
    if (line.includes('note.com/dobokunote/n/') && !inNoteLink) {
      findings.push({
        severity: 'MEDIUM',
        rule: '8-3',
        line: i + 1,
        endLine: i + 1,
        message:
          'note 記事リンクは <NoteLink> に統一する（生 markdown・<Callout>・<LinkCard> で note 記事リンクを書かない）',
      });
    }
    // <NoteLink> ブロックの終了判定（/> または </NoteLink>）
    if (inNoteLink && (/\/>/.test(line) || line.includes('</NoteLink>'))) {
      inNoteLink = false;
    }
  }
}

/**
 * 2-1 / 2-3: 見出し構造の検出
 *
 * 2-1 HIGH   本文 H1（行頭 `# `）。ページ H1 は frontmatter title から
 *            page.tsx が server-side 描画し、stripLeadingH1() が本文先頭の
 *            H1 を除去する。本文に H1 を書くと dead content か二重 H1 になる。
 * 2-3 MEDIUM 見出しがページタイトルとほぼ重複（bigram Dice ≥ 0.55）。
 *            タイトルは H1 として自動描画されるため、それを言い換えただけの
 *            見出し（例: 過去問の「## 平成XX年度技術士第二次試験問題【…】」）は
 *            冗長。タイトルを接頭辞に持つ見出し（「○○とは」等）は除外。
 *
 * 真実源: CLAUDE.md「見出しは H2 以下のみ」/ exam-content-policy.md /
 *         exam-questions-import SKILL.md
 */
function lintHeadingStructure(lines, raw, findings) {
  // --- 2-1: 本文 H1 ---
  let inFence = false;
  let seenContent = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/^#\s+\S/.test(line)) {
      findings.push({
        severity: 'HIGH',
        rule: '2-1',
        line: i + 1,
        endLine: i + 1,
        message: seenContent
          ? '本文中に # H1 がある。見出しは H2 以下のみ（ページ H1 は frontmatter title から自動描画）'
          : '本文先頭の # H1 は禁止。ページ H1 は frontmatter title から server-side 描画される（page.tsx stripLeadingH1）',
      });
    }
    if (line.trim() !== '') seenContent = true;
  }

  // --- 2-3: title 重複見出し ---
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return;
  const titleLine = fm[1].match(/^title:\s*(.+?)\s*$/m);
  if (!titleLine) return;
  // 記号・空白・括弧類を除去して CJK + 英数字のみ残す
  const normalize = (s) =>
    s.replace(/["'「」『』【】（）()｜|・,，、。．.\-—–:：;；!！?？\s]/g, '');
  const normTitle = normalize(titleLine[1]);
  if (normTitle.length < 6) return;
  const bigrams = (s) => {
    const set = new Set();
    for (let j = 0; j < s.length - 1; j++) set.add(s.slice(j, j + 2));
    return set;
  };
  const titleBg = bigrams(normTitle);
  inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const h = line.match(/^#{2,6}\s+(.+?)\s*$/);
    if (!h) continue;
    const normH = normalize(h[1]);
    if (normH.length < 10) continue; // 短い見出しは「タイトル重複」とみなさない
    // タイトルを接頭辞に持つ／持たれる見出しは正当な話題見出し（「○○とは」等）
    if (normH.startsWith(normTitle) || normTitle.startsWith(normH)) continue;
    const hBg = bigrams(normH);
    let shared = 0;
    for (const b of hBg) if (titleBg.has(b)) shared++;
    const dice = (2 * shared) / (titleBg.size + hBg.size);
    if (dice >= 0.55) {
      findings.push({
        severity: 'MEDIUM',
        rule: '2-3',
        line: i + 1,
        endLine: i + 1,
        message: `見出し「${h[1]}」がページタイトルとほぼ重複（類似度 ${(dice * 100).toFixed(0)}%）。重複見出しは削除する`,
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
 * 9-7 MEDIUM 総監ページに教材外の実務応用セクション（pe-comprehensive-management 限定、§15）
 */
function isExamArchive(filePath) {
  // PE 形式: r05-primary/, h28-secondary/, r05-essay-environment-survey/
  if (/[\\\/](?:r|h)\d{2}-(?:primary|secondary|essay)/.test(filePath)) return true;
  // Civil 形式: primary-r05-a/, primary-h28-b/, secondary-r03/, secondary-concrete-past-problems/
  if (/civil-construction-1[\\\/](?:primary|secondary)-/.test(filePath)) return true;
  return false;
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

  // 9-7: 総監ページに教材外の実務応用セクション禁止（pe-comprehensive-management/ 限定）
  // 真実源: content-principles.md §15
  // H2 が「建設」「業務」「実務」「現場」で始まり、内に「活用 / 適用 / 応用 / 留意点 / 事例 / 実例」を含む場合を検知。
  // 観測されたパターン例: 建設現場での適用 / 建設プロジェクトでの適用 / 建設分野での活用 /
  // 建設部門における活用実務 / 建設部門での活用 / 建設部門における実務上の留意点 /
  // 建設・インフラ分野での活用事例 / 建設部門における事例 / 建設部門における適用事例 /
  // 建設部門における実務での活用例 / 建設現場での留意点
  if (isPeComprehensiveManagement(filePath)) {
    const forbiddenH2 = /^##\s+(建設|業務|実務|現場)[^#\n]*?(活用|適用|応用|留意点|事例|実例)/;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(forbiddenH2);
      if (m) {
        findings.push({
          severity: 'MEDIUM',
          rule: '9-7',
          line: i + 1,
          endLine: i + 1,
          message: `総監ページに教材外の実務応用セクション「${line.trim()}」。教材原典に無い独自セクションは追加しない（content-principles.md §15）。校正時は原則削除`,
        });
      }
    }
  }
}

function isPeComprehensiveManagement(filePath) {
  return /[\\\/]pe-comprehensive-management[\\\/]/.test(filePath);
}

/**
 * R8 予想問題 spoke 判定（content-principles.md §21 対象）。
 * 将来追加される r9-essay-theme-* 等への拡張余地として、`r[0-9]+-essay-theme-` 形式は将来検討。
 */
function isR8EssayThemeSpoke(filePath) {
  return /[\\\/]r8-essay-theme-[a-z0-9-]+[\\\/]article\.mdx$/i.test(filePath);
}

/**
 * R8 spoke で許可された H3 名（content-principles.md §21）。
 * 4 固定ペルソナ + 業界外救済セクションの計 5 個。
 * - ペルソナ名は note magazine M5-M8 / src/lib/note-magazines.ts と完全一致
 * - 業界外受験者は前方一致で判定（カッコ書きサフィックスを許容）
 */
const R8_SPOKE_ALLOWED_PERSONAS = [
  'ゼネコン',
  '河川コンサル',
  '環境調査',
  '道路発注者',
  '業界外受験者',
];

// 9-8 / 9-9: <RelatedKeywords> コンポーネント API 違反
// 真実源: src/components/ui/RelatedKeywords/RelatedKeywords.tsx
//   - prop 名は items（keywords ではない）
//   - PE ページ: slug は bare（コンポーネントが pe-comprehensive-management- を自動付与）
//   - civil ページ: slug は civil-construction-1- 接頭辞必須（bare だと PE フォールバックで 404）
//
// 9-9 は「PE 接頭辞を渡している（冗長）」のみを検出する。
// civil-construction-1- 接頭辞は必須なのでフラグしない（2026-05-17 に修正、240 件リンク切れ事故の再発防止）。
function lintRelatedKeywordsComponent(lines, findings) {
  // 「冗長な」接頭辞のみ列挙。civil-construction-1- は必須なので含めない。
  const REDUNDANT_PREFIXES = ['pe-comprehensive-management-'];

  for (let i = 0; i < lines.length; i++) {
    if (!/<RelatedKeywords(\s|$|\/|>)/.test(lines[i])) continue;

    const startLine = i + 1;
    let endIdx = i;
    while (endIdx < lines.length) {
      if (/\/>\s*$/.test(lines[endIdx])) break;
      if (/<\/RelatedKeywords>/.test(lines[endIdx])) break;
      endIdx++;
      if (endIdx - i > 50) break;
    }
    const block = lines.slice(i, endIdx + 1).join('\n');

    // 9-8 HIGH: keywords= prop（items= がなく keywords= がある）
    const hasItemsProp = /\bitems\s*=\s*\{/.test(block);
    const hasKeywordsProp = /\bkeywords\s*=\s*\{/.test(block);
    if (hasKeywordsProp && !hasItemsProp) {
      findings.push({
        severity: 'HIGH',
        rule: '9-8',
        line: startLine,
        endLine: endIdx + 1,
        message: '<RelatedKeywords> の prop 名が `keywords=` になっている（正: `items=`）。誤ると items が undefined となりコンポーネント全体が描画されない',
      });
    }

    // 9-9 MEDIUM: PE 接頭辞が付いている（冗長 — コンポーネント default が PE のため）
    // 注意: civil-construction-1- 接頭辞は civil ページで必須なのでフラグしない
    const slugRe = /slug:\s*["']([^"']+)["']/g;
    let m;
    while ((m = slugRe.exec(block)) !== null) {
      const slug = m[1];
      const matchedPrefix = REDUNDANT_PREFIXES.find((p) => slug.startsWith(p));
      if (matchedPrefix) {
        const upToMatch = block.slice(0, m.index);
        const lineOffset = upToMatch.split('\n').length - 1;
        const bare = slug.slice(matchedPrefix.length);
        findings.push({
          severity: 'MEDIUM',
          rule: '9-9',
          line: startLine + lineOffset,
          endLine: startLine + lineOffset,
          message: `<RelatedKeywords> の slug "${slug}" に冗長な接頭辞「${matchedPrefix}」が含まれている。bare slug（例: "${bare}"）を渡す（civil-construction-1- 接頭辞は必須なので除外）`,
        });
      }
    }

    i = endIdx;
  }

  // 9-10 HIGH: <RelatedKeywords> が ## 参考資料 の後に配置されている
  // 真実源: content-principles.md §18（RelatedKeywords は ## 参考資料 の前）
  // 現実問題: 「## 参考資料 + Markdown リスト + JSX」の順序だと MDX が JSX を
  // 正しく解釈できず、コンポーネントが描画されないことがある（過去事例: eco-label / csr 等）
  let refIdx = -1;
  let rkIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (refIdx === -1 && /^##\s+参考資料/.test(lines[i])) refIdx = i;
    if (rkIdx === -1 && /<RelatedKeywords(\s|$|\/|>)/.test(lines[i])) rkIdx = i;
  }
  if (refIdx !== -1 && rkIdx !== -1 && rkIdx > refIdx) {
    findings.push({
      severity: 'HIGH',
      rule: '9-10',
      line: rkIdx + 1,
      endLine: rkIdx + 1,
      message: '<RelatedKeywords> が「## 参考資料」の後に配置されている。§18 違反。Markdown リスト直後の JSX は MDX で描画されないことがあるため、必ず「## 参考資料」の前に置く',
    });
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
 *   「caption は『図の説明』には使わない。ただし出典・帰属・機種名などの
 *   短い帰属情報（60字以内）は caption に書いてよい」
 */
const CAPTION_MAX = 60;

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

    // 10-1: <ArticleImage> の caption が長すぎる（説明型 caption を検出）
    // 短文（≤60字）の帰属情報は OK、長文は §8 違反として HIGH
    if (tagName === 'ArticleImage') {
      const captionMatch = attrs.match(/\bcaption\s*=\s*["']([^"']*)["']/);
      if (captionMatch) {
        const captionLen = [...captionMatch[1]].length;
        if (captionLen > CAPTION_MAX) {
          findings.push({
            severity: 'HIGH',
            rule: '10-1',
            line: lineNum,
            endLine: lineNum,
            message: `<ArticleImage caption="..."> が ${captionLen} 字（帰属情報のみ、上限 ${CAPTION_MAX} 字）。図の説明は本文に移す（content-principles §8）`,
          });
        }
      }
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

/**
 * カテゴリ 11: 数式（KaTeX）の可読性
 *
 * 11-1 MEDIUM: `\frac{A}{B}` の分子 A または分母 B に `\text{...}` が含まれる。
 *   KaTeX は `\frac` の分子・分母を size3 (0.7em) で縮小するため、CJK テキスト
 *   （`\text{}` 内）が視覚的に読みにくくなる。`\dfrac` は displaystyle で
 *   固定するため縮小を回避する。
 *
 * 注: インライン数式（$...$）では `\dfrac` は行内高さを異常に増やすため、
 *   display 数式（$$...$$）内の `\frac{\text{...}}` のみ検出対象とする。
 *   ただし実装の簡潔性から、$$..$$ か $..$ かの厳密判定はせず、
 *   `\frac{...\text{...}...}` パターン全般を警告（実害は MEDIUM 止まり）。
 */
function lintMathFractions(lines, findings) {
  const content = lines.join('\n');
  // \frac{...} のバランスマッチング（簡易版: 最初の `{` から対応する `}` まで）
  const fracRe = /\\frac(?=\{)/g;
  let m;
  while ((m = fracRe.exec(content)) !== null) {
    const offset = m.index;
    const firstArg = extractBraced(content, offset + 5); // '\frac'.length = 5
    if (!firstArg) continue;
    const secondOpen = firstArg.endIdx + 1;
    if (content[secondOpen] !== '{') continue;
    const secondArg = extractBraced(content, secondOpen);
    if (!secondArg) continue;

    const hasTextNum = /\\text\{/.test(firstArg.inner);
    const hasTextDen = /\\text\{/.test(secondArg.inner);
    if (!hasTextNum && !hasTextDen) continue;

    // 行番号を算出
    const upTo = content.slice(0, offset);
    const line = upTo.split('\n').length;
    const snippet = content.slice(offset, Math.min(offset + 80, content.length)).replace(/\n/g, ' ');
    findings.push({
      severity: 'MEDIUM',
      rule: '11-1',
      line,
      endLine: line,
      message: `"\\frac{...\\text{...}...}" を "\\dfrac" に置換を推奨（KaTeX の size3 縮小回避、content-authoring.md §数式 参照）: ${snippet}`,
    });
  }
}

/**
 * 11-2: 単行 `$$<content>$$` を検出。
 *
 * 理由: remark-math v6 は単行 `$$X$$` を inline math として解釈する。
 *   display math にするには開始/終了 `$$` を別行に配置する必要がある。
 *   inline mode では `\frac` が scriptstyle で分子・分母を 70% に縮小し、
 *   `.katex-display` クラスも生成されないためブロック数式のスタイルが効かない。
 *
 * コードブロック内の `$$` は skip（誤検出防止）。
 */
function lintMathSingleLineDisplay(lines, findings) {
  let inCodeFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;
    const m = line.match(/^\s*\$\$(.+?)\$\$\s*$/);
    if (m) {
      const snippet = line.trim().slice(0, 80);
      findings.push({
        severity: 'MEDIUM',
        rule: '11-2',
        line: i + 1,
        endLine: i + 1,
        message: `単行 $$...$$ は remark-math v6 で inline 扱いになる。開始/終了を別行に配置して display math にする（content-authoring.md §数式・図表 参照）: ${snippet}`,
      });
    }
  }
}

/**
 * content[openIdx] が '{' の前提で、対応する '}' までを抽出。
 * 戻り値: { inner: '{' と '}' の間, endIdx: '}' のインデックス } or null
 */
function extractBraced(content, openIdx) {
  if (content[openIdx] !== '{') return null;
  let depth = 1;
  let i = openIdx + 1;
  while (i < content.length && depth > 0) {
    const ch = content[i];
    const prev = content[i - 1];
    if (prev !== '\\') {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    i++;
    if (depth === 0) {
      return { inner: content.slice(openIdx + 1, i - 1), endIdx: i - 1 };
    }
  }
  return null;
}

// ── 9-11: ExamPoint items の句読点分割バグ検出 ──────────────────────────────
/**
 * 9-11 HIGH: <ExamPoint items={[...]}> の各文字列に句読点（、。，．）を含む。
 *
 * .claude/scripts/migrate-civil-answer-style.mjs の generateExamPoint() バグで生成された
 * 機械分割断片を検出する。末尾の句読点は許容（句点で終わる完結文は OK）、内部の句読点のみ検出。
 *
 * 過去問 MDX も対象（むしろ過去問が主対象）。
 */
function lintExamPointItemsPunctuation(lines, filePath, findings) {
  for (let i = 0; i < lines.length; i++) {
    if (!/<ExamPoint(\s|$|\/)/.test(lines[i])) continue;
    let endIdx = i;
    while (endIdx < lines.length) {
      if (/\/>\s*$/.test(lines[endIdx]) || /<\/ExamPoint>/.test(lines[endIdx])) break;
      endIdx++;
    }
    const block = lines.slice(i, endIdx + 1).join('\n');
    const itemsMatch = block.match(/items=\{\[([\s\S]*?)\]\}/);
    if (!itemsMatch) {
      i = endIdx;
      continue;
    }
    const itemsBody = itemsMatch[1];
    const strings = [...itemsBody.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
    for (const s of strings) {
      const inner = s.replace(/[、。，．]$/, '');
      // 体言止めの stylistic な「、」1個は許容。
      // 「。．」（句点）が含まれる or 「、，」が 2 個以上ある場合のみ違反扱い。
      // civil の機械分割バグは無数の「、。」を含むので確実に検出される。
      const periodCount = (inner.match(/[。．]/g) || []).length;
      const commaCount = (inner.match(/[、，]/g) || []).length;
      const isViolation = periodCount > 0 || commaCount >= 2;
      if (isViolation) {
        findings.push({
          severity: 'HIGH',
          rule: '9-11',
          line: i + 1,
          endLine: endIdx + 1,
          message: `<ExamPoint items> に句読点を含む文字列「${trimPreview(s, 30)}」。機械分割バグの典型、体言止め独立ポイントに修正（§5）`,
        });
        break;
      }
    }
    i = endIdx;
  }
}

// ── 9-12: civil secondary 解答欠落検出 ──────────────────────────────────────
/**
 * 9-12 HIGH: civil-construction-1/secondary-r0X で `## 問題` 数 > `<details>` 数。
 *
 * AdSense thin content の典型。secondary-r03〜r07 の 5 本が対象。
 */
function lintSecondaryAnswerCompleteness(lines, filePath, findings) {
  if (!/civil-construction-1[\\/]secondary-r0\d[\\/]/.test(filePath)) return;
  const problemCount = lines.filter((l) => /^##\s+問題\s/.test(l)).length;
  const detailsCount = lines.filter((l) => /<details>/.test(l)).length;
  if (problemCount > detailsCount) {
    findings.push({
      severity: 'HIGH',
      rule: '9-12',
      line: 1,
      endLine: lines.length,
      message: `secondary 過去問の解答ブロック欠落: ## 問題 ${problemCount} 個に対し <details> ${detailsCount} 個（${problemCount - detailsCount} 個未補完、civil-secondary-exam-writer で補完）`,
    });
  }
}

// ── 9-13: civil 過去問 MDX の内部リンク欠落検出 ─────────────────────────────
/**
 * 9-13 MEDIUM: civil-construction-1/(primary|secondary)-* に textbook/guide への内部リンクが無い。
 *
 * P1 完了の指標。AdSense の内部リンク密度評価に影響する。
 */
function lintExamMissingInternalLinks(lines, filePath, findings) {
  if (!/civil-construction-1[\\/](?:primary|secondary)-/.test(filePath)) return;
  const raw = lines.join('\n');
  const hasTextbookLink = /\/docs\/civil-construction-1-textbook-/.test(raw);
  const hasGuideLink = /\/docs\/civil-construction-1-guide-/.test(raw);
  if (!hasTextbookLink && !hasGuideLink) {
    findings.push({
      severity: 'MEDIUM',
      rule: '9-13',
      line: 1,
      endLine: lines.length,
      message: '過去問 MDX に textbook/guide への内部リンクが無い（P1 で build-civil-exam-textbook-index 後に解消、AdSense 内部リンク密度の指標）',
    });
  }
}

// ── カテゴリ12: ガイド記事構造（group: guide 専用） ─────────────────────────
/**
 * 12-1 MEDIUM: group: guide で `## 総合技術監理における位置づけ` を検出
 * 12-2 MEDIUM: group: guide で `## 参考資料` または `## 参考文献` を検出
 * 12-3 LOW:    group: guide で末尾 H2 が「次のステップ」「関連リソース」「○○の選択肢」以外
 *
 * 真実源: content-principles.md §20「ガイド記事の末尾構成」
 * 対象: pe-comprehensive-management 配下の group: guide 記事のみ
 */
function lintGuideArticleStructure(lines, raw, filePath, findings) {
  if (!isPeComprehensiveManagement(filePath)) return;

  // frontmatter から group を抽出
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return;
  const fmGroup = fmMatch[1].match(/^group:\s*([^\s#]+)/m);
  if (!fmGroup || fmGroup[1].trim() !== 'guide') return;

  // 12-1: ## 総合技術監理における位置づけ
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+総合技術監理における位置づけ/.test(lines[i])) {
      findings.push({
        severity: 'MEDIUM',
        rule: '12-1',
        line: i + 1,
        endLine: i + 1,
        message: 'ガイド記事に「## 総合技術監理における位置づけ」を使用しない（キーワードページ専用、content-principles.md §20）。試験文脈は本文の散文に統合する',
      });
    }
  }

  // 12-2: ## 参考資料 / ## 参考文献
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(参考資料|参考文献)\s*$/);
    if (m) {
      findings.push({
        severity: 'MEDIUM',
        rule: '12-2',
        line: i + 1,
        endLine: i + 1,
        message: `ガイド記事に「## ${m[1]}」を末尾に置かない（キーワードページ専用、content-principles.md §20）。外部離脱を最小化するため公式リソースは本文中インラインリンクで言及する`,
      });
    }
  }

  // 12-3: 末尾 H2 が承認パターン外
  // 承認パターン: 次のステップ / 関連リソース / ○○の選択肢 / note で深掘り
  const h2Lines = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) h2Lines.push({ idx: i, text: lines[i] });
  }
  if (h2Lines.length > 0) {
    const last = h2Lines[h2Lines.length - 1];
    const approved = /^##\s+(次のステップ|関連リソース|関連リンク|.+の選択肢|note で深掘り)/;
    const isViolation12_2 = /^##\s+(参考資料|参考文献)\s*$/.test(last.text);
    if (!approved.test(last.text) && !isViolation12_2) {
      findings.push({
        severity: 'LOW',
        rule: '12-3',
        line: last.idx + 1,
        endLine: last.idx + 1,
        message: `ガイド記事の末尾 H2「${last.text.replace(/^##\s+/, '').trim()}」が承認パターン外。「次のステップ」「関連リソース」「○○の選択肢」のいずれかに揃える（content-principles.md §20）`,
      });
    }
  }
}

// ── 13: R8 予想問題 spoke の固定 4 ペルソナ統一 ────────────────────────────────
/**
 * 13-1 MEDIUM: spoke で許可された 4 ペルソナ名以外の ### を検出
 * 13-2 MEDIUM: 「## ペルソナ別の取り組み方」配下の ### サブセクション数が 5 個でない
 *              （4 ペルソナ + 業界外救済 = 5 個が正常）
 *
 * 真実源: content-principles.md §21
 * 対象: pe-comprehensive-management 配下の r8-essay-theme-* スラグのみ
 */
function lintR8SpokeFixedPersonas(lines, raw, filePath, findings) {
  if (!isPeComprehensiveManagement(filePath)) return;
  if (!isR8EssayThemeSpoke(filePath)) return;

  // 「## ペルソナ別の取り組み方」セクションの範囲を特定
  let sectionStart = -1;
  let sectionEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+ペルソナ別の取り組み方/.test(lines[i])) {
      sectionStart = i;
      for (let j = i + 1; j < lines.length; j++) {
        if (/^##\s+/.test(lines[j])) {
          sectionEnd = j;
          break;
        }
      }
      break;
    }
  }
  if (sectionStart < 0) {
    findings.push({
      severity: 'MEDIUM',
      rule: '13-2',
      line: 1,
      endLine: 1,
      message:
        'R8 spoke に「## ペルソナ別の取り組み方」セクションが存在しない（content-principles.md §21）',
    });
    return;
  }

  // 範囲内の ### を抽出
  const h3Headings = [];
  for (let i = sectionStart + 1; i < sectionEnd; i++) {
    const m = lines[i].match(/^###\s+(.+?)\s*$/);
    if (m) h3Headings.push({ idx: i, text: m[1].trim() });
  }

  // 13-2: H3 個数チェック（4 ペルソナ + 業界外救済 = 5 個が正常）
  if (h3Headings.length !== 5) {
    findings.push({
      severity: 'MEDIUM',
      rule: '13-2',
      line: sectionStart + 1,
      endLine: sectionEnd,
      message: `R8 spoke「## ペルソナ別の取り組み方」配下の ### サブセクションが ${h3Headings.length} 個（期待値: 5 個 = 4 ペルソナ + 業界外救済）。固定 4 ペルソナ + 業界外救済で構成する（content-principles.md §21）`,
    });
  }

  // 13-1: 各 H3 が許可リストに含まれるか
  for (const h of h3Headings) {
    // カッコ書きサフィックス（「（製造業・エネルギー・IT 等）へのアレンジ」等）を除去
    const baseName = h.text.replace(/[(（].*$/, '').trim();
    const isAllowed = R8_SPOKE_ALLOWED_PERSONAS.some(
      (allowed) => baseName === allowed || baseName.startsWith(allowed),
    );
    if (!isAllowed) {
      findings.push({
        severity: 'MEDIUM',
        rule: '13-1',
        line: h.idx + 1,
        endLine: h.idx + 1,
        message: `R8 spoke で許可外の ### 見出し「${h.text}」を検出。固定 4 ペルソナ（${R8_SPOKE_ALLOWED_PERSONAS.slice(0, 4).join(' / ')}）+ 業界外受験者のみ使用可能（content-principles.md §21）。業界外救済は note M4 マガジンに分業`,
      });
    }
  }
}

// ── 0-2: Docusaurus 旧 frontmatter 検出 ────────────────────────────────────
/**
 * 0-2 HIGH: frontmatter に id/sidebar_label/toc_min_heading_level/toc_max_heading_level が残存。
 *
 * Docusaurus 由来の旧フィールドで doboku-note では未使用。migrate-civil-frontmatter.mjs で一括削除可。
 */
function lintLegacyFrontmatter(raw, findings) {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return;
  const fmLines = fmMatch[1].split(/\r?\n/);
  const legacyFields = ['id', 'sidebar_label', 'toc_min_heading_level', 'toc_max_heading_level'];
  fmLines.forEach((line, idx) => {
    for (const field of legacyFields) {
      if (new RegExp(`^${field}\\s*:`).test(line)) {
        findings.push({
          severity: 'HIGH',
          rule: '0-2',
          line: idx + 2,
          endLine: idx + 2,
          message: `Docusaurus 旧 frontmatter「${field}:」残存。doboku-note では未使用、migrate-civil-frontmatter.mjs で一括削除可`,
        });
      }
    }
  });
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
  lintNoteLink(lines, findings);
  lintHeadingStructure(lines, raw, findings);
  lintBoldScope(lines, findings);
  lintBoldDelimiterBoundary(lines, findings);
  lintComponentPrinciples(lines, filePath, findings);
  lintRelatedKeywordsComponent(lines, findings);
  lintImages(lines, findings);
  lintMathFractions(lines, findings);
  lintMathSingleLineDisplay(lines, findings);

  // 新規ルール（civil AdSense 改修向け）
  lintExamPointItemsPunctuation(lines, filePath, findings);
  lintSecondaryAnswerCompleteness(lines, filePath, findings);
  lintExamMissingInternalLinks(lines, filePath, findings);
  lintLegacyFrontmatter(raw, findings);

  // カテゴリ12: PE ガイド記事の構造（group: guide 専用）
  lintGuideArticleStructure(lines, raw, filePath, findings);

  // カテゴリ13: R8 予想問題 spoke の固定 4 ペルソナ統一（content-principles.md §21）
  lintR8SpokeFixedPersonas(lines, raw, filePath, findings);

  // 行番号を frontmatter 分シフト（ただし 0-1, 0-2 はファイル全体 or frontmatter の問題なので対象外）
  for (const f of findings) {
    if (f.rule === '0-1' || f.rule === '0-2') continue;
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
