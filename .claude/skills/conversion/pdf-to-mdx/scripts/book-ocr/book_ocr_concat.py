# -*- coding: utf-8 -*-
"""book_ocr_machine.py が書いたバッチ md を part 単位（既定 8 バッチ＝48 ページ）に連結し、ゲートを通して
content/sources/books/<dir>/ocr/part-NN.md と README.md（索引・git 追跡）を書く。
最後に record-reference-book-artifacts の登録コマンドを register.sh へ出す（実行は人）。

method は machine.json から取る（引数で書き換えない）。Claude がページ画像から書き写した本文を
連結する経路は 2026-10-24 に廃止した。machine.json が無い・品質ゲート fail のときは連結しない。
補完（jobs.supplement.json）は part を machine-part-NN.md の名前で書き、README.md は既存の本文を残して
<!-- machine-ocr:start --> 〜 <!-- machine-ocr:end --> の節だけを書き換える。

ゲート（1 つでも落ちれば exit 1）:
  - 全ページの <!-- pNNNN --> が期待順に 1 回ずつ現れる
  - U+FFFD が 0
  - バッチ出力が 1 つも欠けていない
「（文字なし）」のページは数えて README に出す（隠さない）。
"""
import argparse, json, os, re, sys

MARK = re.compile(r"<!--\s*(p\d{4})(?:\s+印字:[^>]*?)?\s*-->")
EMPTY = "（文字なし）"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True)
    ap.add_argument("--part-batches", type=int, default=8)
    ap.add_argument("--jobs", help="既定 .tmp/ocr/<book>/jobs.json。試し読みは jobs.trial.json")
    ap.add_argument("--accept-quality", metavar="理由", help="machine.json の品質ゲート fail を人が確かめて通すときの理由")
    a = ap.parse_args()
    jobs = json.load(open(a.jobs or f".tmp/ocr/{a.book}/jobs.json", encoding="utf-8"))
    machine_path = os.path.join(jobs["workDir"], "machine.json")
    if not os.path.exists(machine_path):
        sys.exit(f"✗ {machine_path} が無い。先に book_ocr_machine.py --book {a.book}")
    machine = json.load(open(machine_path, encoding="utf-8"))
    if machine["pageIds"] != jobs["pageIds"]:
        sys.exit("✗ machine.json のページと jobs のページが違う。book_ocr_machine.py を回し直す")
    if machine["qualityGate"] != "pass" and not a.accept_quality:
        sys.exit(f"✗ 品質ゲート不合格（{'・'.join(machine['qualityReasons'])}）。確かめたら --accept-quality \"理由\"")
    a.method = machine["method"]
    dest = jobs["transcriptDir"]
    os.makedirs(dest, exist_ok=True)
    batches = jobs["batches"]
    prefix = jobs.get("partPrefix", "part")
    section_mode = jobs.get("readmeMode") == "section"
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
                f"# {jobs['title']} — {prefix} {n:02d}（{expected[0]}〜{expected[-1]}）", ""]
        text = "\n".join(head) + body.strip() + "\n"
        path = os.path.join(dest, f"{prefix}-{n:02d}.md")
        parts.append((path, expected))
        open(path, "w", encoding="utf-8", newline="\n").write(text)
        rows.append((f"{prefix}-{n:02d}.md", expected[0], expected[-1], len(text), text.count(EMPTY)))
    if not parts:
        sys.exit("✗ part 0 件")
    total_chars = sum(r[3] for r in rows)
    total_empty = sum(r[4] for r in rows)
    readme = [f"# {jobs['title']} — 文字起こし索引", "",
              "> [!warning] 内部リファレンス専用（公開禁止）",
              "> 市販書籍の機械 OCR。内部参照であり、サイト・note へ転載しない。記事には自分の言葉で書く。", "",
              f"- 方法: `{a.method}`（エンジン選択の理由: {machine.get('reason') or '指定'}）",
              f"- 全 {len(jobs['pageIds'])} ページ（画像 id `{jobs['pageIds'][0]}`〜`{jobs['pageIds'][-1]}`）を "
              f"obsidian vault の `ocr_pdf.py` で読んだ。本文ページの字数中央値 {machine['quality']['chars_median']}"
              + (f"・信頼度平均 {machine['quality']['confidence_mean']}" if "confidence_mean" in machine["quality"] else "")
              + f"・ほぼ空のページ {len(machine['quality']['low_pages'])}",
              *( [f"- 品質ゲート不合格を人が確かめて通した: {a.accept_quality}"] if machine["qualityGate"] != "pass" else []), "",
              "| ファイル | 画像 id | 字数 | 文字なし |", "|---|---|---|---|"]
    for r in rows:
        readme.append(f"| {r[0]} | {r[1]}〜{r[2]} | {r[3]:,} | {r[4]} |")
    readme += [f"| **計 {len(rows)} part** | | **{total_chars:,}** | **{total_empty}** |", "",
               "## 既知の限界", "",
               "- 機械 OCR なので誤認識を含む。数値・規格値・条番号は原本画像で照合する（照合で見るのは数行まで。本文を書き写さない）",
               "- `<!-- pNNNN -->` は書籍ページ画像の id で、印字ノンブルではない（分かる場合は `印字:` を併記）",
               "- 「（文字なし）」は OCR が文字を返さなかったページ（白紙・図版・読めなかったページ）"]
    readme_path = os.path.join(dest, "README.md")
    if section_mode:
        # 補完: 既存の索引（旧経路の章ファイルの説明）を残し、機械 OCR の節だけを差し替える
        start, end = "<!-- machine-ocr:start -->", "<!-- machine-ocr:end -->"
        old = open(readme_path, encoding="utf-8").read() if os.path.exists(readme_path) else f"# {jobs['title']} — 文字起こし索引\n"
        section = "\n".join([start, "", "## 機械 OCR で補ったページ", ""] + readme[2:] + ["", end])
        if start in old and end in old:
            text = old[:old.index(start)] + section + old[old.index(end) + len(end):]
        else:
            text = old.rstrip("\n") + "\n\n" + section + "\n"
        open(readme_path, "w", encoding="utf-8", newline="\n").write(text)
    else:
        open(readme_path, "w", encoding="utf-8", newline="\n").write("\n".join(readme) + "\n")
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
        print(f"  {r[0]}  {r[1]}〜{r[2]}  {r[3]:,}字  文字なし{r[4]}")
    print(f"[concat] {a.book}: {len(rows)} part / {total_chars:,} 字 / 文字なし {total_empty}p → {dest}")
    if errors:
        print("✗ ゲート不合格:")
        for e in errors:
            print("   " + e)
        sys.exit(1)
    print(f"[concat] ✓ ゲート合格。登録: sh {jobs['workDir']}/register.sh --commit")


if __name__ == "__main__":
    main()
