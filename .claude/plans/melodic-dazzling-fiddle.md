# 422件 未採点キーワードページのバルク採点

## Context

Phase G-5 で weighted<2.0 の 62 件をリライト完了。しかし残り 422 件はまだ Tier 2（5軸ルーブリック）で未採点。これらの中に不合格ページがどれだけあるかを把握し、AdSense 再申請の前提（thin content ゼロ化）を確認する。

422 件を個別に cem-qa エージェントで採点すると 70+ バッチ × 数分 = 数時間かかり非現実的。**機械的に採点可能な部分を自動化**し、判断が必要な部分だけ cem-qa に回す。

## 現状分析

- 未採点: 422 件
- body_chars 1000-2000: 299 件（現セッションでリライトした 20 件と同規模）
- lint HIGH > 0: 119 件（mobile/principle 軸で減点の可能性大）
- candidate_score 7-9: 292 件（機械スクリーン上位 = 構造は比較的良好）

## 方針: 自動採点スクリプトの作成

### 5軸を機械的に採点するロジック

| 軸 | 重み | 機械判定の方法 | 判定根拠 |
|---|---|---|---|
| **構造 (30%)** | 0.30 | frontmatter 6項目の存在確認 + セクション順序（`とは` → サブ節 → `位置づけ` → `参考資料`）のパターンマッチ | 全セクション揃い=3, 軽微ズレ1=2, 欠落1=1, frontmatter不備=0 |
| **モバイル (25%)** | 0.25 | `lint-mdx-mobile.mjs` の HIGH/MEDIUM カウント | HIGH=0 & MED≤2: 3点, MED 1-2: 2点, HIGH 1 or MED≥3: 1点, HIGH≥2: 0点 |
| **原則 (20%)** | 0.20 | lint カテゴリ 9-x（ExamPoint 個数・位置・禁止パターン）の結果 | 9-x 違反ゼロ=3, 軽微配置ズレ=2, 混在=1, 9-1/9-3/9-5 違反=0 |
| **参考資料 (15%)** | 0.15 | 参考資料セクションのリンク数 + ドメイン分類（go.jp/or.jp/ac.jp = 公的、その他 = 民間） | 公的+民間 各1以上=3, 片方のみ=2, 1件のみ or トップページ=1, なし=0 |
| **関連付け (10%)** | 0.10 | frontmatter `section` の存在 + 本文の内部リンク数 + `位置づけ` セクションの存在 | section一致 & リンク3+: 3点, リンク1-2: 2点, section不一致: 1点, 欠落: 0点 |

### 実装ステップ

#### Step 1: `scripts/bulk-score.mjs` 作成

- `.local/r2/posts/pe-comprehensive-management/*/article.mdx` を全件走査
- `quality-scores.json` に既にあるページはスキップ
- 上記5軸の機械判定を実行
- 結果を `quality-scores.json` にマージ（既存データを上書きしない）

#### Step 2: lint-mdx-mobile.mjs を活用

- bulk-score.mjs 内から `lint-mdx-mobile.mjs` のロジックを import して使う
- または子プロセスで実行して結果をパース

#### Step 3: 結果集計・レポート

- 全422件のスコア分布を出力
- weighted < 2.0 の件数（= 要リライト候補）を特定
- weighted < 2.0 のページ一覧を表示

#### Step 4: スポットチェック（cem-qa）

- 自動採点で borderline（weighted 1.8-2.2）のページから 10 件をランダムサンプル
- cem-qa エージェントで手動採点し、自動採点との乖離を確認
- 乖離が大きければ判定ロジックを調整

## 対象ファイル

| ファイル | 操作 |
|---|---|
| `scripts/bulk-score.mjs` | **新規作成** — バルク自動採点スクリプト |
| `.claude/state/quality-scores.json` | **更新** — 422件の採点結果を追記 |
| `.claude/scripts/lint-mdx-mobile.mjs` | **読み取りのみ** — lint ロジック参照 |

## 検証

1. `node scripts/bulk-score.mjs` を実行 → 422 件全件にスコアが付くこと
2. `quality-scores.json` の pages 数が 224 + 422 = 646 前後になること
3. weighted < 2.0 の件数を確認
4. cem-qa スポットチェック 10 件で自動採点との乖離が ±0.3 以内であること
