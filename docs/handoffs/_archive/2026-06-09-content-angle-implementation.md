# 引き継ぎ: コンテンツ角度（6 切り口）実装 — ローカルセッション用

**作成日**: 2026-06-09
**ブランチ**: `claude/wonderful-franklin-7qs37i`（doboku-note）
**前提**: 設計・ポリシー・定義の草案は本ブランチで完了・push 済み。**本書はレンダリングを伴うコード実装と目視検証をローカルで進めるための設計＋チェックリスト**。

> [!important] なぜローカルか
> この実装は PNG/動画レンダリングの目視検証が必須（`ig-carousel-qa` の必須要件）。リモート（web）環境には ffmpeg・@fontsource・VOICEVOX が無く、PNG を描画して目視できない。設計・定義編集まではどこでも同じだが、**レンダリング検証はローカルが前提**（理由は CLAUDE.md の計測ルールではなく、ツールチェーン非在）。

---

## すでに完了している（本ブランチ・push 済み）

| 種別 | 成果物 |
|---|---|
| 真実源ポリシー | `docs/reference/content-angle-policy.md`（6 切り口定義・資産マッピング・層別優先・チャネル相性・Red Line・`angle` パラメータ分業・slide-data 拡張・X 投稿型対応・パイロット） |
| 戦略 | `docs/project/03_SNS/01_SNS集客戦略.md` にフレームワーク節 + 改訂履歴 v7.2 |
| 配線 | `docs/reference/x-post-policy.md` §5 / `docs/reference/ig-carousel-skill.md` §6 に angle 対応 |
| 索引 | `CLAUDE.md` リファレンス索引に登録 |
| エージェント定義（草案） | `ig-carousel-writer`（angle モード執筆ルール）/ `x-post-writer`（`experience` 型 + 投稿型↔angle）/ `ig-carousel-qa`・`x-post-qa`（角度純度チェック）/ `agents-registry.md` 反映 |

---

## 実装方針: 2 段階（Phase 1 はコード改修ほぼゼロ）

### Phase 1 — 既存 C モード再利用（パイロット）

角度差別化は **編集（cover コピー + 本文骨子）が主**で、ビジュアルは既存の「C 単独 KW モード」スライド型（`notebook-cover` / `notebook-board` / `notebook-cta`、`slide-render.mjs` の dispatch に既存）でまかなえる。

- **renderer 改修: 不要**（notebook-* 型は汎用見出し＋本文を描画）
- **`ig-post-create.mjs`**: `--slug` 系 C モードで angle の slide-data.json を描画できるか確認。できれば **コード改修なしでパイロット可能**。
- **`meta.angle`**: slide-data.json に追加するメタ。描画には使わず、caption 生成・QA・後の集計が読む。スキーマに任意フィールドとして許容されているか（lint で弾かれないか）だけ確認。
- やること = ①`ig-carousel-writer` で `angle: counter` の slide-data 執筆（source: note「キーワード集が点にならない理由」）→ ②`ig-post-create` で PNG 化 → ③目視 + `ig-carousel-qa` 採点 → ④微修正。

### Phase 2 — 角度別専用ビルダー（パイロットが勝ったら）

角度ごとの専用ビジュアルが効果に効くと判明した場合のみ着手。

- 新規 `.claude/scripts/lib/sns-common/angle-slides.mjs` に角度別ビルダー（例: `buildCounterContrast`〔通説×反証の対比カード〕/ `buildNumberHero`〔大数字 + 出典〕）。
- `slide-render.mjs` の `buildElement` switch に `angle-*` ケースを追加（既存 quiz-*/notebook-* と同じ追加パターン）。
- デザインは `docs/design-system/instagram-carousel-tokens.json` に角度トークンを足す（インライン色禁止の既存規約に従う）。
- `ig-post-create.mjs` に `--angle <angle> --source <path>` フラグを追加（フォルダ命名 `{date}-{angle}-{topic}` + caption テンプレ切替）。**フラグを足したら `ig-post-create/SKILL.md` を同時更新**し、`skills-guide.md` も更新（CLAUDE.md §8）。

---

## パイロット（content-angle-policy §7）

| # | angle | チャネル | source | 計測 |
|---|---|---|---|---|
| P-1 | `counter` | IG Carousel | note「キーワード集が点にならない理由」 | 保存数 / リーチ（既存過去問パック平均と比較） |
| P-2 | `experience` | X | note 公務員クラスター（断片化） | プロフィール遷移 / リプライ |

判定: 既存過去問パックの平均保存数・リーチを上回れば週次運用へ角度配信を組み込む。

---

## ローカル着手チェックリスト

> [!todo] Phase 1（パイロット）
> - [ ] `git pull origin claude/wonderful-franklin-7qs37i`
> - [ ] `npm install`（`--legacy-peer-deps`、@fontsource 復元）
> - [ ] `content-angle-policy.md` を読む（§5 Red Line・§6.2 骨子）
> - [ ] P-1: `ig-carousel-writer` で `angle: counter` slide-data 執筆（notebook-* 型・`meta.angle: counter`）
> - [ ] `ig-post-create` で PNG 化 → `ig-carousel-qa` 採点（角度純度: 主角度 1 つ・反論骨子）
> - [x] P-2: `x-post-writer` で `type: experience`（公務員クラスター断片・断片まで・note 誘導・280 weighted）→ `x-post-qa`（2026-06-15 完了: `docs/sns/x/draft/059-pe-experience-公務員板挟み`・x-post-qa 3.0/3 合格・234 weighted。誘導は note 未公開のため当面サイト発注者ページ。実投稿→メトリクス比較はユーザー判断＝Phase 2 ゲート）
> - [ ] `meta.angle` が lint を通るか確認（通らなければ slide-data スキーマ lint を最小拡張）
> - [ ] 各成果物を即 commit（変更ファイルのみ明示 add）

> [!todo]- Phase 2（パイロットが勝った場合のみ）
> - [ ] `angle-slides.mjs` + `slide-render.mjs` dispatch に角度別ビルダー
> - [ ] tokens.json に角度トークン
> - [ ] `ig-post-create --angle/--source` + SKILL.md + skills-guide.md 更新

---

## 検証で「完了」と言える条件

- PNG が目視で角度骨子に沿う（cover が言い切り/「なぜ」/「〜は逆」等、本文が骨子順）
- `ig-carousel-qa` 角度純度 OK（主角度 1 つ・`experience` 断片まで・`number` 出典明記・verbatim なし）
- X は `check-x-length` 違反 0・`check-sns-urls` broken 0
- Red Line（content-angle-policy §5）逸脱なし

## 関連

- 真実源: `docs/reference/content-angle-policy.md`
- 戦略: `docs/project/03_SNS/01_SNS集客戦略.md`（フレームワーク節）
- 既存 renderer: `.claude/scripts/lib/sns-common/slide-render.mjs`（dispatch）/ `notebook-slides.mjs`（C モードビルダー）/ `quiz-slides.mjs`
