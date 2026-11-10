# -*- coding: utf-8 -*-
"""旧経路で章別に起こした文字起こし（ページ対応なし）を、Tesseract 第二読を手がかりに
ページ画像へ割り当て、record-reference-book-artifacts の登録コマンドを組む。

各ページの Tesseract テキストと各章のテキスト片（<!-- p.NN --> があればページ片、無ければ
1000 字の窓）を文字 2-gram の再現率で突き合わせ、章の並び順を保つ Viterbi でページ→章を決める。
どの章にも当たらないページ（前付け・目次・図だけ・未転記）は登録せず README に列挙する。
判定するのは「どのページがどの章に対応するか」で、文字起こしの正誤ではない。

使い方: python3 book_ocr_align_legacy.py --book <sourceId> [--min-overlap 0.35] [--write]
出力: .tmp/ocr/<sid>/legacy-align.json, register.sh（--write）
"""
import argparse, glob, json, os, re, sys, unicodedata

MARK = re.compile(r"<!--\s*p\.(\S+?)\s*-->")
PDFPAGES = re.compile(r'^pdfPages:\s*"?(\d+)\s*-\s*(\d+)"?', re.M)
STRIP = re.compile(r"[\s#*>|`_\-—–・、。，．,.:：;；「」『』（）()\[\]【】〈〉《》\"'“”‘’!?！？…‥/／\\]+")


def norm(s):
    s = re.sub(r"^---\n.*?\n---\n", "", s, flags=re.S)
    s = re.sub(r"（図:[^）]*）", "", s)
    s = unicodedata.normalize("NFKC", s)
    return STRIP.sub("", s)


def bigrams(s):
    return {s[i:i + 2] for i in range(len(s) - 1)}


