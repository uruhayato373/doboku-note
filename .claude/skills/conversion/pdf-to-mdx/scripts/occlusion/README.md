# ページ画像の写り込み検出

自炊（手持ち撮影）のページ画像には指が写り込み、本文が隠れることがある。
**視覚OCRは隠れた文字を推測で埋めてしまい、出来上がった文が自然な日本語になるため
後段の校正では気づけない。** そこで OCR に入る前に候補を機械で挙げる。

```bash
python3 .claude/skills/conversion/pdf-to-mdx/scripts/occlusion/detect_occlusion.py            # 全冊
python3 .claude/skills/conversion/pdf-to-mdx/scripts/occlusion/detect_occlusion.py --book <id> # 1冊
```

紙面はほぼ無彩色なので、肌色域（色相・彩度・明度）の画素比率がしきい値を超えたページを
候補として挙げる。**候補＝本文が隠れている、ではない**（余白に写った指も拾う）。
最終判断は目視か視覚OCRが行う。

## 実測（2026-09-08・pe-cem-essay-guide）

18 枚中 16 枚が候補。目視で確かめると、実際に本文が読めないのは 16 版面中 9 版面（56%）。
記録は `content/sources/books/pe-cem-essay-guide__総監論文対策/README.md`。

## OCR 側の約束

- 読めない箇所は 〔判読不能〕 と書く。前後の文脈から埋めない
- 隠れている範囲が広ければ、その版面は撮り直しに回す
- 撮り直しでしか解消しない欠落を「OCR精度の問題」として扱わない
