# -*- coding: utf-8 -*-
"""参考文献 bundle の原本PDFに使えるテキスト層があるかを判定する。

視覚OCRに何百エージェントも投じる前に必ず先に回す。book-manifest の
renderProfile.mode（born-digital など）は「ページ画像の作り方」であって
テキスト層の有無ではないので、判定の根拠に使わない。

  CLEAN_TEXT      テキスト層をそのまま使える。視覚OCRは不要
  DIRTY_OCR_LAYER テキスト層はあるが既存OCRの品質が低い（字送り・誤字）。視覚OCRが要る
  NO_TEXT_LAYER   テキスト層なし。視覚OCRが要る

使い方: python3 classify_text_layer.py [--vault <Drive vault のパス>]
"""
import argparse, collections, glob, json, os, re, subprocess

CJK = re.compile(r"[぀-ヿ一-鿿]")
GAP = re.compile(r"[぀-ヿ一-鿿][ 　]+[぀-ヿ一-鿿]")


def sample_text(pdf, pages=6):
    try:
        info = subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout
        n = int(info.split("Pages:")[1].split()[0])
    except Exception:
        return "", 0
    lo = max(1, n // 3)                       # 前付けを避けて本文の中ほどを見る
    txt = subprocess.run(["pdftotext", "-f", str(lo), "-l", str(lo + pages - 1), pdf, "-"],
                         capture_output=True, text=True).stdout
    return txt, n


def classify(txt, sampled_pages):
    cjk = len(CJK.findall(txt))
    lines = [l.strip() for l in txt.splitlines() if l.strip()]
    per_page = cjk / max(1, sampled_pages)
    gap = len(GAP.findall(txt)) / cjk if cjk else 0.0
    short = sum(1 for l in lines if len(l) <= 2) / len(lines) if lines else 0.0
    if per_page < 30:
        return "NO_TEXT_LAYER", per_page, gap, short
    # 全角の間の空白＝座標から起こした層、極端に短い行の多さ＝縦組みや1字ずつの分解
    if gap > 0.03 or short > 0.25:
        return "DIRTY_OCR_LAYER", per_page, gap, short
    return "CLEAN_TEXT", per_page, gap, short


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vault", default=os.environ.get("DOBOKU_DRIVE_VAULT", ""))
    ap.add_argument("--books-root", default="content/sources/books")
    args = ap.parse_args()
    if not args.vault:
        matches = glob.glob(os.path.expanduser("~/Library/CloudStorage/GoogleDrive-*/マイドライブ/doboku-note"))
        args.vault = matches[0] if matches else ""
    if not args.vault or not os.path.isdir(args.vault):
        raise SystemExit("Drive vault が見つからない。--vault で指定する（実体検査 0 件を緑にしない）")

    rows = []
    for f in sorted(glob.glob(os.path.join(args.books_root, "*", "book-manifest.json"))):
        m = json.load(open(f, encoding="utf-8"))
        src = os.path.join(args.vault, "原資料PDF", "書籍", m["directory"], "source")
        pdfs = sorted(glob.glob(os.path.join(src, "*.pdf")))
        if not pdfs:
            rows.append((m["sourceId"], m["pageCount"], "NO_SOURCE", 0, 0, 0, len(m.get("ocrArtifacts", []))))
            continue
        txt, sampled = "", 0
        for pdf in pdfs[:3]:
            t, _ = sample_text(pdf)
            txt += t
            sampled += 6
        cls, per_page, gap, short = classify(txt, sampled)
        rows.append((m["sourceId"], m["pageCount"], cls, per_page, gap, short, len(m.get("ocrArtifacts", []))))

    if not rows:
        raise SystemExit("book-manifest が 1 件も無い。検査 0 件を PASS と呼ばない")
    print(f"{'sourceId':42s} {'pages':>5s} {'class':16s} {'CJK/p':>6s} {'gap':>6s} {'short':>6s} {'ocr':>4s}")
    for r in sorted(rows, key=lambda x: (x[2], -x[1])):
        print(f"{r[0]:42s} {r[1]:5d} {r[2]:16s} {r[3]:6.0f} {r[4]:6.3f} {r[5]:6.2f} {r[6]:4d}")
    tally = collections.Counter(r[2] for r in rows)
    print("\n" + " / ".join(f"{k} {v}冊 {sum(x[1] for x in rows if x[2]==k)}p" for k, v in sorted(tally.items())))
    print(f"検査 {len(rows)} 冊（vault: {args.vault}）")


if __name__ == "__main__":
    main()
