# -*- coding: utf-8 -*-
"""第二読（無料・ローカル）: Tesseract jpn で各ページを読み .tmp/ocr/<sid>/tess/<id>.txt へ。
Sonnet の視覚OCRとは独立に読み、両者の不一致で「見直すページ」を絞るための材料。
Tesseract 自体は誤読が多いので、この出力を本文には使わない。

使い方: python3 book_ocr_tesseract.py --book <sourceId> [--jobs 8] [--width 1400]
"""
import argparse, json, os, subprocess, sys
from concurrent.futures import ProcessPoolExecutor


def read_one(task):
    img, dst, width = task
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        return dst, "cached"
    try:
        pipe = subprocess.run(["magick", img, "-resize", f"{width}x", "-colorspace", "Gray", "png:-"],
                              capture_output=True, timeout=120)
        r = subprocess.run(["tesseract", "stdin", "stdout", "-l", "jpn", "--psm", "6"],
                           input=pipe.stdout, capture_output=True, timeout=300)
        open(dst, "wb").write(r.stdout)
        return dst, "ok" if r.returncode == 0 else f"rc={r.returncode}"
    except Exception as e:
        return dst, f"error:{e}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True)
    ap.add_argument("--jobs", type=int, default=8)
    ap.add_argument("--width", type=int, default=1400)
    a = ap.parse_args()
    jobs = json.load(open(f".tmp/ocr/{a.book}/jobs.json", encoding="utf-8"))
    tess = os.path.join(jobs["workDir"], "tess")
    tasks = [(p["image"], os.path.join(tess, p["id"] + ".txt"), a.width) for p in jobs["pages"]]
    ok = cached = bad = 0
    with ProcessPoolExecutor(max_workers=a.jobs) as ex:
        for i, (dst, st) in enumerate(ex.map(read_one, tasks, chunksize=2), 1):
            if st == "ok": ok += 1
            elif st == "cached": cached += 1
            else: bad += 1; print(f"  ✗ {os.path.basename(dst)} {st}")
            if i % 50 == 0:
                print(f"  {i}/{len(tasks)}", flush=True)
    print(f"[tesseract] {a.book}: 読んだ {ok} / キャッシュ {cached} / 失敗 {bad} （全 {len(tasks)}p）")
    if bad:
        sys.exit(1)


if __name__ == "__main__":
    main()
