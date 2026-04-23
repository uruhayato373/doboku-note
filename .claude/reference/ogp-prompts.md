# OGP プロンプトリファレンス

doboku-note で採用する OGP テンプレ 5 種類の Midjourney プロンプト。背景画像を手動で生成する際に使用する。

- **OGP サイズ**: 1200×630（`--ar 1200:630`）
- **出力先**: `.claude/skills/conversion/ogp-create/assets/fonts/ogp-backgrounds/{template-id}.png`
- **文字なし** で生成すること。タイトル文字は satori 側で合成する
- プロンプトから `Enormous text "【タイトルをここに入力してください】"...` の行を削除して使う
- **セーフティゾーン意識**: 中央 630×630 の正方形は 1:1 クロップされる可能性があるプラットフォーム（note モバイル・Slack・Discord 等）で全要素が表示される領域。**被写体・重要なテクスチャは中央寄せ** にすること。左右 285px ずつは装飾専用でよい（クロップで消えて問題ない）
- 運用: 背景を差し替えたい場合はこのファイルを更新してから再生成

## テンプレ一覧

| テンプレ ID | デフォルト用途 | 背景画像の要否 | 出典 |
|---|---|---|---|
| `navy-white` | 汎用・既定 | 不要（CSS グラデーション） | 第 5 章 51 |
| `dark-wood` | 信頼性系（guide/textbook） | **必要** | 第 5 章 57 |
| `red-line` | 体系・構造系 | 不要（CSS で描画） | 第 6 章 66 |
| `blackboard` | 教育・解説系 | **必要** | 第 6 章 73 |
| `dark-grid` | 分析・データ系 | 不要（CSS グリッド） | 第 6 章 77 |

背景画像が必要なのは `dark-wood` と `blackboard` の 2 枚のみ。他は CSS のみで再現するため Midjourney 不要。

---

## プロンプト（背景のみ・文字なし）

### dark-wood（テンプレ ID: `dark-wood`）

```
A dark walnut wood grain texture filling the entire frame, rich brown tones with visible grain pattern. Warm, grounded, professional feel, no text, no objects, 8k, --ar 1200:630
```

**用途**: `civil-construction-1` + guide/textbook。信頼性・地に足ついた印象。

### blackboard（テンプレ ID: `blackboard`）

```
A dark green blackboard texture filling the entire frame, chalk dust visible, slight smudges. No text, no objects, no chalk pieces. Classroom aesthetic, clean framing, 8k, --ar 1200:630
```

**用途**: guide 系記事全般。教育・解説の定番メタファー。

---

## CSS のみで再現するテンプレ（背景画像なし）

以下の 3 テンプレは `.claude/skills/conversion/ogp-create/scripts/ogp-create.mjs` 内の satori element で完結する。Midjourney 生成は不要。

### navy-white（テンプレ ID: `navy-white`）

- 背景: `linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)` 相当
- 文字: 白、Noto Sans JP Bold、中央寄せ
- **出典プロンプト**:
  ```
  A deep navy blue gradient background, slightly textured like fine fabric. Enormous clean text "【タイトル】" in bold condensed white sans-serif font, centered, filling 70% of the frame width. The text has a very subtle soft white glow behind it. Nothing else. Minimalist, powerful, editorial magazine cover feel, 8k, --ar 1200:630
  ```

### red-line（テンプレ ID: `red-line`）

- 背景: ダークグレー `#1f2937`、中央に赤い水平線 `#dc2626`（太さ 6px）
- 文字: 白、赤線の上に重ねる
- **出典プロンプト**:
  ```
  A dark charcoal gray background with a single bold red horizontal line running across the center of the frame. Enormous text "【タイトル】" in bold white condensed sans-serif font, centered, filling 65% of the frame width, the red line passing behind the text. Minimal, structured, editorial, 8k, --ar 1200:630
  ```

### dark-grid（テンプレ ID: `dark-grid`）

- 背景: ダーク `#0f172a`、薄いグリッド線 `rgba(255,255,255,0.08)`（50px 間隔）
- 文字: 白、グリッドの上に重ねる
- **出典プロンプト**:
  ```
  A dark charcoal background with a subtle thin grid pattern in slightly lighter gray, like graph paper. Enormous text "【タイトル】" in bold white sans-serif font, centered, filling 65% of the frame width. The grid lines pass through and behind the text. Structured, analytical, data-driven feel, 8k, --ar 1200:630
  ```

---

## テンプレ追加の手順

新しいテンプレを追加するときは以下を更新する:

1. このファイル（出典プロンプトと用途）
2. `.claude/config/ogp/templates.json`（レジストリ）
3. `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs` の `renderers` に render 関数を追加
4. 必要なら `.claude/config/ogp/rules.json` にルール追加
5. 背景画像が必要なら `.claude/skills/conversion/ogp-create/assets/fonts/ogp-backgrounds/{id}.png` に配置
