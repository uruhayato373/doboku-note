# -*- coding: utf-8 -*-
"""
スキャン PDF を「1 PDF ページ = 1 JPEG」に展開する（ページ番号がファイル名で分かる形）。

render_pages.py が OCR 用の一時レンダ（作業ディレクトリ・PNG・章単位）を作るのに対し、
こちらは**原書の隣に残す成果物**を作る。ファイル名は既存の図クロップ（pageNNN_figN.png）と
同じページ番号体系に揃え、桁を 3 桁ゼロ埋めしてソート順を壊さない。

使い方:
  python pdf_to_page_images.py <PDF> [--dest DIR] [--quality 0] [--max-width 0] [--dry-run]

  --dest      既定 = PDF と同階層の pages/
  --quality   0（既定）= 埋め込み JPEG をそのまま取り出す（再エンコードなし・劣化なし）
              1-100 を指定すると再エンコードして縮める
  --max-width 0（既定）= 縮小しない。指定すると長辺基準で縮小（OCR は >=2200px 推奨）

埋め込み画像が 1 枚でないページ（合成ページ・図が別レイヤ等）は、ページ全体を
200dpi でレンダリングして JPEG 化する（取りこぼしを黙って作らない）。
"""
import argparse, io, os, sys

import fitz  # PyMuPDF


def extract(pdf_path, dest, quality, max_width, dry_run):
    doc = fitz.open(pdf_path)
    os.makedirs(dest, exist_ok=True)
    passthrough = rendered = 0
    total_bytes = 0

    for i in range(doc.page_count):
        page = doc[i]
        imgs = page.get_images(full=True)
        out = os.path.join(dest, f"page{i + 1:03d}.jpg")

        data = None
        if len(imgs) == 1 and quality == 0 and max_width == 0:
            info = doc.extract_image(imgs[0][0])
            if info["ext"] in ("jpeg", "jpg"):
                data = info["image"]
                passthrough += 1

        if data is None:
            # 再エンコード or 合成ページ: ページ全体をラスタライズする
            zoom = 200 / 72
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
            if max_width and pix.width > max_width:
                pix = page.get_pixmap(matrix=fitz.Matrix(max_width / page.rect.width,
                                                         max_width / page.rect.width))
            data = pix.tobytes("jpg", jpg_quality=quality or 85)
            rendered += 1

        total_bytes += len(data)
        if not dry_run:
            with open(out, "wb") as f:
                f.write(data)

    doc.close()
    return doc.page_count if False else (passthrough + rendered), passthrough, rendered, total_bytes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--dest")
    ap.add_argument("--quality", type=int, default=0)
    ap.add_argument("--max-width", type=int, default=0)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    dest = a.dest or os.path.join(os.path.dirname(a.pdf), "pages")
    n, passthrough, rendered, size = extract(a.pdf, dest, a.quality, a.max_width, a.dry_run)
    print(f"{os.path.basename(a.pdf)}: {n} ページ -> {dest}"
          f"（埋込JPEG そのまま {passthrough} / 再レンダ {rendered}） {size / 1048576:.1f} MB"
          + ("  [dry-run]" if a.dry_run else ""))


if __name__ == "__main__":
    main()
