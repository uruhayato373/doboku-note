# -*- coding: utf-8 -*-
"""校正済みバッチ md を part 単位（既定 8 バッチ＝48 ページ）に連結し、ゲートを通して
content/sources/books/<dir>/ocr/part-NN.md と README.md（索引・git 追跡）を書く。
最後に record-reference-book-artifacts の登録コマンドを register.sh へ出す（実行は人）。

ゲート（1 つでも落ちれば exit 1）:
  - 全ページの <!-- pNNNN --> が期待順に 1 回ずつ現れる
  - U+FFFD が 0
  - バッチ出力が 1 つも欠けていない
〔判読不能〕〔欠落〕は数えて README に出す（隠さない）。
"""
import argparse, json, os, re, sys

MARK = re.compile(r"<!--\s*(p\d{4})(?:\s+印字:[^>]*?)?\s*-->")
UNREAD = re.compile(r"〔(判読不能|欠落)[^〕]*〕")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True)
    ap.add_argument("--part-batches", type=int, default=8)
    ap.add_argument("--method", default="visual-ocr(sonnet,6p/batch)+tesseract-crosscheck+targeted-proofread")
    a = ap.parse_args()
    jobs = json.load(open(f".tmp/ocr/{a.book}/jobs.json", encoding="utf-8"))
    dest = jobs["transcriptDir"]
    os.makedirs(dest, exist_ok=True)
    batches = jobs["batches"]
    missing = [b["bi"] for b in batches if not os.path.exists(b["outFile"])]
    if missing:
        sys.exit(f"✗ バッチ出力が欠けている: {missing}")
    parts, errors, rows = [], [], []
    for i in range(0, len(batches), a.part_batches):
        chunk = batches[i:i + a.part_batches]
        expected = [pid for b in chunk for pid in b["ids"]]
        body = "\n\n".join(open(b["outFile"], encoding="utf-8").read().strip() for b in chunk)
        body = re.sub(r"\n{3,}", "\n\n", body)
        found = MARK.findall(body)
        n = len(parts) + 1
        if found != expected:
            errors.append(f"part-{n:02d}: マーカー不一致 期待{len(expected)} 実際{len(found)}"
                          + (f" 欠落{sorted(set(expected)-set(found))[:5]}" if set(expected) - set(found) else "")
                          + (f" 重複/余分{[x for x in found if found.count(x)>1 or x not in expected][:5]}" if len(found) != len(set(found)) or set(found) - set(expected) else ""))
        if "�" in body:
            errors.append(f"part-{n:02d}: U+FFFD {body.count(chr(0xfffd))} 件")
        head = ["---", f'source: "{a.book}"', f'method: "{a.method}"',
                f'pages: "{expected[0]}-{expected[-1]}"', "---", "",
                f"# {jobs['title']} — part {n:02d}（{expected[0]}〜{expected[-1]}）", ""]
        text = "\n".join(head) + body.strip() + "\n"
        path = os.path.join(dest, f"part-{n:02d}.md")
        parts.append((path, expected))
        open(path, "w", encoding="utf-8", newline="\n").write(text)
        rows.append((f"part-{n:02d}.md", expected[0], expected[-1], len(text), len(UNREAD.findall(text)),
                     text.count("（図:")))
    if not parts:
        sys.exit("✗ part 0 件")
    total_chars = sum(r[3] for r in rows)
    total_unread = sum(r[4] for r in rows)
    readme = [f"# {jobs['title']} — 文字起こし索引", "",
              "> [!warning] 内部リファレンス専用（公開禁止）",
              "> 市販書籍の視覚OCR。逐語の内部参照であり、サイト・note へ転載しない。", "",
              f"- 方法: `{a.method}`",
              f"- 全 {len(jobs['pageIds'])} ページ（画像 id `{jobs['pageIds'][0]}`〜`{jobs['pageIds'][-1]}`）を "
              f"{len(batches)} バッチで読み、Tesseract 第二読との不一致ページだけ画像で再照合した",
              f"- 〔判読不能〕〔欠落〕 合計 **{total_unread}** 箇所（隠していない。原本画像で要確認）", "",
              "| ファイル | 画像 id | 字数 | 判読不能 | 図プレースホルダ |", "|---|---|---|---|---|"]
    for r in rows:
        readme.append(f"| {r[0]} | {r[1]}〜{r[2]} | {r[3]:,} | {r[4]} | {r[5]} |")
    readme += [f"| **計 {len(rows)} part** | | **{total_chars:,}** | **{total_unread}** | |", "",
               "## 既知の限界", "",
               "- LLM の視覚OCRなので字句は近似。数値・規格値・条番号の引用は必ず原本画像で照合する",
               "- `<!-- pNNNN -->` は書籍ページ画像の id で、印字ノンブルではない（分かる場合は `印字:` を併記）",
               "- 〔判読不能〕は画像から読めなかった箇所。前後から推測して埋めていない"]
    open(os.path.join(dest, "README.md"), "w", encoding="utf-8", newline="\n").write("\n".join(readme) + "\n")
    reg = ["#!/bin/sh", "set -e", f"# {a.book}: part を Drive と台帳へ登録（既定 dry-run。--commit で実行）"]
    for path, expected in parts:
        rel = os.path.relpath(path, os.getcwd())
        reg.append(f"node scripts/record-reference-book-artifacts.mjs --source-id {a.book} "
                   f"--ocr-path '{rel}' --ocr-pages {','.join(expected)} --ocr-method '{a.method}' \"$@\"")
    # 登録が済んだら原寸画像の複製（1 冊 1〜2GB）は用済み。set -e で node 行の成功後にだけ届く。
    # dry-run では消さない（目視の抜き取りは登録前に行うため）。
    reg.append(f"case \" $* \" in *\" --commit \"*) rm -rf '{jobs['srcDir']}' && "
               f"echo '[register] 原寸画像を削除: {jobs['srcDir']}';; esac")
    open(os.path.join(jobs["workDir"], "register.sh"), "w", encoding="utf-8").write("\n".join(reg) + "\n")
    for r in rows:
        print(f"  {r[0]}  {r[1]}〜{r[2]}  {r[3]:,}字  判読不能{r[4]}  図{r[5]}")
    print(f"[concat] {a.book}: {len(rows)} part / {total_chars:,} 字 / 判読不能 {total_unread} → {dest}")
    if errors:
        print("✗ ゲート不合格:")
        for e in errors:
            print("   " + e)
        sys.exit(1)
    print(f"[concat] ✓ ゲート合格。登録: sh {jobs['workDir']}/register.sh --commit")


if __name__ == "__main__":
    main()
