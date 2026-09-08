# -*- coding: utf-8 -*-
"""ページ画像に指などの写り込みがあるページを機械検出する。

紙面はほぼ無彩色なので、肌色域（色相・彩度・明度）の画素がまとまった比率を占める
ページを候補として挙げる。**候補＝本文が隠れている、ではない**（余白の指も拾う）。
最終判断は目視か視覚OCRが行う。

使い方:
  python3 detect_occlusion.py                     # 全冊
  python3 detect_occlusion.py --book <sourceId>   # 1冊
  python3 detect_occlusion.py --jobs 8 --out out.json
"""
import argparse, glob, json, os, subprocess, sys
from concurrent.futures import ProcessPoolExecutor

# 肌色域。色相 10-50度 / 彩度 25-78% / 明度 40-96%
HUE_LO, HUE_HI = 10.0, 50.0
SAT_LO, SAT_HI = 0.25, 0.78
VAL_LO, VAL_HI = 0.40, 0.96
DEFAULT_THRESHOLD = 0.012
SAMPLE_WIDTH = 200


def skin_ratio(path):
    """縮小した RGB を読み、肌色域の画素比率を返す。読めなければ None。"""
    try:
        raw = subprocess.run(
            ["magick", path, "-resize", f"{SAMPLE_WIDTH}x", "-depth", "8", "-colorspace", "sRGB", "rgb:-"],
            capture_output=True, timeout=120).stdout
    except Exception:
        return None
    n = len(raw) // 3
    if n == 0:
        return None
    hit = 0
    for i in range(0, n * 3, 3):
        r, g, b = raw[i], raw[i + 1], raw[i + 2]
        mx = r if r > g else g
        if b > mx:
            mx = b
        mn = r if r < g else g
        if b < mn:
            mn = b
        v = mx / 255.0
        if v < VAL_LO or v > VAL_HI:
            continue
        d = mx - mn
        if d == 0:
            continue
        s = d / mx
        if s < SAT_LO or s > SAT_HI:
            continue
        if mx == r:
            h = 60.0 * ((g - b) / d % 6)
        elif mx == g:
            h = 60.0 * ((b - r) / d + 2)
        else:
            h = 60.0 * ((r - g) / d + 4)
        if HUE_LO <= h <= HUE_HI:
            hit += 1
    return hit / n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vault", default=os.environ.get("DOBOKU_DRIVE_VAULT", ""))
    ap.add_argument("--books-root", default="content/sources/books")
    ap.add_argument("--book")
    ap.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD)
    ap.add_argument("--jobs", type=int, default=8)
    ap.add_argument("--out")
    args = ap.parse_args()
    if not args.vault:
        m = glob.glob(os.path.expanduser("~/Library/CloudStorage/GoogleDrive-*/マイドライブ/doboku-note"))
        args.vault = m[0] if m else ""
    if not args.vault or not os.path.isdir(args.vault):
        raise SystemExit("Drive vault が見つからない。--vault で指定する（検査 0 件を PASS と呼ばない）")

    books, results = [], []
    for f in sorted(glob.glob(os.path.join(args.books_root, "*", "book-manifest.json"))):
        man = json.load(open(f, encoding="utf-8"))
        if args.book and man["sourceId"] != args.book:
            continue
        pdir = os.path.join(args.vault, "原資料PDF", "書籍", man["directory"], "pages")
        books.append((man["sourceId"], sorted(glob.glob(os.path.join(pdir, "*.jpg")))))
    if not books:
        raise SystemExit("対象 0 冊。検査していないことを緑にしない")

    total = flagged_total = unreadable = 0
    with ProcessPoolExecutor(max_workers=args.jobs) as pool:
        for source_id, imgs in books:
            if not imgs:
                print(f"{source_id:42s}   ページ画像なし", flush=True)
                results.append({"sourceId": source_id, "pages": 0, "flagged": 0, "unreadable": 0, "flaggedPages": []})
                continue
            ratios = list(pool.map(skin_ratio, imgs, chunksize=4))
            flagged = [(os.path.basename(p), r) for p, r in zip(imgs, ratios)
                       if r is not None and r >= args.threshold]
            bad = sum(1 for r in ratios if r is None)
            total += len(imgs)
            flagged_total += len(flagged)
            unreadable += bad
            note = f"  読めない画像 {bad}" if bad else ""
            print(f"{source_id:42s} {len(imgs):5d}p  候補 {len(flagged):4d}p "
                  f"({100*len(flagged)/len(imgs):5.1f}%){note}", flush=True)
            results.append({"sourceId": source_id, "pages": len(imgs), "flagged": len(flagged),
                            "unreadable": bad,
                            "flaggedPages": [{"page": p, "skinRatio": round(v, 4)} for p, v in flagged]})

    print(f"\n検査 {len(books)} 冊 / {total}p、写り込み候補 {flagged_total}p "
          f"({100*flagged_total/max(1,total):.1f}%)、読めない画像 {unreadable}p")
    print("候補は目視か視覚OCRで確かめる。候補＝本文が隠れている、ではない。")
    if args.out:
        json.dump(results, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"→ {args.out}")


if __name__ == "__main__":
    main()
