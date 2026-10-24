# -*- coding: utf-8 -*-
"""参考文献 bundle 1 冊を機械 OCR し、concat が読むバッチ md を書く（モデル不使用）。

市販書籍の本文を Claude がページ画像から書き写すのは著作物の複製になるのでやらない（2026-10-24）。
文字にするのは obsidian vault の OCR スクリプト ocr_pdf.py（縦書き＝NDLOCR-Lite／横書き＝Indra OCR／
文字層＝pdftotext を自動選択・版は同じ場所の setup.sh で固定）だけで、このスクリプトはその入出力を
doboku-note の bundle の形式へ写す。

  1. prep が sha256 照合したページ画像（.tmp/ocr/<id>/src/pNNNN.jpg）を、id 順に 1 ページ 1 枚の PDF へ組む。
     密度 200dpi で組むので、ocr_pdf.py の 200dpi レンダリングで原寸に戻る
  2. ocr_pdf.py を回す。出力は ~/.cache/vault-ocr/out/<id>/<id>.ocr.md（ページ目印 <!-- p001 -->）
  3. 目印の通し番号を book-manifest のページ id へ写し、<!-- p0001 --> / <!-- p0001 印字:12 --> の
     バッチ md（jobs.json の outFile）を書く。method と品質は machine.json に残し、concat がそれを読む

--pages p0020-p0024 は試し読み。jobs.trial.json と .tmp/ocr/<id>/trial/ に書き、本番の out/ と ocr/ に触れない。

品質ゲート（vault の /ocr-pdf と同じ）: ほぼ空のページが 10% 超、または NDLOCR の信頼度平均 0.85 未満なら
machine.json の qualityGate を fail にして exit 1。concat は fail のまま連結しない（--accept-quality で人が判断）。

使い方: python3 book_ocr_machine.py --book <sourceId> [--pages p0020-p0024] [--engine auto|ndl|indra|text]
終了コード: 0 = 成功 / 1 = 失敗・品質ゲート不合格
"""
import argparse, json, os, re, shutil, subprocess, sys

DEFAULT_OCR_SCRIPT = os.path.expanduser(
    "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/obsidian/.claude/scripts/ocr/ocr_pdf.py")
OCR_HOME = os.path.expanduser(os.environ.get("VAULT_OCR_HOME", "~/.cache/vault-ocr"))
DPI = 200                 # ocr_pdf.py の DPI と合わせる
MAX_LOW_SHARE = 0.10      # ほぼ空のページの上限
MIN_CONFIDENCE = 0.85     # NDLOCR の信頼度平均の下限
MARK = re.compile(r"^<!--\s*p(\d{3,})\s*-->\s*$", re.M)


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        sys.exit(f"✗ {os.path.basename(cmd[0])} が失敗した: {r.stderr.strip()[-600:]}")
    return r.stdout


def select_ids(ids, spec):
    if not spec:
        return ids
    a, _, b = spec.partition("-")
    b = b or a
    if a not in ids or b not in ids:
        sys.exit(f"✗ --pages の id が jobs.json に無い: {spec}")
    return ids[ids.index(a):ids.index(b) + 1]


def build_pdf(images, work, name):
    """1 ページずつ PDF にして pdfunite で束ねる（一括だと数百枚を ImageMagick がメモリに載せる）。"""
    one = os.path.join(work, "pdf-pages")
    shutil.rmtree(one, ignore_errors=True)
    os.makedirs(one)
    singles = []
    for i, img in enumerate(images, 1):
        out = os.path.join(one, f"{i:04d}.pdf")
        run(["magick", img, "-units", "PixelsPerInch", "-density", str(DPI), "-compress", "jpeg", "-quality", "92", out])
        singles.append(out)
    pdf = os.path.join(work, f"{name}.pdf")
    if len(singles) == 1:
        shutil.copyfile(singles[0], pdf)
    else:
        run(["pdfunite", *singles, pdf])
    shutil.rmtree(one, ignore_errors=True)
    return pdf


def split_pages(md):
    """ocr_pdf.py の出力を {通し番号: 本文} にする（frontmatter と注意書きは捨てる）。"""
    marks = list(MARK.finditer(md))
    pages = {}
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(md)
        pages[int(m.group(1))] = md[m.end():end].strip()
    return pages


