# -*- coding: utf-8 -*-
"""第二読（無料・ローカル）: Tesseract jpn で各ページを読み .tmp/ocr/<sid>/tess/<id>.txt へ。
Sonnet の視覚OCRとは独立に読み、両者の不一致で「見直すページ」を絞るための材料。
Tesseract 自体は誤読が多いので、この出力を本文には使わない。

使い方: python3 book_ocr_tesseract.py --book <sourceId> [--jobs 8] [--width 1400] [--psm 3] [--force]
既定 psm 3（自動分割）。compare の本文一致率中央値が 0.6 台に沈み Tesseract 出力で左右の段が混ざっていたら psm の問題（--force で読み直す）
"""
import argparse, json, os, subprocess, sys
from concurrent.futures import ProcessPoolExecutor


def read_one(task):
    img, dst, width, psm, force = task
    if not force and os.path.exists(dst) and os.path.getsize(dst) > 0:
        return dst, "cached"
    try:
        pipe = subprocess.run(["magick", img, "-resize", f"{width}x", "-colorspace", "Gray", "png:-"],
                              capture_output=True, timeout=120)
        r = subprocess.run(["tesseract", "stdin", "stdout", "-l", "jpn", "--psm", str(psm)],
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
    ap.add_argument("--psm", type=int, default=3, help="Tesseract のページ分割。3=自動（既定。2段組を段ごとに読む）。6=単一ブロックは2段組で左右を行ごとに混ぜ、一致率が 0.55 まで偽って下がった（disaster-civil-basics）。単段組では 3 と 6 は同等（concrete-basics 5p で 3 が同等以上）")
    ap.add_argument("--force", action="store_true", help="キャッシュを無視して読み直す（psm を変えたとき）")
    a = ap.parse_args()
    jobs = json.load(open(f".tmp/ocr/{a.book}/jobs.json", encoding="utf-8"))
    tess = os.path.join(jobs["workDir"], "tess")
    tasks = [(p["image"], os.path.join(tess, p["id"] + ".txt"), a.width, a.psm, a.force) for p in jobs["pages"]]
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
