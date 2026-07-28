# 引き継ぎ: note ライブのハッシュタグ一括反映（公務員層タグ）

**作成**: 2026-07-28 / **想定作業**: 別PCで夜間に実行 / **所要**: 約5時間（668件）

---

## 今夜やること（1コマンド）

```bash
node scripts/note-sync-tags.mjs --list .claude/state/note-tag-sync-targets.txt --commit > .tmp/tagsync-night.log 2>&1
```

ソースの `hashtags*.txt` は既に全748ファイルへ公務員層タグを追加済み（commit `38eb42c8c`）。**note ライブへの反映だけが残っている**。上のコマンドは live に足りないタグだけを追加する（本文・有料境界・カバーには触れない）。

> [!caution] PDF 添付の復旧を先に流す
> 同じ夜に [2026-07-28-note-pdf-attachment-recovery.md](2026-07-28-note-pdf-attachment-recovery.md) の作業がある。**同じ Playwright プロファイルを使うため並行実行するとプロファイルロックで片方が落ちる**。順番に流すこと。優先はPDF添付の復旧 —— タグは流入を増やす作業だが、添付は購入者が既に払った対価が届いていない状態なので。

### 実行前に必ず確認する3点

> [!warning] 別PCでは note のログインセッションが無い
> Playwright の永続プロファイル `.local/playwright-note-profile/` は **`.gitignore` されており git に入っていない**（`.gitignore:75`）。別PCでは空の状態から始まるため、そのまま実行すると account gate で止まる。
>
> **先に1回だけ手動ログインする**:
> ```bash
> npm run note-edit-session
> ```
> ヘッド付き Chrome が開くので画面で note にログインする（パスワードはスクリプトが扱わない）。以後セッションは userDataDir に永続化され、自動で再利用される。

1. **最新を取得**: `git pull origin develop`（対象リストとスクリプト修正が入っている）
2. **note ログイン**: 上記 `npm run note-edit-session` を1回（別PC初回のみ）
3. **PCがスリープしない設定**にする（スリープすると Playwright が止まる）

### 翌朝の確認

```bash
grep -c "API検証OK" .tmp/tagsync-night.log      # 成功件数（目標 600 前後）
grep -c "上限99で" .tmp/tagsync-night.log        # 満杯で入らなかった件数
npm run check-note-live-tags                    # ライブのタグ90未満が残っていないか
```

反映が進むと `.claude/state/note-republish-hashes.json` が更新される。**翌日これを commit すること**（次回の対象リスト再生成に効く）。

途中で止まっても安全。差分のみ追加する冪等な作りなので、同じコマンドを再実行すれば続きから進む。

---

## 背景（なぜこの作業が必要か）

ソースの `hashtags*.txt` は **748件すべて90個以上で完備**なのに、**note ライブは675本中250本（37%）が90未満**だった（0タグ19本・30〜59タグが214本）。ソースに書いてあっても note に載っていない状態が広範囲にあった。

長期間気づけなかったのは、タグを見る仕組みが3つとも live を見ていなかったから:

| 仕組み | 見ているもの | 穴 |
|---|---|---|
| `check-note-hashtags` | ソースの `hashtags*.txt` | ライブを見ない（ソースが完璧なので常に緑） |
| `check-note-republish` の `tagDrift` | ソースが記録時点から変わったか | **live を一切見ない**（`tagDrift=1` なのに live=0 が19本） |
| `check-note-structure` の `TAG_SHORT` | live タグ数（唯一の実測） | `sev:'INFO'` 固定で `--ci` ゲートに載らず誰も落とさない |

さらに **`note-sync-tags` 自体が壊れていた**。live タグの取得が Node `fetch` でプロキシに遮断され、全件 `[skip] API 取得失敗` → 「追加すべきタグなし（全て in-sync）」と表示して **exit 0**＝同期したつもりで1件も同期していなかった（commit `3e1f85349` で curl 化＋取得失敗>20%で exit 1 に修正済み）。

**再発防止は入れてある**: `check-note-live-tags`（新設・live 専用ゲート・週次CI）が今後は不足を検出して落とす。

---

## 未解決: ライブが99タグで満杯の記事

note のタグ上限は99。**ライブが既に99で埋まっている記事には公務員タグが入らない**（`[plan] … 上限99で25件は追加不可` と出てスキップされる）。

実機で DOM を確認した結果、**note 側では削除できる**ことが分かっている。各タグは `<button>` で、中に `aria-label="削除"` の × アイコン（`/icons/close.svg`）を持つ:

```html
<button class="sc-35e5f35-2 cFEPnm">#毎日note
  <span role="img" aria-label="削除"><svg data-src="/icons/close.svg">…
```

つまり note の制約ではなく、**`note-sync-tags` が追加しか実装していない**だけ。

### 対処案（未着手・翌日以降）

`note-sync-tags` に `--evict-generic` 相当を足す。既存の追加ロジックの前に「枠が足りなければ汎用タグ allowlist から必要数だけ削除」を挟むだけでよい。ソース側で既に同じ考え方を実装済み（`.tmp/add-koumuin-tags.mjs` の `GENERIC` セット）。

**削ってよいのは汎用タグだけ**。`note` / `毎日note` / `自己投資` / `キャリア` / `仕事` / `ビジネス` / `エンジニアの学び` など。記事固有の専門タグ（`締固め管理` `軟弱地盤対策` 等）は検索価値が高いので**絶対に削らない**——ソース側の初版は機械的に末尾から削ってこれらを落としており、allowlist 方式へ直した経緯がある。

まず翌朝のログで満杯記事が何件あるかを掴んでから着手する（規模が小さければ手作業でも足りる）。

---

## 同日の関連作業（完了済み・参考）

- 建設部門 note の送客リンク176件を是正（UTM欠落112・相対パス41・裸slug23）。**相対パスと裸slugの64件は note 上で実際にリンク切れ**だった。ライブ反映も完了（196/196）
- `FULL_LOCK` だった有料記事2本を復旧（無料プレビュー0字 → 897字/1,229字）
- 「検査ゼロで PASS」を返していたスクリプトを**5件**修正（`check-note-structure` / `check-note-site-utm` / `check-note-republish`・`audit-note-cards` / `check-note-live-headings` / `note-sync-tags`）
- メタゲート `check-gate-coverage` を新設（ゲート自身が壊れて0件検査になっていないかを監視・週次CI）

真実源: [note-api-verification.md](../../.claude/knowledge/reference/note-api-verification.md)「タグはソースとライブの2トラック」「メタゲート」

---

## 他に残っている作業（backlog 参照）

- **note-live-audit の疎通確認**（🔴高）— main マージ直後に `workflow_dispatch` で1回手動実行し、Actions から note API に届くか確認する。届かなければ CI 化を断念してローカル運用へ戻す
- **UTM バーンダウン114件** — `check-note-site-utm` の Windows パスバグを直した結果で露出した既存違反。記事ごとに `utm_campaign`/`utm_content` の設計が要り機械化できない
- **note ライブ本文の画像欠落3件** — `check-note-live-headings` の curl 化で初めて検出（`live=0/sot=2`）
