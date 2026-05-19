# 総監模範論文 品質評価マトリクス

最終更新: 2026-05-19（environment-survey 5本追加）
評価スキル: pe-essay-review v1.1
評価モード: deep（3視点 × 4項目 × 1〜10点）
詳細レポート: `.claude/state/pe-essay-review/{slug}.md`

---

## 評価結果一覧

| slug | 採点者 | OB | 講師 | 総合 | 致命的 | 優先度 | ステータス |
|---|---|---|---|---|---|---|---|
| r03-essay-general-contractor | 7.8 | 7.5 | 7.8 | 7.7 | 1 | Med | 未着手 |
| r04-essay-general-contractor | 8.3 | 7.5 | 8.3 | 8.0 | 1 | Med | 未着手 |
| r05-essay-general-contractor | 8.5 | 8.0 | 8.8 | **8.4** | 0 | Low | 未着手 |
| r06-essay-general-contractor | 7.8 | 8.0 | 7.5 | 7.8 | 2 | Med | 未着手 |
| r07-essay-general-contractor | 7.8 | 8.0 | 7.5 | 7.8 | 1 | Med | 未着手 |
| r03-essay-river-consultant | 7.8 | 7.5 | 7.5 | 7.6 | 1 | Med | 未着手 |
| r04-essay-river-consultant | 8.0 | 7.8 | 7.3 | 7.7 | 1 | Med | 未着手 |
| r05-essay-river-consultant | 8.3 | 8.0 | 7.8 | **8.0** | 0 | Low | 未着手 |
| r06-essay-river-consultant | 7.5 | 8.0 | 6.8 | 7.4 | 2 | Med | 未着手 |
| r07-essay-river-consultant | 7.8 | 8.3 | 6.5 | 7.5 | 2 | Med | 未着手 |
| r03-essay-road-municipality | 8.0 | 8.3 | 7.5 | 7.9 | 1 | Med | 未着手 |
| r04-essay-road-municipality | 8.0 | 7.8 | 8.0 | 7.9 | 0 | Med | 未着手 |
| r05-essay-road-municipality | 7.5 | 8.3 | 7.3 | 7.7 | 2 | Med | 未着手 |
| r06-essay-road-municipality | 7.3 | 8.0 | 6.8 | 7.4 | 3 | **High** | 未着手 |
| r07-essay-road-municipality | 7.0 | 8.0 | 6.0 | **7.0** | 3 | **High** | 未着手 |
| r03-essay-environment-survey | 7.8 | 7.3 | 7.5 | 7.5 | 2 | Med | 未着手 |
| r04-essay-environment-survey | 8.5 | 7.8 | 8.3 | **8.2** | 0 | Low | 未着手 |
| r05-essay-environment-survey | 8.8 | 8.0 | 8.5 | **8.4** | 0 | Low | 未着手 |
| r06-essay-environment-survey | 7.3 | 7.3 | 6.5 | 7.0 | 2 | Med | 未着手 |
| r07-essay-environment-survey | 7.5 | 8.0 | 7.3 | 7.6 | 0 | Med | 未着手 |

優先度判定: **High** = 総合 < 6.5 または 致命的 ≥ 3件 / **Med** = 総合 6.5〜8.0 または 致命的 1〜2件 / **Low** = 総合 ≥ 8.0 かつ 致命的 0件

---

## リライト優先度

### High（修正必須 — 2本）

| 順 | slug | 総合 | 致命的 | 主要課題 |
|---|---|---|---|---|
| 1 | r07-essay-road-municipality | 7.0 | 3件 | 設問(3)施策2本目が完全欠落 / 5管理外用語「品質管理」の使用 |
| 2 | r06-essay-road-municipality | 7.4 | 3件 | 設問(2)②「脱炭素・社会貢献の観点」欠落 / 設問(3)に2施策混在 |

### Med — 致命的2件（6本）

| 順 | slug | 総合 | 致命的 | 主要課題 |
|---|---|---|---|---|
| 3 | r06-essay-river-consultant | 7.4 | 2件 | 「施策を1つ取り上げ」要件違反 / 管理視点が同一分野内に収束 |
| 4 | r06-essay-environment-survey | 7.0 | 2件 | 設問(1)②「施策1つ」に複数列挙 / 「延べ20名→4名」数値がR03と完全一致（テンプレ流用） |
| 5 | r07-essay-river-consultant | 7.5 | 2件 | 「施策を1つ取り上げ」要件違反パターン / 講師視点で最低スコア（6.5） |
| 6 | r05-essay-road-municipality | 7.7 | 2件 | パターンA〜D選択宣言の欠落 / 戦略3の詰め込み過多 |
| 7 | r03-essay-environment-survey | 7.5 | 2件 | 「5,000万円規模の投資」が中小15名規模と乖離 / 「延べ20名→4名」削減率が楽観的 |
| 8 | r06-essay-general-contractor | 7.8 | 2件 | 「施策を1つ取り上げ」要件違反 |

