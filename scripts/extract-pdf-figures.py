#!/usr/bin/env python3
"""
PDF→PNG図抽出スクリプト
指定したPDFページの指定領域をPNG画像として抽出する。

Usage:
    python3 scripts/extract-pdf-figures.py <pdf_path> <page_num> <output_path> [--crop top,left,bottom,right] [--dpi 200]

    page_num: 1-indexed PDF page number
    crop: normalized coordinates (0.0-1.0) for top,left,bottom,right

Example:
    python3 scripts/extract-pdf-figures.py input.pdf 523 output.png --crop 0.3,0.1,0.7,0.9 --dpi 200
"""

import sys
import argparse
import fitz  # PyMuPDF


def extract_figure(pdf_path, page_num, output_path, crop=None, dpi=200):
    doc = fitz.open(pdf_path)
    # Convert 1-indexed to 0-indexed
    page = doc[page_num - 1]

    if crop:
        # crop is [top, left, bottom, right] as normalized 0.0-1.0
        rect = page.rect
        top, left, bottom, right = crop
        clip = fitz.Rect(
            rect.x0 + left * rect.width,
            rect.y0 + top * rect.height,
            rect.x0 + right * rect.width,
            rect.y0 + bottom * rect.height,
        )
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat, clip=clip)
    else:
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat)

    pix.save(output_path)
    doc.close()
    print(f"Saved: {output_path} ({pix.width}x{pix.height}px)")


def main():
    parser = argparse.ArgumentParser(description="Extract figure from PDF page")
    parser.add_argument("pdf_path", help="Path to PDF file")
    parser.add_argument("page_num", type=int, help="Page number (1-indexed)")
    parser.add_argument("output_path", help="Output PNG path")
    parser.add_argument("--crop", type=str, default=None,
                        help="Crop region as top,left,bottom,right (0.0-1.0)")
    parser.add_argument("--dpi", type=int, default=200, help="Resolution (default: 200)")

    args = parser.parse_args()

    crop = None
    if args.crop:
        crop = [float(x) for x in args.crop.split(",")]
        if len(crop) != 4:
            print("Error: --crop requires 4 values: top,left,bottom,right")
            sys.exit(1)

    extract_figure(args.pdf_path, args.page_num, args.output_path, crop, args.dpi)


if __name__ == "__main__":
    main()
