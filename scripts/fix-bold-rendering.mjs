#!/usr/bin/env node
/**
 * check-bold-rendering.mjs が検出した「描画されない太字」のうち、
 * 機械的に安全に直せる形だけを修正する。
 *
 * 安全側に振っており、1行に太字スパンがちょうど1つ（** が2個）の行だけを直す。
 * 入れ子・隣接太字のある行はペアリングが一意に決まらず、機械的に動かすと
 * 強調範囲が変わってしまうため触らない（2026-08-04 に実測で確認）。
 *
 * 直す形（閉じ ** の直前が約物・直後が文字 ＝ right-flanking 不成立）:
 *   (1) 末尾が丸括弧グループで、その前に本文がある（補足なので外に出しても意味が変わらない）
 *       **指数関数的（1ラウンドトリップで約2倍）**に → **指数関数的**（1ラウンドトリップで約2倍）に
 *   (2) 末尾が括弧以外の約物（。，など）
 *       **……ません。**正答番号は → **……ません**。正答番号は
 *
 * 直さない形（編集判断が要るので人へ回す）:
 *   - 鉤括弧「」『』で終わる（強調の主眼がその引用句側にあることが多く、
 *     外に出すと強調が別物になる）
 *   - 単位・記号（% ℃ 等）で終わる（**60%** → **60**% は数値と単位が分断される）
 *   - 太字の中身が括弧グループそのもの（外に出すと太字が空になる）
 *   - **[** のような壊れたリンク・** の個数が奇数・入れ子の崩れ
 *
 * 使い方:
 *   node scripts/fix-bold-rendering.mjs            # dry-run（既定）
 *   node scripts/fix-bold-rendering.mjs --commit   # 実際に書き換える
 */

import { readFileSync } from "node:fs";
import { writeMdxFile } from "../.claude/scripts/lib/mdx-io.mjs";

const COMMIT = process.argv.includes("--commit");

// 外へ出してよい括弧＝補足を表す丸括弧のみ。鉤括弧は強調の主眼になりやすいので対象外。
const PAIRS = { "）": "（", ")": "(" };
// 閉じ括弧全般。PAIRS に無いもの（鉤括弧等）は単独で外へ出すと開き括弧が
// 取り残されて対応が壊れるため、punctuation ラン扱いにせず必ず skip する。
const ANY_CLOSER = /[）」』】〕》〉｝\)\]\}]/u;
// 数値と分かちがたい単位・記号は外に出すと読みが壊れるので対象外
const UNIT_LIKE = /[%％℃°‰]/u;
// 括弧は開き・閉じとも約物ランの走査を止める。ランに巻き込むと
// 「…「義務」（[**」のように対応の途中で太字が切れる（2026-08-04 実測）。
const ANY_BRACKET = /[（）「」『』【】〔〕《》〈〉｛｝()[\]{}]/u;
const isWord = (c) => /[\p{L}\p{N}]/u.test(c);
const isPunct = (c) => /[\p{P}\p{S}]/u.test(c);