### Med — 致命的1件（6本）

| 順 | slug | 総合 | 致命的 | 主要課題 |
|---|---|---|---|---|
| 9 | r03-essay-river-consultant | 7.6 | 1件 | 方法1でAI解析「現在利用可能」の根拠が薄い |
| 10 | r03-essay-general-contractor | 7.7 | 1件 | 設問固有制約の軽微な取りこぼし |
| 11 | r04-essay-river-consultant | 7.7 | 1件 | 三層構造の論理的なつながりの弱さ（講師視点7.3） |
| 12 | r07-essay-general-contractor | 7.8 | 1件 | 情報管理視点の相対的薄さ |
| 13 | r03-essay-road-municipality | 7.9 | 1件 | 設問(3)「技術実現可能性除外」制約への対応が曖昧 |
| 14 | r04-essay-general-contractor | 8.0 | 1件 | 5か年計画への6G通信組み込み（時間軸のズレ） |

### Med — 致命的0件（スコア改善余地あり、2本）

| 順 | slug | 総合 | 主要課題 |
|---|---|---|---|
| 15 | r04-essay-road-municipality | 7.9 | 「設計コンサルBIM能力認証制度」が発注者権限外の可能性 |
| 16 | r07-essay-environment-survey | 7.6 | 施策間トレードオフの多様性不足・R04との類似フレーム |

### Low（公開水準達成 — 4本）

| slug | 総合 | 備考 |
|---|---|---|
| r05-essay-general-contractor | 8.4 | SWOT 8項目使い切り・設問固有制約クリア。最高品質 |
| r05-essay-environment-survey | 8.4 | 「地域環境調査ネットワーク」という独自解決策・致命的問題なし |
| r04-essay-environment-survey | 8.2 | DXと「デジタル技術の利用」の境界明示・三層伏線回収が最高品質 |
| r05-essay-river-consultant | 8.0 | 致命的問題なし・設問構造への完全対応 |

---

## 横断的所見

### ペルソナ横断の共通課題

**1. 「施策を1つ取り上げ」要件の違反（最重要）**

R06・R07の複数ペルソナで、設問が1施策指定のところ複数施策を列挙する同一パターンのミスが確認された。Generatorが連続生成した年度で同じ読み取りエラーが再現している。リライト時に全年度の同一設問箇所を横断チェックすること。

**2. テンプレ語句の繰り返し**

以下の語句が複数年度・ペルソナを横断して出現し、複数論文を並べて公開した際に使い回し感が出るリスクがある。

| ペルソナ | 繰り返し語句 |
|---|---|
| general-contractor | 「自動化建機」「オペレーションセンター」「ISO準拠」 |
| river-consultant | 「ピア・サポート」（R03〜R07ほぼ全年度） |
| road-municipality | 「音声入力AI」「VR/ARで可視化」「近隣自治体との共同利用」 |

**3. 情報管理視点の相対的薄さ**

経済性管理・安全管理に比べ、情報管理の掘り下げが弱い年度がある（general-contractor R07、river-consultant R07）。

### ペルソナ別の強み

| ペルソナ | 強み | 弱み |
|---|---|---|
| general-contractor | R05が最高品質（8.4）。SWOT活用・設問構造対応が最も洗練 | 複数年度で「施策1つ」要件に甘さ |
| river-consultant | OB視点が全体的に高い（業界用語・プロセスのリアリティ） | 講師視点がR06・R07で落ちる（6.8・6.5） |
| road-municipality | ペルソナ設定（橋梁数・予算・役職）の一貫性が高い。発注者権限の施策組み込みも評価 | 年度後半（R06・R07）に致命的問題が集中 |
| environment-survey | 未評価 | — |

---

## リライト実施計画

### ステータス定義

| ステータス | 説明 |
|---|---|
| 評価待ち | pe-essay-review 未実施 |
| 未着手 | 評価完了・リライト未着手 |
| リライト中 | pe-essay-draft --mode revise 実行中 |
| 再評価待ち | リライト完了・再評価未実施 |
| 公開可 | 総合 ≥ 8.0・致命的 0件・ユーザー確認済み |

### 実施順

1. **environment-survey 5本を評価**（次セッションで実施）
2. **High 2本リライト**: r07-essay-road-municipality → r06-essay-road-municipality
3. **Med 致命的2件 4本リライト**: river-consultant R06/R07 → road-municipality R05 → general-contractor R06
4. **Med 致命的1件 6本リライト**: 順次
5. **Low 2本**: 現状維持（必要に応じて軽微修正）
6. **全本リライト完了後**: pe-essay-review で再評価 → ステータスを「公開可」に更新
