---
name: psi-audit
description: >
  PageSpeed Insights API で代表ページを計測し、Core Web Vitals・Lighthouse スコアの
  しきい値違反と改善候補を出力する。`.Codex/config/psi-urls.txt` の URL に対し mobile+desktop で計測、
  performance-auditor エージェントが違反を surface する。
  Use when user asks to [PSI 計測, PageSpeed 計測, Core Web Vitals 確認, 速度監査, /psi-audit].
---

# /psi-audit — PageSpeed Insights 計測と改善候補抽出

代表ページの性能を PSI API で計測し、しきい値違反と改善候補をまとめるスキル。

## 実行トリガー

ユーザーが `/psi-audit` を実行した時。

## 設定の真実源

すべての運用パラメータは **`.Codex/config/psi-config.json`** に集約:

| 項目 | 初期値 | 変更する時 |
|---|---|---|
| しきい値（Perf < 70・LCP > 2.5s 等） | 上記ファイル参照 | サイトの成長に応じて引き上げ |
| 計測対象 URL | `.Codex/config/psi-urls.txt` | 新試験追加・テンプレ変更時 |
| Strategy | `mobile` + `desktop` | モバイルのみに絞るなら mobile だけに |
| 実行頻度 | 日次 JST 02:00（GitHub Actions） | `.github/workflows/psi-audit.yml` の cron |
| 通知 | しきい値違反時に CI を失敗させ GitHub 通知（.Codex/todo/ に手動起票） | 同 workflow の最終ステップ |

変更時は config を編集してから本スキルを再実行する。

## 前提

- `.env.local` に `PSI_API_KEY` が設定済み（GitHub Actions では Secret）
- 対象サイトが公開済み（PSI は localhost を計測できない — 本番の `doboku-note.com` を測る）

## 実行フロー

### ローカル実行（手動計測）

```bash
# 1. 計測実行（mobile + desktop）
npm run fetch-psi-audit

# 2. しきい値チェックして Markdown レポート出力
npm run psi-audit:check -- --output /tmp/psi-report.md
```

結果は `.Codex/state/metrics/psi/psi-batch-*.json` に時系列保存される。

### GitHub Actions（日次自動）

`.github/workflows/psi-audit.yml` が JST 02:00 に以下を実行:
1. `npm run fetch-psi-audit` で代表ページを計測
2. `npm run psi-audit:check` でしきい値判定
3. 結果を `develop` ブランチの `.Codex/state/metrics/psi/` に直接 commit（`[skip ci]` 付き、ci.yml を回さない）
4. しきい値違反があれば CI を失敗させて GitHub 通知（違反内容を .Codex/todo/ に手動起票）

必要な GitHub Secret:
- `PSI_API_KEY`（Google Cloud Console で発行した PageSpeed Insights API キー）

### 改善候補の抽出

計測後、`performance-auditor` エージェントを呼び出して違反パターンを surface する:

1. 最新の `psi-batch-*.json` を読み込み
2. `.Codex/config/psi-config.json` の `judgment` に従って判定する（**field(CrUX) が実害の判定源・lab は診断**）
3. 違反メトリクスごとに既知パターン（LCP 肥大・CLS 発生・INP 悪化等）にマッピング。**`lcp_element`（selector/snippet）から LCP 要素を特定して打ち手を分岐**する（`<img loading="lazy">` なら `check-lcp-image-hints`／テキストなら render-blocking 側）
4. `.Codex/state/improvements/psi-{YYYY-MM-DD}.md` に優先度付きで出力

> **判定原則（誤報防止）**: Critical は **field が AVERAGE/SLOW のときだけ**。lab は日次の振れが大きく、単発値・単発差分で Critical を立てない（field が FAST なら最大 Medium・回帰は直近5バッチ中央値）。真実源: [measurement-incidents.md](../../../knowledge/reference/measurement-incidents.md)「2026-07-27: lab と field の判定原則」。詳細な分業は [performance-auditor.md](../../../agents/performance-auditor.md)。

## 本スキルの実行手順

ユーザーが `/psi-audit` を実行したら、以下を順に実施する:

1. **計測済みデータの確認**
   - `.Codex/state/metrics/psi/` に最新ファイルがあるか確認
   - 24 時間以内のデータが無ければ `npm run fetch-psi-audit` を実行するか確認（PSI API は 1 URL 30秒かかるため時間がかかる旨を伝える）

2. **しきい値チェック**
   - `npm run psi-audit:check` を実行
   - exit code 1（違反あり）なら詳細を確認

3. **改善候補抽出**
   - `performance-auditor` エージェントを呼び出し
   - 出力 `.Codex/state/improvements/psi-{YYYY-MM-DD}.md` を Read して会話に表示
   - Critical / High の候補から着手

4. **実装（ユーザーと協議）**
   - 上位候補から 1〜2 件を Codex 本体（親エージェント）が実装
   - 実装後 `npm run fetch-psi-audit` で再計測
   - 効果確認

## 出力形式

画面表示（会話内）:

```
PSI 計測サマリー（YYYY-MM-DD）
- 対象: 20 URL × mobile+desktop = 40 計測
- しきい値違反: 3 件（Critical 1, High 2）
- 回帰検出: 1 件

Critical
1. LCP 肥大: /docs/... (mobile, 4.2s)
   → Hero 画像 priority 未指定の可能性

High
...
```

詳細レポートは `.Codex/state/improvements/psi-{YYYY-MM-DD}.md` にも保存。

## 注意事項

- **公開 URL のみ計測可能**: localhost は PSI API では測れない。ローカル最適化は Lighthouse CLI を使う
- **計測時間**: 1 URL あたり 20〜40 秒。20 URL × 2 strategy = 15〜25 分かかる
- **rate limit**: API キーなしで 400/100秒、キーありで 25,000/日。代表ページ運用なら余裕
- **URL リスト更新**: 新試験追加・主要テンプレ変更時は `.Codex/config/psi-urls.txt` に代表ページを追加
- **しきい値調整**: サイトが改善されたら `.Codex/config/psi-config.json` の閾値を引き上げて継続改善

## 関連

- `.Codex/scripts/fetch-psi-data.mjs` — PSI 計測本体
- `.Codex/scripts/psi-threshold-check.mjs` — しきい値比較
- `.Codex/agents/performance-auditor.md` — 違反検出・改善候補 Evaluator
- `.github/workflows/psi-audit.yml` — 日次自動計測
- `.Codex/config/psi-config.json` — 設定の真実源
- `.Codex/config/psi-urls.txt` — 計測対象 URL リスト
- `gsc-index-auditor` / `metrics-analyzer` エージェント — GSC 側の監査（index coverage / performance、PSI とは独立して実行）