/** 1行を修正して {line, fixed, skipped} を返す */
function fixLine(line) {
  let fixed = 0;
  let skipped = 0;
  let guard = 0;

  // 修正するたびに位置がずれるので、直すたびに先頭から取り直す
  for (;;) {
    if (guard++ > 50) break;
    const stars = [];
    for (let i = 0; i + 1 < line.length; i++) {
      if (line[i] === "*" && line[i + 1] === "*") {
        stars.push(i);
        i++;
      }
    }
    // 太字スパンがちょうど1つの行だけを対象にする。0個なら何もない、
    // 3個以上（奇数含む）は入れ子・隣接でペアリングが一意に決まらない。
    if (stars.length !== 2) {
      if (stars.length > 0) skipped++;
      break;
    }

    let applied = false;
    for (let p = 0; p + 1 < stars.length; p += 2) {
      const open = stars[p];
      const close = stars[p + 1];
      const before = line[close - 1];
      const after = line[close + 2];
      if (!before || after === undefined) continue;
      if (!isPunct(before) || !isWord(after)) continue;

      const content = line.slice(open + 2, close);
      if (content.length === 0) {
        skipped++;
        continue;
      }

      if (UNIT_LIKE.test(before)) {
        skipped++;
        continue; // **60%** → **60**% は数値と単位が切れるので人へ回す
      }

      // (3) 壊れたリンク: **……は[**表題](url) — 開き [ が ** の内側へ紛れ込んだ形。
      //     [ を外へ出すとリンクが正しく閉じ、太字も成立する。
      if (before === "[" && /^[^\]]*\]\(/.test(line.slice(close + 2))) {
        const content3 = line.slice(open + 2, close);
        // 末尾の「閉じ括弧でない約物」ラン（例: 「（[」）をまとめて外へ出す。
        // 閉じ括弧で止めるので「…「義務」」の対応は壊さない。
        let k = content3.length;
        while (
          k > 0 &&
          isPunct(content3[k - 1]) &&
          !ANY_CLOSER.test(content3[k - 1])
        ) {
          k--;
        }
        if (k > 0 && k < content3.length) {
          line =
            line.slice(0, open) +
            `**${content3.slice(0, k)}**${content3.slice(k)}` +
            line.slice(close + 2);
          fixed++;
          applied = true;
          break;
        }
      }

      if (ANY_CLOSER.test(before) && !PAIRS[before]) {
        skipped++;
        continue; // 鉤括弧等。単独で出すと対応が壊れるので人へ回す
      }

      const opener = PAIRS[before];
      let cut; // content のうち ** の外へ出す部分の開始位置
      if (opener) {
        // (1) 末尾が閉じ括弧 → 対応する開き括弧までを丸ごと外へ出す
        const at = content.lastIndexOf(opener);
        if (at <= 0) {
          // 対応する開きが無い / 中身が括弧グループそのもの → 人へ回す
          skipped++;
          continue;
        }
        cut = at;
      } else {
        // (2) 末尾の約物ラン（括弧以外）を外へ出す
        let k = content.length;
        while (k > 0 && isPunct(content[k - 1]) && !ANY_BRACKET.test(content[k - 1])) k--;
        if (k === 0) {
          skipped++;
          continue;
        }
        cut = k;
      }

      const keep = content.slice(0, cut);
      const move = content.slice(cut);
      if (move.length === 0 || keep.length === 0) {
        // 外へ出せるものが無い（直前が開き括弧など）。空回りを防ぐため人へ回す
        skipped++;
        continue;
      }
      line =
        line.slice(0, open) + `**${keep}**${move}` + line.slice(close + 2);
      fixed++;
      applied = true;
      break; // 位置がずれたので取り直す
    }
    if (!applied) break;
  }
  return { line, fixed, skipped };
}

// check 側と同じ対象・同じ検出結果を使う
const { execFileSync } = await import("node:child_process");
// checker は検出ありで exit 1 を返す仕様なので、異常終了そのものは失敗扱いにしない
let raw;
try {
  raw = execFileSync(
    process.execPath,
    ["scripts/check-bold-rendering.mjs", "--json"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
} catch (e) {
  raw = e.stdout;
  if (!raw) {
    console.error("[fix-bold-rendering] checker の出力を取得できず中止");
    process.exit(1);
  }
}
const { scanned, findings } = JSON.parse(raw);

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, new Set());
  byFile.get(f.file).add(f.line);
}

let totalFixed = 0;
let totalSkipped = 0;
const touched = [];

for (const [file, lineSet] of byFile) {
  const original = readFileSync(file, "utf8");
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = original.split(/\r?\n/);
  let fileFixed = 0;
  let fileSkipped = 0;

  for (const ln of lineSet) {
    const idx = ln - 1;
    if (idx < 0 || idx >= lines.length) continue;
    const r = fixLine(lines[idx]);
    if (r.fixed) {
      lines[idx] = r.line;
      fileFixed += r.fixed;
    }
    fileSkipped += r.skipped;
  }

  totalFixed += fileFixed;
  totalSkipped += fileSkipped;
  if (fileFixed) {
    touched.push(`${file}  (+${fileFixed})`);
    if (COMMIT) writeMdxFile(file, lines.join(eol), eol);
  }
}

console.log(
  `[fix-bold-rendering] 検出 ${findings.length} 件 / 修正 ${totalFixed} 件 / 要手当て ${totalSkipped} 件（${scanned} 記事を走査）`,
);
for (const t of touched) console.log(`  ${t}`);
if (!COMMIT) {
  console.log("");
  console.log("  ※ dry-run です。書き換えるには --commit を付けてください。");
}
