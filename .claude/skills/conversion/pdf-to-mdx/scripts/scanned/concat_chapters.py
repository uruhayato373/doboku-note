# -*- coding: utf-8 -*-
"""
OCR ファンアウト後のバッチ md を章単位に連結し、章別 .md ＋ README 索引を書き出す。

使い方:
  python concat_chapters.py <WORK_ROOT>

  WORK_ROOT/manifest.json（render_pages.py 出力）と WORK_ROOT/out/NN__bMM.md を読み、
  manifest.destDir に 章別 .md ＋ README.md を書く。

正規化:
  - 3桁節（## N.M.K）の見出しを #### へ降格
  - 3連以上の空行を 1 行に圧縮
  - 確認済みの系統 OCR 誤読を一括補正（SUBS。書籍ごとに増やしてよい）
  - H1（章名）＋ `> 出典:` ブロックを付与
  - U+FFFD（文字化け）件数を検査（0 を確認）

注意（今回の知見）:
  - 図は本スクリプトでは扱わない（プレースホルダ `（図: …）` のまま）。
    図クロップは prep_figures.py → figure_bbox.workflow.js → crop_embed_figures.py。
  - 市販書籍スキャンは内部リファレンス専用＝公開しない旨を README に明記する。
"""
import sys, os, re, glob, json

# 確認済みの系統 OCR 誤読（book 横断で観測。新しい本で誤読を確認したら追記）
SUBS = [('施造', '築造')]

def main():
    work = sys.argv[1]
    man = json.load(open(os.path.join(work, 'manifest.json'), encoding='utf-8'))
    dest = man['destDir']; label = man['sourceLabel']; out = man['outDir']
    os.makedirs(os.path.join(dest, 'img'), exist_ok=True)

    rows = []; total_fix = 0
    for ch in man['chapters']:
        cid, base, title = ch['id'], ch['pdf'], ch['title']
        bfiles = sorted(glob.glob(os.path.join(out, '%s__b*.md' % cid)))
        body = '\n\n'.join(open(b, encoding='utf-8').read().strip() for b in bfiles)
        body = re.sub(r'(?m)^## (\d+\.\d+\.\d+)', r'#### \1', body)
        body = re.sub(r'\n{3,}', '\n\n', body)
        for a, b in SUBS:
            total_fix += body.count(a); body = body.replace(a, b)
        header = '# %s\n\n> 出典: %s %s\n\n' % (title, label, title.split(' ')[0])
        full = header + body.strip() + '\n'
        open(os.path.join(dest, base + '.md'), 'w', encoding='utf-8', newline='\n').write(full)
        pages = [int(x) for x in re.findall(r'<!-- p\.(\d+) -->', full)]
        rng = 'p.%d〜p.%d' % (min(pages), max(pages)) if pages else '—'
        rows.append((base, title, rng, len(full), full.count('（図:'), full.count('�'), len(bfiles)))
        print('%s.md  %d字  図%d  U+FFFD=%d  (%dバッチ)' % (base, len(full), full.count('（図:'), full.count('�'), len(bfiles)))
    print('系統誤読補正:', total_fix, '/ 総字数', sum(r[3] for r in rows),
          '/ 総U+FFFD', sum(r[5] for r in rows))

    # README 索引
    L = ['# %s — 文字起こし索引\n' % label,
         '> [!warning] 内部リファレンス専用（公開禁止）',
         '> 市販テキストのスキャンを視覚OCRで文字起こしした**内部参照用**。二次検定writer・経験記述・キーワードページ執筆の**根拠SSOT**として参照する。MDX化・note転載など**公開はしない**（著作権）。\n',
         '## 章別ファイル\n',
         '| ファイル | 章 | 印字ページ | 字数 | 図(プレースホルダ) |', '|---|---|---|---|---|']
    for r in rows:
        L.append('| [%s.md](%s.md) | %s | %s | %s | %d |' % (r[0], r[0], r[1], r[2], format(r[3], ','), r[4]))
    L.append('| **計%d章** | %s | — | **%s** | **%d** |\n' %
             (len(rows), label, format(sum(r[3] for r in rows), ','), sum(r[4] for r in rows)))
    L += ['> [!note] 図カラムは図クロップ埋め込み後に実埋込数へ更新する（crop_embed_figures.py の出力）。\n',
          '## 文字起こし方法\n',
          '- PyMuPDFで全%dページを幅%dpxにレンダリング → `scanned-textbook-transcriber` に%dページ/バッチ（全%dバッチ）でファンアウト高解像度OCR。'
          % (sum(c['pages'] for c in man['chapters']), man['renderWidth'], man['batchSize'], len(man['batches'])),
          '- 各バッチが逐語転記した`.md`を章順に連結し、H1＋出典ブロックを付与。3桁節（N.M.K）の見出しを`####`へ降格。',
          '- 確認済みの系統誤読（%s）を一括補正。U+FFFD（文字化け）は全章0件。' % '・'.join('%s→%s' % (b, a) for a, b in SUBS),
          '\n## 既知の限界（要注意・原文ママ前提）\n',
          '> [!note] LLM-OCRのため**字句は近似**。正確な引用は必ず原典PDFで照合すること。',
          '- **字句の誤読**: 高解像度でも漢字の誤読が残りうる（補正済の系統誤読以外にも取り違えが残存しうる）。',
          '- **密な段落の言い換え/節落ち**: 数値・手順・規格値が詰まった段落で言い換え・脱落が生じうる。**数値・規格・寸法の一字一句は原典PDFで確認**。',
          '- **図のクロップは自動bbox**: 領域はLLM自動判定。隣接本文が一部入る／稀に範囲がずれる。原典PDFが最終的な正。',
          '- **ページ番号**: `<!-- p.NN -->` は原書の印字ノンブル。図版頁等で連番が飛ぶ／稀に誤番がある。\n']
    open(os.path.join(dest, 'README.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(L))
    print('README.md 作成:', os.path.join(dest, 'README.md'))

if __name__ == '__main__':
    main()