def chunks_of(text, window=1000, stride=500):
    if MARK.search(text):
        parts = MARK.split(text)          # [pre, nombre, body, nombre, body, ...]
        out = [p for p in parts[2::2]]
        return [norm(p) for p in out if len(norm(p)) >= 40]
    t = norm(text)
    return [t[i:i + window] for i in range(0, max(1, len(t) - window // 2), stride)] or [t]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True)
    ap.add_argument("--min-overlap", type=float, default=0.35)
    ap.add_argument("--method", default="legacy-visual-ocr(chapter files, page-aligned by tesseract)")
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    jobs = json.load(open(f".tmp/ocr/{a.book}/jobs.json", encoding="utf-8"))
    tess = os.path.join(jobs["workDir"], "tess")
    ocr_dir = jobs["transcriptDir"]
    chapters = sorted(f for f in glob.glob(os.path.join(ocr_dir, "*.md")) if os.path.basename(f) != "README.md")
    if not chapters:
        sys.exit("章ファイルが無い（Drive から ocr/ を複製したか）")
    ch = []
    for f in chapters:
        text = open(f, encoding="utf-8").read()
        cks = chunks_of(text)
        fm = text.split("\n---\n", 1)[0] if text.startswith("---") else ""
        m = PDFPAGES.search(fm)
        ch.append({"file": f, "name": os.path.basename(f), "chunks": [bigrams(c) for c in cks], "chars": len(norm(text)),
                   "pdfPages": (int(m.group(1)), int(m.group(2))) if m else None})
    by_pdf = {}
    for p in jobs["pages"]:
        by_pdf.setdefault(p.get("sourcePdfPage"), []).append(p["id"])
    pages = []
    for p in jobs["pages"]:
        t_path = os.path.join(tess, p["id"] + ".txt")
        t = norm(open(t_path, encoding="utf-8", errors="replace").read()) if os.path.exists(t_path) else ""
        pages.append({"id": p["id"], "bg": bigrams(t), "chars": len(t)})
    if not pages or sum(1 for p in pages if p["chars"] >= 50) == 0:
        sys.exit("Tesseract 出力が無い。先に book_ocr_tesseract.py を回す")

    # emission[page][chapter] = その章の最も近い片に対するページ 2-gram の再現率
    C = len(ch)
    emis = []
    for p in pages:
        row = []
        for c in ch:
            best = 0.0
            if p["bg"]:
                for bg in c["chunks"]:
                    ov = len(p["bg"] & bg) / len(p["bg"])
                    if ov > best:
                        best = ov
            row.append(best)
        emis.append(row)

    # 章の並びはファイル名順でなく、各章が最もよく当たるページの中央値で決める
    # （pe-cem-textbook はファイル名順が 人的→安全→情報→社会→経済 で書籍順と違い、後退罰で情報管理が 0p になった）
    import statistics
    # H1 に「第N章」があればその番号（書籍の目次順）、無ければ最もよく当たるページの中央値で並べる
    chap_no = []
    for x in ch:
        head = open(x["file"], encoding="utf-8").read()
        m = re.search(r"^#\s*第\s*([0-9０-９]+)\s*章", head, re.M)
        chap_no.append(int(unicodedata.normalize("NFKC", m.group(1))) if m else None)
    if all(n is not None for n in chap_no) and len(set(chap_no)) == len(chap_no):
        perm = sorted(range(C), key=lambda ci: chap_no[ci])
    else:
        order = []
        for ci in range(C):
            hits = [i for i in range(len(pages)) if emis[i][ci] >= a.min_overlap and emis[i][ci] == max(emis[i])]
            order.append((statistics.median(hits) if hits else float("inf"), ci))
        order.sort()
        perm = [ci for _, ci in order]
    ch = [ch[ci] for ci in perm]
    emis = [[row[ci] for ci in perm] for row in emis]
    # 章の並び順を保つ Viterbi（前進は無料、飛ばしは軽い罰、後退は重い罰）
    INF = float("inf")
    score = [[-INF] * C for _ in pages]
    back = [[-1] * C for _ in pages]
    for c in range(C):
        score[0][c] = emis[0][c] - 0.3 * c
    for i in range(1, len(pages)):
        for c in range(C):
            best, arg = -INF, -1
            for pc in range(C):
                if score[i - 1][pc] == -INF:
                    continue
                if pc == c or pc + 1 == c:
                    cost = 0.0
                elif pc < c:
                    cost = 0.5 * (c - pc - 1)
                else:
                    cost = 3.0
                v = score[i - 1][pc] - cost
                if v > best:
                    best, arg = v, pc
            score[i][c] = best + emis[i][c]
            back[i][c] = arg
    c = max(range(C), key=lambda k: score[-1][k])
    assign = [0] * len(pages)
    for i in range(len(pages) - 1, -1, -1):
        assign[i] = c
        c = back[i][c] if i else c

    per = [{"name": x["name"], "file": x["file"], "chars": x["chars"], "pages": [], "interpolated": [],
            "basis": "pdfPages" if x["pdfPages"] else "tesseract"} for x in ch]
    uncovered = []
    id_index = {p["id"]: i for i, p in enumerate(pages)}
    if all(x["pdfPages"] for x in ch):
        # 章ファイルの frontmatter が原本 PDF のページ範囲を持つ → book-manifest の sourcePdfPage で決定的に割り当てる
        claimed = {}
        for ci, x in enumerate(ch):
            lo, hi = x["pdfPages"]
            for pp in range(lo, hi + 1):
                for pid in by_pdf.get(pp, []):
                    claimed.setdefault(pid, ci)
        for i, p in enumerate(pages):
            if p["id"] in claimed:
                per[claimed[p["id"]]]["pages"].append(p["id"])
            else:
                uncovered.append({"id": p["id"], "why": "章ファイルの pdfPages 範囲外（未転記）"})
        # 突合の健全性: pdfPages で割り当てたページの Tesseract 一致を報告（低ければ範囲がずれている疑い）
        for ci, x in enumerate(per):
            ovs = [emis[id_index[pid]][ci] for pid in x["pages"] if pages[id_index[pid]]["chars"] >= 50]
            x["meanOverlap"] = round(sum(ovs) / len(ovs), 3) if ovs else None
    else:
        for i, p in enumerate(pages):
            ov = emis[i][assign[i]]
            if p["chars"] < 50:
                uncovered.append({"id": p["id"], "why": "tesseract の文字が 50 字未満（白紙・図だけ・扉）", "ci": assign[i]})
            elif ov < a.min_overlap:
                uncovered.append({"id": p["id"], "why": f"どの章にも当たらない（最良 {ov:.2f}）", "ci": assign[i]})
            else:
                per[assign[i]]["pages"].append(p["id"])
        # 内挿: 同じ章に割り当たったページに前後を挟まれ、Tesseract が雑音（手持ち撮影のぼけ等）で当たらなかった
        # ページは、その章へ入れて「内挿」と明示する（文字列で確かめたページではない）
        assigned_ci = {pid: ci for ci, x in enumerate(per) for pid in x["pages"]}
        kept = []
        for u in uncovered:
            i = id_index[u["id"]]
            prev_ci = next((assigned_ci[pages[j]["id"]] for j in range(i - 1, -1, -1) if pages[j]["id"] in assigned_ci), None)
            next_ci = next((assigned_ci[pages[j]["id"]] for j in range(i + 1, len(pages)) if pages[j]["id"] in assigned_ci), None)
            if prev_ci is not None and prev_ci == next_ci and pages[i]["chars"] >= 50:
                per[prev_ci]["interpolated"].append(u["id"])
            else:
                kept.append({k: v for k, v in u.items() if k != "ci"})
        uncovered = kept
        # 章の区間内挿: 文字で 1 ページも当たらなかった章（撮影のぼけで Tesseract が雑音を返す本）は、
        # 目次順で前後の章に挟まれた未割当の連続ブロックをその章へ入れ、「区間内挿」と明示する
        for ci, x in enumerate(per):
            if x["pages"] or ci == 0 or ci == C - 1:
                continue
            prev_pages, next_pages = per[ci - 1]["pages"], per[ci + 1]["pages"]
            if not prev_pages or not next_pages:
                continue
            lo, hi = id_index[prev_pages[-1]], id_index[next_pages[0]]
            block = [u for u in uncovered if lo < id_index[u["id"]] < hi]
            if len(block) >= 3:
                x["interpolated"].extend(u["id"] for u in block)
                x["gapInterpolated"] = f"{block[0]['id']}〜{block[-1]['id']}"
                blocked = {u["id"] for u in block}
                uncovered = [u for u in uncovered if u["id"] not in blocked]
        for x in per:
            x["pages"] = sorted(x["pages"] + x["interpolated"], key=lambda pid: id_index[pid])
    for x in per:
        x["range"] = f"{x['pages'][0]}〜{x['pages'][-1]}" if x["pages"] else "—"
    covered = sum(len(x["pages"]) for x in per)
    interp = sum(len(x["interpolated"]) for x in per)
    out = {"sourceId": a.book, "pages": len(pages), "covered": covered, "uncovered": uncovered,
           "minOverlap": a.min_overlap, "chapters": [{k: v for k, v in x.items() if k != "file"} for x in per]}
    json.dump(out, open(os.path.join(jobs["workDir"], "legacy-align.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"[align] {a.book}: {len(pages)}p のうち章へ割当 {covered}p（うち内挿 {interp}p） / 未割当 {len(uncovered)}p（しきい値 {a.min_overlap}・根拠 {per[0]['basis']}）")
    for x in per:
        extra = f"  一致 {x['meanOverlap']}" if x.get("meanOverlap") is not None else (f"  内挿 {len(x['interpolated'])}" + (f"（区間 {x['gapInterpolated']}）" if x.get("gapInterpolated") else "") if x["interpolated"] else "")
        print(f"   {x['name']:44s} {len(x['pages']):4d}p  {x['range']}{extra}")
    if uncovered:
        print("   未割当:", ", ".join(u["id"] for u in uncovered[:40]) + (" …" if len(uncovered) > 40 else ""))
    hist = [0] * 10
    for i in range(len(pages)):
        hist[min(9, int(emis[i][assign[i]] * 10))] += 1
    print("   割当章への再現率の分布 [0.0,0.1,…,0.9]:", hist)
    if a.write:
        reg = ["#!/bin/sh", "set -e", f"# {a.book}: 旧経路の章ファイルをページ割当つきで登録（既定 dry-run。--commit で実行）"]
        for x in per:
            if not x["pages"]:
                continue
            rel = os.path.relpath(x["file"], os.getcwd())
            reg.append(f"node scripts/record-reference-book-artifacts.mjs --source-id {a.book} "
                       f"--ocr-path '{rel}' --ocr-pages {','.join(x['pages'])} --ocr-method '{a.method}' \"$@\"")
        # 登録が済んだら原寸画像の複製（1 冊 1〜2GB）は用済み。set -e で node 行の成功後にだけ届く。
        # dry-run では消さない（目視の抜き取りは登録前に行うため）。
        reg.append(f"case \" $* \" in *\" --commit \"*) rm -rf '{jobs['srcDir']}' && "
                   f"echo '[register] 原寸画像を削除: {jobs['srcDir']}';; esac")
        open(os.path.join(jobs["workDir"], "register.sh"), "w", encoding="utf-8").write("\n".join(reg) + "\n")
        print(f"   → {jobs['workDir']}/register.sh")


if __name__ == "__main__":
    main()
