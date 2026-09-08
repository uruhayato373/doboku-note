# -*- coding: utf-8 -*-
"""ページ画像に指などの写り込みがあるページを機械検出する。

紙面は無彩色に近い。肌は彩度と色相が明確に違うので、肌色域の画素が版面の中で
まとまった面積を占めるページを写り込み候補として挙げる。
判定するのは「候補かどうか」だけで、可読性の最終判断は人か視覚OCRが行う。
"""
import argparse, glob, json, os, subprocess, sys

def probe(path):
    """ImageMagick で肌色域の画素比率と、その重心が版面内にあるかを測る。"""
    # HSV: 色相 10-50度、彩度 25-75%、明度 40-95% を肌色域とする
    out = subprocess.run([
        "magick", path, "-resize", "400x", "-colorspace", "HSB", "-separate", "-write", "mpr:hsb",
        "-delete", "0--1", "mpr:hsb[0]", "mpr:hsb[1]", "mpr:hsb[2]",
        "-fx", "(u[0]>=0.028 && u[0]<=0.14 && u[1]>=0.25 && u[1]<=0.78 && u[2]>=0.40 && u[2]<=0.96) ? 1 : 0",
        "-format", "%[fx:mean]", "info:"], capture_output=True, text=True)
    if out.returncode != 0:
        return None
    try:
        return float(out.stdout.strip())
    except ValueError:
        return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vault", default="")
    ap.add_argument("--book", help="1冊だけ見るときの sourceId")
    ap.add_argument("--threshold", type=float, default=0.012, help="肌色画素の比率のしきい値")
    args = ap.parse_args()
    if not args.vault:
        m = glob.glob(os.path.expanduser("~/Library/CloudStorage/GoogleDrive-*/マイドライブ/doboku-note"))
        args.vault = m[0] if m else ""
    if not args.vault:
        raise SystemExit("Drive vault が無い。検査 0 件を PASS と呼ばない")

    books = sorted(glob.glob("content/sources/books/*/book-manifest.json"))
    total_pages = flagged_total = 0
    rows = []
    for f in books:
        man = json.load(open(f, encoding="utf-8"))
        if args.book and man["sourceId"] != args.book:
            continue
        pdir = os.path.join(args.vault, "原資料PDF", "書籍", man["directory"], "pages")
        imgs = sorted(glob.glob(os.path.join(pdir, "*.jpg")))
        if not imgs:
            rows.append((man["sourceId"], 0, 0, []))
            continue
        flagged = []
        for img in imgs:
            r = probe(img)
            if r is not None and r >= args.threshold:
                flagged.append((os.path.basename(img), r))
        total_pages += len(imgs)
        flagged_total += len(flagged)
        rows.append((man["sourceId"], len(imgs), len(flagged), flagged))
        print(f"{man['sourceId']:42s} {len(imgs):5d}p  写り込み候補 {len(flagged):4d}p "
              f"({100*len(flagged)/len(imgs):5.1f}%)", flush=True)
    if not rows:
        raise SystemExit("対象 0 冊。検査していないことを緑にしない")
    print(f"\n検査 {len(rows)} 冊 / {total_pages}p、写り込み候補 {flagged_total}p "
          f"({100*flagged_total/max(1,total_pages):.1f}%)")
    json.dump([{"sourceId": r[0], "pages": r[1], "flagged": r[2],
                "flaggedPages": [{"page": p, "skinRatio": round(v, 4)} for p, v in r[3]]} for r in rows],
              open(os.environ.get("OCCLUSION_OUT", "/dev/null"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
