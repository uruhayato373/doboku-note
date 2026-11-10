# -*- coding: utf-8 -*-
"""
スキャン書籍(--scanned) PyMuPDF 経路 / 単ページスキャン本のページレンダリング＋バッチ計画。

pdfimages / ImageMagick が無い環境（会社 Windows 等）や、見開き2ページでなく
「1 PDF ページ＝1 書籍ページ・正立」のスキャン本で使う。各 PDF ページに埋め込まれた
スキャン画像を PyMuPDF で指定幅にレンダリングし、OCR ファンアウト用のバッチ計画
(manifest.json) を書き出す。

使い方:
  python render_pages.py <SRC_DIR> <WORK_ROOT> [--dest DEST_DIR]
         [--source-label "テキスト（土木一般編）"]
         [--width 2200] [--crop-width 2600] [--thumb-width 800]
         [--batch 6] [--fig-window 2] [--conf 0.55]

  SRC_DIR   : 章 PDF が並ぶディレクトリ（例 .../テキスト（土木一般編））
  WORK_ROOT : 一時作業ディレクトリ（C:\\tmp\\xxx-ocr 等。renders/manifest を置く）
  DEST_DIR  : 章 .md と img/ の出力先（既定 = SRC_DIR。原書 PDF の隣に置く慣例）

出力:
  WORK_ROOT/chNN/pXX.png   高解像度レンダ（OCR 用、--width）
  WORK_ROOT/out/           OCR ワークフローのバッチ md 置き場（空で用意）
  WORK_ROOT/manifest.json  下流スクリプト/ワークフローが読む全パラメータ

注意（今回の知見）:
  - 解像度が OCR 精度を左右する。1700px では密な漢字を誤読（例 リース料→リリース料、
    築造→施造）。本文 OCR は >=2200px を既定とする。
  - 着手前に1ページだけ Read して「単ページ・正立か / 見開きか」を必ず目視確認する。
    見開き(90度回転スプレッド)なら本スクリプトは使わず references/scanned-image-pipeline.md
    の pdfimages 経路（回転＋分割）を使う。
"""
import sys, os, glob, json, argparse, re

def chapter_title(base):
    # 第N章_タイトル -> "第N章 タイトル"（全角章番号は維持）。それ以外は basename。
    if '_' in base and base.startswith('第') and '章' in base.split('_', 1)[0]:
        head, tail = base.split('_', 1)
        return head + ' ' + tail
    return base

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('work')
    ap.add_argument('--dest', default=None)
    ap.add_argument('--source-label', default=None)
    ap.add_argument('--width', type=int, default=2200)
    ap.add_argument('--crop-width', type=int, default=2600)
    ap.add_argument('--thumb-width', type=int, default=800)
    ap.add_argument('--batch', type=int, default=6)
    ap.add_argument('--fig-window', type=int, default=2)
    ap.add_argument('--conf', type=float, default=0.55)
    a = ap.parse_args()
    import fitz

    src = a.src; work = a.work
    dest = a.dest or src
    label = a.source_label or os.path.basename(src.rstrip('\\/'))
    os.makedirs(os.path.join(work, 'out'), exist_ok=True)
    pdfs = sorted(glob.glob(os.path.join(src, '*.pdf')))
    if not pdfs:
        print('ERROR: PDF が見つからない:', src); sys.exit(1)

    chapters, batches = [], []
    for ci, p in enumerate(pdfs, start=1):
        base = os.path.splitext(os.path.basename(p))[0]
        cid = '%02d' % ci
        cdir = os.path.join(work, 'ch' + cid); os.makedirs(cdir, exist_ok=True)
        d = fitz.open(p); n = d.page_count
        if ci == 1:  # 構造チェック（単ページ・正立かの目安）
            im = d[0].get_images(full=True); r = d[0].rect
            orient = 'portrait' if r.height >= r.width else 'LANDSCAPE(見開き疑い)'
            print('[struct] ch1 p0: images=%d page=%dx%d %s' % (len(im), r.width, r.height, orient))
            if r.width > r.height:
                print('  !! ランドスケープ=見開きの可能性。pdfimages 経路(回転+分割)を検討')
        imgs = []
        for i in range(n):
            pg = d[i]; z = a.width / pg.rect.width
            fp = os.path.join(cdir, 'p%02d.png' % i)
            pg.get_pixmap(matrix=fitz.Matrix(z, z)).save(fp)
            imgs.append(fp)
        chapters.append({'id': cid, 'pdf': base, 'title': chapter_title(base), 'pages': n, 'dir': cdir})
        for bi in range(0, n, a.batch):
            batches.append({'chapterId': cid, 'chapterPdf': base, 'chapterTitle': chapter_title(base),
                            'batchIndex': bi // a.batch, 'firstPdfPage': bi,
                            'outFile': os.path.join(work, 'out', '%s__b%02d.md' % (cid, bi // a.batch)),
                            'images': imgs[bi:bi + a.batch]})
        print('ch%s %s: %dp -> %d batches' % (cid, base, n, ((n - 1) // a.batch) + 1))

    manifest = {
        'srcDir': src, 'destDir': dest, 'workRoot': work, 'sourceLabel': label,
        'renderWidth': a.width, 'cropWidth': a.crop_width, 'thumbWidth': a.thumb_width,
        'batchSize': a.batch, 'figWindow': a.fig_window, 'confThreshold': a.conf,
        'outDir': os.path.join(work, 'out'), 'thumbDir': os.path.join(work, 'thumbs'),
        'chapters': chapters, 'batches': batches,
    }
    json.dump(manifest, open(os.path.join(work, 'manifest.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print('total pages:', sum(c['pages'] for c in chapters), 'batches:', len(batches))
    print('manifest:', os.path.join(work, 'manifest.json'))

if __name__ == '__main__':
    main()
