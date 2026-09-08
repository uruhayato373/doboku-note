# -*- coding: utf-8 -*-
"""視覚OCR（Sonnet）の各ページ本文を Tesseract 第二読と突き合わせ、見直すページを絞る。

判定するのは「二つの独立した読みが食い違うページ」であって、正誤ではない。
食い違いの原因（Sonnet の脱落・言い換え／Tesseract の誤読）は校正エージェントが画像で確かめる。

出力: .tmp/ocr/<sid>/compare.json
  pages[]: {id, bi, sim, lenRatio, sonnetChars, tessChars, unreadable, flags[]}
  rerunBatches[]: マーカー欠落・重複など、バッチごと取り直すもの
  proofreadItems[]: {bi, outFile, pageIds[]} 校正 Workflow に渡すもの
"""
import argparse, json, os, re, statistics, sys, unicodedata
from difflib import SequenceMatcher

MARK = re.compile(r"<!--\s*(p\d{4})(?:\s+印字:[^>]*?)?\s*-->")
STRIP = re.compile(r"[\s#*>|`_\-—–・、。，．,.:：;；「」『』（）()\[\]【】〈〉《》\"'“”‘’!?！？…‥/／\\]+")
UNREAD = re.compile(r"〔(判読不能|欠落)[^〕]*〕")


def norm(s):
    s = UNREAD.sub("", s)
    s = re.sub(r"（図:[^）]*）", "", s)
    s = unicodedata.normalize("NFKC", s)
    return STRIP.sub("", s)


def split_pages(md):
    parts = MARK.split(md)
    # parts = [pre, id1, body1, id2, body2, ...]
    out, order = {}, []
    for i in range(1, len(parts), 2):
        pid, body = parts[i], parts[i + 1]
        order.append(pid)
        out[pid] = out.get(pid, "") + body
    return out, order


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True)
    ap.add_argument("--min-sim", type=float, default=0.50)
    a = ap.parse_args()
    jobs = json.load(open(f".tmp/ocr/{a.book}/jobs.json", encoding="utf-8"))
    tess_dir = os.path.join(jobs["workDir"], "tess")
    pages, rerun, missing_files = [], [], []
    for b in jobs["batches"]:
        if not os.path.exists(b["outFile"]):
            missing_files.append(b["bi"]); rerun.append(b["bi"]); continue
        md = open(b["outFile"], encoding="utf-8").read()
        got, order = split_pages(md)
        expected = b["ids"]
        problems = []
        if order != expected:
            dup = len(order) != len(set(order))
            problems.append("duplicateMarker" if dup else "markerOrder" if set(order) == set(expected) else "missingMarker")
        if "�" in md:
            problems.append("uffffd")
        if problems:
            rerun.append(b["bi"])
        for pid in expected:
            s_raw = got.get(pid, "")
            t_path = os.path.join(tess_dir, pid + ".txt")
            t_raw = open(t_path, encoding="utf-8", errors="replace").read() if os.path.exists(t_path) else ""
            s, t = norm(s_raw), norm(t_raw)
            sim = SequenceMatcher(None, s, t, autojunk=False).ratio() if (s and t) else 0.0
            figs = s_raw.count("（図:")
            pages.append({"id": pid, "bi": b["bi"], "sim": round(sim, 3),
                          "lenRatio": round(len(s) / len(t), 2) if t else None,
                          "sonnetChars": len(s), "tessChars": len(t), "figures": figs,
                          # 図が 2 つ以上で本文が 200 字未満＝図版ページ。Tesseract は写真から雑音を拾うので
                          # 一致率で見直しに回さない。これ以上は絞らない: concrete-basics-5th で「図 1 つ以上・
                          # 400 字未満」まで除外すると、本文の実誤り 5 箇所のうち 3 箇所（怠らす→怠らず、繊密→緻密、
                          # 重複誤字）が図解ページ上にあり見直しから漏れた。図解本は図の脇に本文が載る
                          "figurePage": figs >= 2 and len(s) < 200,
                          "unreadable": len(UNREAD.findall(s_raw)), "flags": list(problems)})
    if not pages:
        sys.exit("比較 0 ページ。検査していないことを緑にしない")

    sims = [p["sim"] for p in pages if p["tessChars"] >= 100 and p["sonnetChars"] >= 20]
    # 本文ページの素の一致率を代表値にする。目次・口絵（図だらけ・リーダー罫）は Tesseract 側が
    # 崩れて一致率を引き下げるので、字数比が揃い一致率 0.5 以上の「行儀のよい」ページの中央値を取り、
    # そこから 0.2 下を見直し線にする（手持ち撮影の本では代表値ごと下がるので線も自然に下がる）。
    body = [p["sim"] for p in pages if p["tessChars"] >= 100 and p["sonnetChars"] >= 20
            and p["lenRatio"] is not None and 0.7 <= p["lenRatio"] <= 1.4 and p["sim"] >= 0.5]
    med = statistics.median(body) if body else (statistics.median(sims) if sims else 0.0)
    mad = statistics.median([abs(x - med) for x in body]) * 1.4826 if body else 0.0
    cut = max(a.min_sim, med - 0.2)
    for p in pages:
        if p["figurePage"]:
            continue
        if p["tessChars"] >= 100 and p["sonnetChars"] < 20:
            p["flags"].append("empty")
        elif p["tessChars"] >= 100 and p["sim"] < cut:
            p["flags"].append("lowSim")
        # Sonnet が Tesseract より短い＝行や段落の取りこぼしの疑い。長い側（Tesseract が図で崩れた）は見ない
        if p["lenRatio"] is not None and p["tessChars"] >= 100 and p["lenRatio"] < 0.7:
            p["flags"].append("lenOff")
    flagged = [p for p in pages if p["flags"] and p["bi"] not in rerun]
    by_batch = {}
    for p in flagged:
        by_batch.setdefault(p["bi"], []).append(p["id"])
    items = [{"bi": bi, "outFile": jobs["batches"][bi]["outFile"], "pageIds": ids} for bi, ids in sorted(by_batch.items())]
    summary = {"pages": len(pages), "compared": len(sims), "median": round(med, 3), "mad": round(mad, 3), "bodyPages": len(body),
               "cut": round(cut, 3), "flaggedPages": len(flagged), "rerunBatches": len(rerun),
               "unreadableTotal": sum(p["unreadable"] for p in pages), "figurePages": sum(1 for p in pages if p["figurePage"]),
               "missingBatchFiles": missing_files}
    json.dump({"sourceId": a.book, "summary": summary, "pages": pages, "rerunBatches": sorted(set(rerun)),
               "proofreadItems": items},
              open(os.path.join(jobs["workDir"], "compare.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"[compare] {a.book}: {len(pages)}p 比較 {len(sims)}p（本文らしいページ {len(body)}p）/ 本文一致率 中央値 {med:.3f} MAD {mad:.3f} → しきい値 {cut:.3f}")
    print(f"  見直し {len(flagged)}p（{len(items)} バッチ） / 図版ページ除外 {summary['figurePages']}p / バッチ取り直し {len(rerun)} / 〔判読不能〕{summary['unreadableTotal']}")
    if missing_files:
        print(f"  ✗ 出力が無いバッチ: {missing_files}")
    worst = sorted([p for p in pages if p["tessChars"] >= 100], key=lambda p: p["sim"])[:8]
    for p in worst:
        print(f"    {p['id']} b{p['bi']:03d} sim={p['sim']:.3f} len={p['lenRatio']} {','.join(p['flags'])}")


if __name__ == "__main__":
    main()
