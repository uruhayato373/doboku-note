# -*- coding: utf-8 -*-
"""参考文献 bundle 1 冊分の視覚OCRジョブを組む（決定的・モデル不使用）。

Drive vault の pages/pNNNN.jpg を **sha256 で台帳と照合しながら** ローカル .tmp へ複製し、
（必要なら幅を縮めて）エージェントが読む画像を用意する。Drive のストリーミングマウントは
キャッシュから追い出されたファイルを「サイズはあるのに中身が空」で返すことがあり
（2026-09-09 concrete-basics-5th p0080 で実測）、それをそのまま読ませると空ページを
「本文なし」と起こしてしまう。照合に落ちたページは rclone で雲から取り直し、それでも
合わなければ止める（1 ページでも欠けたら jobs.json を書かない）。

出力: .tmp/ocr/<sourceId>/jobs.json, .tmp/ocr/<sourceId>/img/pNNNN.jpg（検証済み・width 指定なら縮小）

使い方: python3 book_ocr_prep.py --book <sourceId> [--batch 6] [--width 1500] [--remote doboku-gdrive:doboku-note]
"""
import argparse, glob, hashlib, json, os, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor


def vault_root():
    env = os.environ.get("DOBOKU_DRIVE_VAULT")
    if env and os.path.isdir(env):
        return env
    m = glob.glob(os.path.expanduser("~/Library/CloudStorage/GoogleDrive-*/マイドライブ/doboku-note"))
    return m[0] if m else None


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def fetch_verified(task):
    """vault → src コピー。sha 不一致なら rclone で取り直す。戻り: (id, ok, how)"""
    pid, vault_path, expected, src_path, remote_rel, remote = task
    for attempt in ("mount", "mount-retry", "rclone"):
        try:
            if attempt == "rclone":
                if not remote:
                    return pid, False, "sha mismatch, no remote"
                r = subprocess.run(["rclone", "copyto", f"{remote}/{remote_rel}", src_path],
                                   capture_output=True, timeout=300)
                if r.returncode != 0:
                    return pid, False, f"rclone rc={r.returncode}"
            else:
                shutil.copyfile(vault_path, src_path)
            if os.path.getsize(src_path) > 0 and sha256(src_path) == expected:
                return pid, True, attempt
        except Exception as e:
            last = str(e)
    return pid, False, "sha mismatch after rclone"


def downscale(task):
    src, dst, width = task
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        return dst, True
    r = subprocess.run(["magick", src, "-resize", f"{width}x", "-quality", "88", dst], capture_output=True, timeout=120)
    return dst, r.returncode == 0 and os.path.exists(dst) and os.path.getsize(dst) > 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True)
    ap.add_argument("--batch", type=int, default=6)
    ap.add_argument("--width", type=int, default=0, help="0=原寸のまま。1500 などで縮小（トークン削減）")
    ap.add_argument("--remote", default="doboku-gdrive:doboku-note", help="rclone の Drive リモート。空で無効")
    ap.add_argument("--jobs", type=int, default=12)
    a = ap.parse_args()
    root = vault_root()
    if not root:
        sys.exit("Drive vault が無い")
    mf = glob.glob(f"content/sources/books/{a.book}__*/book-manifest.json")
    if len(mf) != 1:
        sys.exit(f"book-manifest が {len(mf)} 件: {a.book}")
    man = json.load(open(mf[0], encoding="utf-8"))
    if not man["pages"]:
        sys.exit("ページ 0 件。検査していないことを緑にしない")
    pages_dir = os.path.join(root, "原資料PDF", "書籍", man["directory"], "pages")
    work = os.path.abspath(os.path.join(".tmp", "ocr", a.book))
    src_dir, img_dir, out_dir = os.path.join(work, "src"), os.path.join(work, "img"), os.path.join(work, "out")
    for d in (src_dir, img_dir, out_dir, os.path.join(work, "tess")):
        os.makedirs(d, exist_ok=True)

    # 1) 原寸を sha256 照合しながらローカルへ
    tasks = []
    for p in man["pages"]:
        name = os.path.basename(p["image"])
        src_path = os.path.join(src_dir, name)
        if os.path.exists(src_path) and os.path.getsize(src_path) == p["bytes"] and sha256(src_path) == p["sha256"]:
            continue
        tasks.append((p["id"], os.path.join(pages_dir, name), p["sha256"], src_path,
                      f"原資料PDF/書籍/{man['directory']}/pages/{name}", a.remote))
    how = {"mount": 0, "mount-retry": 0, "rclone": 0}
    failed = []
    with ThreadPoolExecutor(max_workers=a.jobs) as ex:
        for pid, ok, note in ex.map(fetch_verified, tasks):
            if ok:
                how[note] = how.get(note, 0) + 1
            else:
                failed.append((pid, note))
    print(f"[prep] {a.book}: 原寸 {len(man['pages'])}p を sha256 照合 — 新規取得 {len(tasks)}p"
          f"（mount {how['mount']} / 再試行 {how['mount-retry']} / rclone {how['rclone']}）")
    if failed:
        for pid, note in failed[:20]:
            print(f"  ✗ {pid}: {note}")
        sys.exit(f"✗ {len(failed)} ページが台帳の sha256 と一致しない。jobs.json を書かない")

    # 2) エージェントが読む画像（原寸 or 縮小）
    if a.width:
        dtasks = [(os.path.join(src_dir, os.path.basename(p["image"])),
                   os.path.join(img_dir, os.path.basename(p["image"])), a.width) for p in man["pages"]]
        with ThreadPoolExecutor(max_workers=a.jobs) as ex:
            bad = [d for d, ok in ex.map(downscale, dtasks) if not ok]
        if bad:
            sys.exit(f"✗ 縮小に失敗 {len(bad)}p: {bad[:5]}")
        read_dir = img_dir
    else:
        read_dir = src_dir

    ids = [p["id"] for p in man["pages"]]
    batches = [{"bi": i // a.batch, "ids": ids[i:i + a.batch], "outFile": os.path.join(out_dir, f"b{i // a.batch:03d}.md")}
               for i in range(0, len(ids), a.batch)]
    sections = {}
    for p in man["pages"]:
        sections.setdefault(p.get("section") or "全巻", []).append(p["id"])
    jobs = {"sourceId": a.book, "title": man["title"], "bookDir": man["directory"],
            "renderMode": man["renderProfile"]["mode"], "vaultPagesDir": pages_dir,
            "srcDir": src_dir, "imgDir": read_dir, "imgWidth": a.width or None,
            "pagesDir": read_dir, "workDir": work, "outDir": out_dir, "batchSize": a.batch,
            "pageIds": ids, "pages": [{"id": p["id"], "image": os.path.join(read_dir, os.path.basename(p["image"])),
                                       "printedPage": p.get("printedPage"), "section": p.get("section")} for p in man["pages"]],
            "batches": batches, "sections": {k: [v[0], v[-1]] for k, v in sections.items()},
            "transcriptDir": os.path.abspath(f"content/sources/books/{man['directory']}/ocr")}
    json.dump(jobs, open(os.path.join(work, "jobs.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"[prep] {a.book}: {len(ids)}p / {len(batches)} batch / 読む画像 {read_dir}"
          f"{f'（幅 {a.width}px）' if a.width else '（原寸）'} → {work}/jobs.json")


if __name__ == "__main__":
    main()
