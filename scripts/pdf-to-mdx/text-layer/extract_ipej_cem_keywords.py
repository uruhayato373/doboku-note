# -*- coding: utf-8 -*-
"""総合技術監理キーワード集2026 を PDF のテキスト層から章別 Markdown へ起こす。

画像OCRではなくテキスト層をそのまま読むので文字認識誤りは生じない。
版面の幾何（行頭 x＝字下げ段、行末 x＝版面幅いっぱいか）で構造を決める:
  - 行頭 128/161/194/227 pt = キーワードの第1〜4階層
  - 行頭 144 pt = 散文段落の1字下げ（段落の開始）
  - 行末が版面幅いっぱい = 次の行へ折り返した継続行
-layout の空白数は同じ段でも揺れるので使わない。
"""
import collections, html, os, re, subprocess, sys

VAULT = os.environ["VAULT_BOOK"]
PDF = os.path.join(VAULT, "source", "001.pdf")
OUT = sys.argv[1]

LADDER = [128, 161, 194, 227]
PROSE_INDENT = 144
MEASURE = 760          # 版面右端。これに達した行は折り返しの途中
TOL = 6

SETSU = re.compile(r"^([０-９])．([０-９])\s+(\S.*)$")
SHOU = re.compile(r"^([０-９])．(\S{2,12})$")
Z2H = str.maketrans("０１２３４５６７８９", "0123456789")

# 本文の段落の間に割り込む表（フロート）。段落の再結合から外し、表として別に組む。
FLOAT_TABLES = [{"start": re.compile(r"^表[０-９]+\s+\S"), "end": "組織の社会的責任と環境管理活動",
                 "caption": "表１ ５つの管理技術の範囲",
                 "label": re.compile(r"^（[０-９一-九]+）")}]

CHAPTERS = [
    ("00_目次", "目次", None),
    ("01_まえがき", "まえがき", "まえがき"),
    ("02_総合技術監理", "1. 総合技術監理", "１．総合技術監理"),
    ("03_経済性管理", "2. 経済性管理", "２．経済性管理"),
    ("04_人的資源管理", "3. 人的資源管理", "３．人的資源管理"),
    ("05_情報管理", "4. 情報管理", "４．情報管理"),
    ("06_安全管理", "5. 安全管理", "５．安全管理"),
    ("07_社会環境管理", "6. 社会環境管理", "６．社会環境管理"),
]


class Line:
    __slots__ = ("page", "left", "right", "text")

    def __init__(self, page, left, right, text):
        self.page, self.left, self.right, self.text = page, left, right, text

    @property
    def full(self):
        return self.right >= MEASURE

    @property
    def depth(self):
        for i, x in enumerate(LADDER):
            if abs(self.left - x) <= TOL:
                return i
        return None

    @property
    def prose_start(self):
        return abs(self.left - PROSE_INDENT) <= TOL


def read_lines():
    xml = subprocess.run(["pdftohtml", "-xml", "-stdout", PDF], capture_output=True, check=True).stdout.decode("utf-8")
    out = []
    for num, body in re.findall(r'<page number="(\d+)"[^>]*>(.*?)</page>', xml, re.S):
        rows = collections.defaultdict(list)
        for m in re.finditer(r'<text top="(\d+)" left="(\d+)" width="(\d+)"[^>]*>(.*?)</text>', body, re.S):
            rows[int(m.group(1))].append(
                (int(m.group(2)), int(m.group(3)), html.unescape(re.sub(r"<[^>]+>", "", m.group(4)))))
        for top in sorted(rows):
            parts = sorted(rows[top])
            text = "".join(t for _, _, t in parts).strip()
            solid = [(l, w) for l, w, t in parts if t.strip()]
            if not text or not solid or re.fullmatch(r"\d{1,3}", text):
                continue
            out.append(Line(int(num), solid[0][0], max(l + w for l, w in solid), text))
    return out


