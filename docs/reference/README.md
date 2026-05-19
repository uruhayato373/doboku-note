# docs/reference/ 索引

CLAUDE.md 本体に載せるには詳細すぎるが、特定の作業時に参照したいドキュメント群。CLAUDE.md は「判断の土台」、このディレクトリは「作業マニュアル」という役割分担。

## ファイル一覧

| ファイル | 内容 | いつ読むか |
|---|---|---|
| [content-authoring.md](./content-authoring.md) | MDX コンポーネント・過去問構造ルール・数式図表規約・モバイル視認性詳細・画像配信・frontmatter テンプレ | MDX を書く・編集するとき（`/pdf-to-mdx`, `/keyword-page`, `/review-mobile` 等） |
| [exam-content-policy.md](./exam-content-policy.md) | 試験別コンテンツ整備方針（整備方針差分表・執筆判断ガイド）+ コンテンツ別レビュー視点（レビュー視点表）+ 新資格追加手順 | PDF→MDX 変換・品質レビュー時（`/improve-article --mode verify`, `/pdf-to-mdx --exam civil-construction-1`, `/pdf-to-mdx --exam cem` 等） |
| [skills-registry.md](./skills-registry.md) | management / dev / content / ui / marketing / analytics / strategy / ads の全スキル一覧＋Phase 別運用メモ | 利用可能なスキルを探すとき、新スキル作成時に重複がないか確認するとき |
| [agents-registry.md](./agents-registry.md) | エージェント詳細表＋チーム連携パターン＋Generator/Evaluator 分離原則 | サブエージェントを呼び出すときの担当範囲確認、連携設計時 |
| [workflows.md](./workflows.md) | 推奨ワークフロー（週次運用・PDF→MDX 変換フロー・キーワードページ作成フロー・リスク評価）+ Phase 別ロードマップ | 週次運用・変換作業・キーワードページ作成時 |
| [book-list.md](./book-list.md) | Amazonアソシエイト紹介書籍リスト（資格別×用途別、ASIN/ISBN/用途/紹介先メモ）+ PA-API 移行ロードマップ | 書籍紹介を追加・更新するとき／PA-API 実装時の seed として |

## 読み方の原則

1. **CLAUDE.md 本体が真実源** — プロジェクトの目的・判断の土台・URL 設計・必須ルール・ハーネス設計原則は CLAUDE.md 側にある
2. **このディレクトリは作業時に都度 Read** — 毎ターンは読まれない。該当スキル実行時や具体的な手順確認時にだけ読み込む
3. **重複を避ける** — 同じ情報を CLAUDE.md と reference の両方に置かない。CLAUDE.md 側には「参照先」のみ記載し、実体はこちら

## 更新ルール

- **新スキル追加時** → `skills-registry.md` を更新、必要なら `workflows.md` も
- **新エージェント追加時** → `agents-registry.md` と CLAUDE.md のモデル指定クイックリファレンス表の両方を更新
- **新資格追加時** → `exam-content-policy.md` の整備方針差分表・レビュー視点表の両方に列を追加
- **コンテンツ品質ルール変更時** → `docs/reference/content-principles.md`（真実源）をまず更新し、`content-authoring.md` は参照として揃える

## CLAUDE.md との関係

CLAUDE.md の「リファレンス索引」セクションから各ファイルへリンクが張られている。逆参照はこのファイルを参照先として使うこと。
