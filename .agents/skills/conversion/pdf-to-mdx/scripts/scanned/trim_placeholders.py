# -*- coding: utf-8 -*-
"""
埋め込み済み図の直後に残る長い `（図: …）` プレースホルダ行を短縮する（本文の冗長さ解消）。

使い方:
  python trim_placeholders.py <WORK_ROOT> [--max 30]

  destDir の各章 .md について、**直前に `![..](img/..)` がある** `（図: …）` 行だけを
  `（図: 図番号＋先頭~max字）` に短縮する（画像があるので長い説明は不要）。
  埋め込みのない（未クロップの）図のプレースホルダは情報源として**そのまま残す**。
  冪等（短縮済み行を再短縮しても変わらない）。
"""
import sys, os, re, json, argparse

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('work'); ap.add_argument('--max', type=int, default=30)
    a = ap.parse_args()
    man = json.load(open(os.path.join(a.work, 'manifest.json'), encoding='utf-8'))
    dest = man['destDir']
    total = 0
    for ch in man['chapters']:
        p = os.path.join(dest, ch['pdf'] + '.md')
        lines = open(p, encoding='utf-8').read().split('\n')
        out = []
        for i, ln in enumerate(lines):
            s = ln.strip()
            prev = out[-1].strip() if out else ''
            if s.startswith('（図:') and re.match(r'^!\[[^]]*\]\(img/', prev):
                inner = re.sub(r'^（図:\s*', '', s).rstrip('）').replace('　', ' ')
                # 図番号＋先頭~max字に短縮（句点で切れれば優先）
                short = inner[:a.max]
                cut = re.split(r'[。、]', short)[0]
                if len(cut) >= 8:
                    short = cut
                newln = '（図: ' + short.rstrip(' ・') + '）'
                if newln != ln:
                    total += 1
                out.append(newln)
            else:
                out.append(ln)
        open(p, 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
    print('短縮したプレースホルダ:', total)

if __name__ == '__main__':
    main()