def marker(page):
    printed = page.get("printedPage")
    return f"<!-- {page['id']} 印字:{printed} -->" if printed not in (None, "") else f"<!-- {page['id']} -->"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True)
    ap.add_argument("--pages", help="試し読み（例 p0020-p0024）。本番の out/ と ocr/ に触れない")
    ap.add_argument("--engine", choices=["auto", "ndl", "indra", "text"], default="auto")
    ap.add_argument("--ocr-script", default=os.environ.get("DOBOKU_OCR_PDF", DEFAULT_OCR_SCRIPT))
    a = ap.parse_args()

    if not os.path.isfile(a.ocr_script):
        sys.exit(f"✗ ocr_pdf.py が無い: {a.ocr_script}（obsidian vault の .claude/scripts/ocr/。DOBOKU_OCR_PDF で指定可）")
    for tool in ("magick", "pdfunite"):
        if not shutil.which(tool):
            sys.exit(f"✗ {tool} が無い（brew install imagemagick poppler）")
    work = os.path.abspath(os.path.join(".tmp", "ocr", a.book))
    jobs_path = os.path.join(work, "jobs.json")
    if not os.path.exists(jobs_path):
        sys.exit(f"✗ {jobs_path} が無い。先に book_ocr_prep.py --book {a.book}")
    jobs = json.load(open(jobs_path, encoding="utf-8"))
    by_id = {p["id"]: p for p in jobs["pages"]}
    ids = select_ids(jobs["pageIds"], a.pages)
    if not ids:
        sys.exit("✗ ページ 0 件。検査していないことを緑にしない")
    images = [os.path.join(jobs["srcDir"], os.path.basename(by_id[i]["image"])) for i in ids]
    missing = [p for p in images if not os.path.exists(p) or os.path.getsize(p) == 0]
    if missing:
        sys.exit(f"✗ 照合済み画像が {len(missing)} 枚無い（{missing[:3]}）。book_ocr_prep.py を回し直す")

    trial = bool(a.pages)
    run_dir = os.path.join(work, "trial") if trial else work
    os.makedirs(run_dir, exist_ok=True)
    name = f"{a.book}.trial" if trial else a.book
    pdf = build_pdf(images, run_dir, name)
    print(f"[machine] {a.book}: {len(ids)}p（{ids[0]}〜{ids[-1]}）を PDF に組んだ → ocr_pdf.py", file=sys.stderr)

    cmd = [sys.executable, a.ocr_script, pdf]
    if a.engine != "auto":
        cmd += ["--engine", a.engine]
    lines = [l for l in run(cmd).splitlines() if l.strip()]
    summary = json.loads(lines[-1])
    os.remove(pdf)
    ocr_dir = os.path.dirname(summary["md"])
    meta = json.load(open(os.path.join(ocr_dir, f"{name}.ocr.json"), encoding="utf-8"))
    got = split_pages(open(summary["md"], encoding="utf-8").read())
    if sorted(got) != list(range(1, len(ids) + 1)):
        sys.exit(f"✗ ページ目印の数が合わない: 期待 {len(ids)} / 実際 {len(got)}")

    q = meta["quality"]
    low_share = len(q["low_pages"]) / max(q["pages"], 1)
    reasons = []
    if low_share > MAX_LOW_SHARE:
        reasons.append(f"ほぼ空のページ {len(q['low_pages'])}/{q['pages']}（{low_share:.0%}）")
    if "confidence_mean" in q and q["confidence_mean"] < MIN_CONFIDENCE:
        reasons.append(f"信頼度平均 {q['confidence_mean']}")
    method = f"machine-ocr({meta['engine_version']})"

    batch = jobs["batchSize"]
    out_dir = os.path.join(run_dir, "out")
    os.makedirs(out_dir, exist_ok=True)
    batches = []
    for s in range(0, len(ids), batch):
        chunk = ids[s:s + batch]
        out_file = os.path.join(out_dir, f"b{s // batch:03d}.md")
        body = "\n\n".join(f"{marker(by_id[pid])}\n{got[ids.index(pid) + 1]}" for pid in chunk)
        open(out_file, "w", encoding="utf-8", newline="\n").write(body.strip() + "\n")
        batches.append({"bi": s // batch, "ids": chunk, "outFile": out_file})

    record = {"method": method, "engine": meta["engine"], "engineVersion": meta["engine_version"],
              "reason": meta.get("reason"), "ocrMarkdown": summary["md"], "pageIds": ids,
              "quality": q, "qualityGate": "fail" if reasons else "pass", "qualityReasons": reasons}
    json.dump(record, open(os.path.join(run_dir, "machine.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if trial:
        trial_jobs = {**jobs, "pageIds": ids, "batches": batches, "workDir": run_dir, "outDir": out_dir,
                      "transcriptDir": os.path.join(run_dir, "ocr")}
        json.dump(trial_jobs, open(os.path.join(work, "jobs.trial.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    elif [b["ids"] for b in batches] != [b["ids"] for b in jobs["batches"]]:
        sys.exit("✗ バッチの切り方が jobs.json と違う（prep の --batch を変えた？）。prep を回し直す")

    conf = f" / 信頼度 {q['confidence_mean']}" if "confidence_mean" in q else ""
    print(f"[machine] {a.book}: {meta['engine']}（{meta.get('reason')}）/ {q['pages']}p / 中央値 {q['chars_median']} 字"
          f" / ほぼ空 {len(q['low_pages'])}p{conf} / method {method}")
    print(f"[machine] バッチ {len(batches)} 本 → {out_dir}")
    if reasons:
        print(f"✗ 品質ゲート不合格: {'・'.join(reasons)}。原本の状態を人が確かめる（concat は --accept-quality が要る）")
        sys.exit(1)
    nxt = f"--jobs {os.path.join(work, 'jobs.trial.json')}" if trial else ""
    print(f"[machine] ✓ 次: python3 .claude/skills/conversion/pdf-to-mdx/scripts/book-ocr/book_ocr_concat.py --book {a.book} {nxt}".rstrip())


if __name__ == "__main__":
    main()