def render(lines, title, marker=None):
    body, prose = [], []
    state = {"open": None}          # 句点で閉じていない段落の body 内位置

    def flush():
        if prose:
            body.append("".join(prose))
            state["open"] = None if body[-1].endswith("。") else len(body) - 1
            body.append("")
            prose.clear()

    def head(level, text):
        flush()
        if body and body[-1]:
            body.append("")
        body.append("#" * level + " " + text)
        body.append("")

    prev = None
    skip_to = -1
    for i, ln in enumerate(lines):
        if i < skip_to:
            continue
        nxt = lines[i + 1] if i + 1 < len(lines) else None
        table = next((t for t in FLOAT_TABLES if t["start"].match(ln.text)), None)
        if table:
            end = next(j for j in range(i, len(lines)) if lines[j].text.endswith(table["end"]))
            rows, label = [], None
            for row in lines[i + 1:end + 1]:
                if table["label"].match(row.text):
                    label = row.text
                    rows.append([label, []])
                elif rows:
                    if rows[-1][1] and rows[-1][1][-1].endswith(("，", "、")):
                        rows[-1][1][-1] += row.text
                    else:
                        rows[-1][1].append(row.text)
            if body and body[-1]:
                body.append("")
            body.append(table["caption"])
            body.append("")
            for name, items in rows:
                body.append(f"- {name}")
                for it in items:
                    body.append(f"  - {it}")
            body.append("")
            skip_to = end + 1
            continue
        if i == 0 and marker and ln.text == marker:
            prev = ln                   # 章の切れ目に置いた見出し自身は H1 と重複する
            continue
        is_head = (ln.depth == 0 and not ln.full and not ln.text.endswith("。")
                   and nxt is not None and nxt.prose_start and not SETSU.match(ln.text))
        if prose and not is_head:       # 版面幅まで届いた行の次は同じ段落の続き
            if prev is not None and prev.full and ln.depth == 0:
                prose.append(ln.text)
                prev = ln
                continue
            flush()
        elif prose:
            flush()
        if state["open"] is not None and ln.depth == 0 and not is_head and not SETSU.match(ln.text):
            body[state["open"]] += ln.text     # 表などを挟んで割れた段落の続きを本体へ戻す
            if ln.text.endswith("。"):
                state["open"] = None
            prev = ln
            continue
        m = SETSU.match(ln.text)
        if m:
            head(2, f"{m.group(1).translate(Z2H)}.{m.group(2).translate(Z2H)} {m.group(3).strip()}")
            prev = ln
            continue
        if SHOU.match(ln.text) and ln.depth == 0 and not ln.full:
            prev = ln                   # 章見出しは H1 と重複するので落とす
            continue
        if ln.prose_start:
            prose.append(ln.text)
            prev = ln
            continue
        if is_head:
            head(2, ln.text)            # 番号なし見出し（直後が字下げ段落・句点で終わらない）
            prev = ln
            continue
        d = ln.depth
        if d is None:
            flush()
            body.append(ln.text)
            body.append("")
            prev = ln
            continue
        wrapped = prev is not None and body and body[-1].lstrip().startswith("- ") and (
            (prev.full and prev.depth is not None and d > prev.depth)
            or (prev.depth == d and prev.text.endswith(("，", "、"))))
        if wrapped:
            body[-1] += ln.text         # 版面幅で折り返されたキーワードの続き
            prev = ln
            continue
        body.append("  " * d + "- " + ln.text)
        prev = ln
    flush()
    while body and not body[-1]:
        body.pop()
    meta = ["---", 'source: "ipej-cem-keywords-2026"', 'method: "pdf-text-layer"', "---", "", f"# {title}", ""]
    return "\n".join(meta + body) + "\n"


def render_toc(lines, title):
    meta = ["---", 'source: "ipej-cem-keywords-2026"', 'method: "pdf-text-layer"', "---", "", f"# {title}", ""]
    out = []
    for ln in lines:
        out.append(("  " * (ln.depth or 0) if ln.depth is not None else "") + "- " + ln.text)
    return "\n".join(meta + out) + "\n"


all_lines = read_lines()
starts = {}
for slug, _, marker in CHAPTERS:
    if marker is None:
        starts[slug] = 0
        continue
    starts[slug] = next(i for i, ln in enumerate(all_lines) if ln.text == marker and ln.page >= 2)

os.makedirs(OUT, exist_ok=True)
order = [c[0] for c in CHAPTERS]
for n, (slug, title, _) in enumerate(CHAPTERS):
    lo = starts[slug]
    hi = starts[order[n + 1]] if n + 1 < len(order) else len(all_lines)
    sel = all_lines[lo:hi]
    marker = dict((c[0], c[2]) for c in CHAPTERS)[slug]
    text = render_toc(sel, title) if slug == "00_目次" else render(sel, title, marker)
    with open(os.path.join(OUT, slug + ".md"), "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    print(f"  {slug}.md  版面行{len(sel):4d}  {len(text):6d} chars  (pdf p{sel[0].page}-{sel[-1].page})")
print(f"版面行 {len(all_lines)} を全章へ割当")
