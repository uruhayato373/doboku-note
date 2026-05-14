# デザインレビュー（design-review）— SNS 元素材

- 作成: 2026-04-30
- 種別: キーワード解説ライン #5（Tier 1 SVG 15 本連動）
- 元ネタ: `.local/r2/posts/pe-comprehensive-management/design-review/article.mdx`
- 関連 SVG: `.local/r2/posts/pe-comprehensive-management/design-review/img/dr-stages.svg`
- 用途: x.md / instagram-carousel.md / youtube-shorts/ の派生元（真実源）
- 親計画: [29_SNS投稿カレンダー2026Q2.md](../../../../project/sns/calendar-2026q2.md)

## 派生媒体

- [X 用原稿（5 ツイート）](./x.md)
- [Instagram Carousel 用原稿（1 投稿 10 スライド）](./instagram-carousel.md)
- [YouTube Shorts スクリプト（1 本・40 秒）](./youtube-shorts/)

---

## 1. キーワードの核心

**デザインレビュー（DR: Design Review）** とは、製品のライフサイクル全体を考慮し、設計の各段階で設計内容の妥当性を **体系的・計画的に審査する活動**。

設計者以外の関係部門（製造・品質・保全・調達等）が参加し、多角的な視点から設計品質を検証する。

**位置づけ**: 技術士総合技術監理キーワード集 2026 の **2.1 事業企画**。経済性管理ピラーの設計管理 4 手法（デザインレビュー / コンカレントエンジニアリング / フロントローディング / デザインイン）の品質ゲート役。

**関連キーワードページ**: [https://doboku-note.com/docs/pe-comprehensive-management-design-review](https://doboku-note.com/docs/pe-comprehensive-management-design-review)

## 2. 実施段階（DR0〜DR4）

| 段階 | 名称 | 審査対象 |
|---|---|---|
| DR0 | 企画段階 | 製品コンセプト・仕様の妥当性 |
| DR1 | 基本設計 | 基本設計の技術的成立性 |
| DR2 | 詳細設計 | 製造容易性・信頼性 |
| DR3 | 試作・評価 | 試作品の評価結果 |
| DR4 | 量産移行 | 量産準備の完了状況 |

段階が進むにつれて審査対象が **抽象から具体へ** 移行する。

## 3. 設計管理 4 手法における位置づけ

DR は他 3 手法（フロントローディング・コンカレントエンジニアリング・デザインイン）が生み出す設計成果を **各段階で検証する品質ゲート** として機能する。

- **コンカレントエンジニアリング** で並行進行する各工程の節目に DR を設定
- **フロントローディング** で前倒し検討した結果を DR で確認
- **デザインイン** によるサプライヤー参画も DR の場で行われる

## 4. 引っかけポイント（試験で狙われる）

1. **市場投入直前の最終検査と混同**: DR は **設計の各段階で計画的に行う体系的審査**。市場投入直前の最終検査ではない。
2. **設計者単独の確認と混同**: DR は **設計者以外の関係部門が参加** する多角的審査。設計者の自己確認ではない。
3. **JIS Z 8115 の定義**: ディペンダビリティ用語として正式に定義されている。
4. **DR0 〜 DR4 の段階区分**: 5 段階（企画・基本・詳細・試作・量産）の順序を入れ替える誤りに注意。

## 5. 過去問引用

総監キーワード集 2.1 事業企画では、設計管理 4 手法（DR / CE / フロントローディング / デザインイン）が頻出。DR は **品質ゲート機能** として理解する。

**典型出題パターン（オリジナル）**:

> デザインレビューに関する次の記述のうち、最も不適切なものはどれか。

選択肢の中で「市場投入直前に行う最終検査」「設計者だけが行う」のような誤った定義が頻出。

## 6. 関連キーワード

- [コンカレントエンジニアリング](https://doboku-note.com/docs/pe-comprehensive-management-concurrent-engineering)
- [フロントローディング](https://doboku-note.com/docs/pe-comprehensive-management-front-loading)
- [デザインイン](https://doboku-note.com/docs/pe-comprehensive-management-design-in)
- [信頼性設計・保全性設計](https://doboku-note.com/docs/pe-comprehensive-management-reliability-maintainability-design)
- [経済性管理ピラー](https://doboku-note.com/docs/pe-comprehensive-management-economic-management-pillar)

## 7. 派生展開のヒント

### X（5 ツイート構成）

1. **定義** — DR とは何か（体系的審査）
2. **5 段階** — DR0〜DR4 の審査対象
3. **品質ゲート** — 4 手法の中での位置づけ
4. **引っかけ** — 最終検査との混同に注意
5. **CTA** — 関連キーワードページへ誘導

### Instagram Carousel（10 スライド）

1. 表紙
2. 定義（DR とは）
3. 5 段階の概要図解（既存 SVG `dr-stages.svg` 流用）
4. DR0 + DR1 詳細
5. DR2 + DR3 詳細
6. DR4 + 全体まとめ
7. 設計管理 4 手法の中での位置づけ
8. 引っかけポイント
9. 関連キーワード
10. CTA

### YouTube Shorts（1 本・40 秒）

- 0-5 秒: 問題提起（「DR の 5 段階、答えられますか」）
- 5-15 秒: DR0〜DR4 の紹介
- 15-18 秒: 沈黙
- 18-30 秒: 解説（品質ゲート機能、4 手法との関係）
- 30-40 秒: CTA

## 8. SVG 利用方針

**既存 SVG**: `dr-stages.svg`（DR0〜DR4 の 5 段階フロー、品質ゲート可視化）

**SNS への転用**:
- IG Carousel Slide 3 で全面表示（4:5 portrait の中央配置）
- YT Shorts 中盤（18-30 秒）で静止画スライドとして挿入
