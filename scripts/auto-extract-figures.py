#!/usr/bin/env python3
"""
PDF→PNG 自動図抽出スクリプト
caption_y（キャプションのy座標正規化値）から自動的に図領域を切り出す。

Usage:
    python3 scripts/auto-extract-figures.py <config_json>
"""

import json
import sys
import os
import fitz  # PyMuPDF


def extract_figure_region(doc, config, output_base, dpi=200):
    """Extract a figure from a PDF page based on caption y-position."""
    page_idx = config["pdf_page"] - 1
    page = doc[page_idx]
    rect = page.rect

    caption_y_norm = config.get("caption_y")
    if caption_y_norm is None:
        print(f"  ERROR: No caption_y provided")
        return False

    height_ratio = config.get("height_ratio", 0.18)
    direction = config.get("direction", "above")
    include_caption = config.get("include_caption", True)

    # Calculate caption y in page coordinates
    caption_y = rect.y0 + caption_y_norm * rect.height
    caption_h = rect.height * 0.02  # Approximate caption text height

    fig_height = rect.height * height_ratio

    if direction == "above":
        bottom = caption_y + caption_h + 5 if include_caption else caption_y - 5
        top = caption_y - fig_height
    else:
        top = caption_y - 5 if include_caption else caption_y + caption_h + 5
        bottom = caption_y + caption_h + fig_height

    # Clamp to page bounds
    top = max(rect.y0 + 5, top)
    bottom = min(rect.y1 - 5, bottom)

    # Horizontal margins
    left = rect.x0 + rect.width * 0.06
    right = rect.x1 - rect.width * 0.06

    clip = fitz.Rect(left, top, right, bottom)
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, clip=clip)

    output_path = os.path.join(output_base, config["output"])
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    pix.save(output_path)
    print(f"  OK: {output_path} ({pix.width}x{pix.height}px)")
    return True


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 auto-extract-figures.py <config_json>")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        data = json.load(f)

    pdf_path = data["pdf_path"]
    output_base = data.get("output_base", ".")
    dpi = data.get("dpi", 200)
    figures = data["figures"]

    print(f"Processing {len(figures)} figures from {pdf_path}")
    doc = fitz.open(pdf_path)

    success = 0
    fail = 0
    for i, fig in enumerate(figures):
        print(f"[{i+1}/{len(figures)}] {fig['output']}")
        try:
            if extract_figure_region(doc, fig, output_base, dpi):
                success += 1
            else:
                fail += 1
        except Exception as e:
            print(f"  ERROR: {e}")
            fail += 1

    doc.close()
    print(f"\nDone: {success} success, {fail} failed")


if __name__ == "__main__":
    main()
