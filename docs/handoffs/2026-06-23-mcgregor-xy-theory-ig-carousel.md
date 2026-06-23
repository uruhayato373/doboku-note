# マクレガー X/Y 理論 IG カルーセル — Mac から投稿手順

**作成**: 2026-06-23 / **状態**: PNG・caption.txt 完成・develop 止まり → Mac からそのまま投稿可

## 成果物の場所（git）

```
docs/sns/instagram/cem/mcgregor-xy-theory/carousel/
  img/
    00-cover.png   # 1080×1350 表紙（navy 背景・キーワード名）
    01-figure.png  # 1080×1350 X/Y 理論比較図（site figure 再利用）
    02-text.png    # 1080×1350 試験頻出ポイント 3 点
    03-cta.png     # 1080×1350 doboku-note 誘導
  caption.txt      # IG 本文＋20 ハッシュタグ
```

ブランチ: **develop**（commit `aedab34b9` 直前の png commit に含まれる）

## caption.txt の内容（確認用）

```
マクレガーのX理論・Y理論を完全整理
技術士総監 人的資源管理の択一で頻出のテーマです。
▶ X理論（命令・統制型）
人間は本質的に仕事嫌い → 強制・命令なしでは力を発揮できない
▶ Y理論（参加・自律型）
人間は本来勤勉 → 自律・参加を促す管理が効果的
X理論とY理論の特徴が入れ替えられた選択肢に注意！否定形も頻出です。
詳しい解説と過去問演習は プロフィールのリンクから → doboku-note.com
---
#技術士 #総監 #技術士総監 #人的資源管理 ...（20個）
```

全文は `docs/sns/instagram/cem/mcgregor-xy-theory/carousel/caption.txt` を参照。

## Mac からの投稿手順

### 1. PNG をスマホに転送

```bash
# develop を pull（MacでもWindows develop と同じコミットが入っている前提）
git pull origin develop

# Finder で開く
open docs/sns/instagram/cem/mcgregor-xy-theory/carousel/img/
```

Finder で 4 枚を選択 → AirDrop でiPhoneに送るか、写真アプリに読み込む。

> Google Drive 経由の場合: drive.google.com の「doboku-note IG投稿」フォルダに 4 枚をドラッグ＆ドロップ → iPhone の Google Drive アプリからカメラロールに保存。

### 2. caption.txt をコピー

```bash
cat docs/sns/instagram/cem/mcgregor-xy-theory/carousel/caption.txt | pbcopy
```

クリップボードにコピー済みの状態で iPhone にハンドオフ、または Apple Notes などに貼り付けて使う。

### 3. Instagram アプリで投稿

1. IG アプリ → + → 投稿
2. 4 枚を **00-cover → 01-figure → 02-text → 03-cta** の順で選択（カルーセル）
3. 加工なし（フィルタなし）
4. キャプションを caption.txt から貼り付け
5. 投稿 → 技術士総監ハイライトに追加

## 関連

- サイトのキーワードページ: `/docs/mcgregor-xy-theory`
- SVG ソース: `docs/sns/instagram/cem/mcgregor-xy-theory/carousel/img/*.svg`
- スキル: `/ig-figure-pack`（次のパックを作るときに参照）
