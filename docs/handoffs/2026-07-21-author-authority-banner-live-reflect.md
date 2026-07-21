# 2026-07-21 著者オーソリティバナー ライブ反映（継続タスク）

## 何をしているか

土木施工管理技士系 note 商品の差別化訴求として **著者オーソリティ汎用バナー**（総監=分析力／元発注者=採点者視点／施工管理技士=当事者）を新設し、ソースは 195 記事へ配置済み。**残タスク＝各 note 投稿への「ライブ反映」（`note-update-body --commit`）**。別セッションで継続する。

真実源: [author-authority-banner.md](../reference/author-authority-banner.md) / memory `project_author_authority_banner`。

## 完了済み（ブランチ `feature/work-2026-07-21`・ローカルコミット）

- バナー資産・render/distribute スクリプト・参照 doc・エージェント配線（`92d9529cd`）
- ソース配置: 入口25＋内部170＝**195 記事**の article.md に top/bottom 挿入（`92d9529cd`/`e565b1f31`）
- バナー軽量化 1.54MB→**363KB/1280幅**（`710828b6b`）＝CDN確定の高速化
- CDN確定待ち **30s→90s**（`330204183`・`scripts/lib/note-images.mjs`）＝ABORT激減
- CTAハンドオフ P0-3 更新（`0c9907dfc`）

> [!warning] ブランチ未 push・未マージ。継続は**このワークツリー（note ログイン済み Chrome のあるこの PC）**で行う。別マシンでやるなら先に push/PR が必要。

## ライブ反映 済み（約12記事）

- パイロット: `土木もくじ`（n4fde0f62dc20・目視確認OK）
- 先頭5の4件: 1級土木をAIで勉強する / 1級経験記述R6新形式 / 1級経験記述で落ちる答案 / 1級経験記述を自分の現場に置換
- バックグラウンド7件（noteId）: nd68f3f6b5f9e nec34238ca6d6 n6ec9bbbbe274 n7b59feb45494 nba82053b030f nf2567e725793 na84b001e827e

## 継続手順（そのまま実行可）

`note-update-body --list --commit` は**冪等**（反映済みを再実行しても同じ結果）。ABORT は無害（画像欠落を避け保存しないだけ）。**CDN確定は日により遅く、1パスでは終わらない → 複数パスで収束**。

```bash
cd C:/Users/m004195/doboku-note
git branch --show-current   # feature/work-2026-07-21 を確認

# 1) 公開済み(noteId有)でバナー配置済みの article.md リストを生成
: > .tmp/nu-list.txt
while IFS= read -r f; do
  grep -qE "^noteId:\s*['\"]?n" "$f" || continue
  printf '%s\n' "$f" >> .tmp/nu-list.txt
done < <(grep -rl "figure-author-authority.png" "docs/note/1級・2級土木" --include=article.md)
wc -l .tmp/nu-list.txt   # 約156件

# 2) 一括反映（Bashは10分上限のため run_in_background で・ログ確認）
node scripts/note-update-body.mjs --list .tmp/nu-list.txt --commit > .tmp/nu-batch.log 2>&1
#   進捗: grep -cE '^\[article\]' / 'ライブ反映完了' / 'ABORT' .tmp/nu-batch.log

# 3) 完了後 ABORT分だけ再実行（noteId→article.md を引き当てて再リスト化 or 全リスト再実行）
#    全リスト再実行が最も単純（済みは再確認・無害）。全件OKになるまで 2)〜3) を繰り返す。
```

## 前提・落とし穴

> [!note]
> - **note ログイン**: `channel:'chrome'`。account gate=dobokunote を実行時に自動 assert。
> - **API検証はプロキシで遮断**（`fetch failed`）→ ツールは「画像CDN確定＋"更新する"クリック」を成功シグナルにする。念のため**サンプル数本をブラウザで目視**（note.com はこのリポジトリの Browser ペインではポリシー遮断・実ブラウザで見る）。
> - **無料記事の --commit 自動確定**は今回**実動作を確認**（土木もくじ等 反映済み）。`--pause` は不要。
> - `--img-lenient` は使わない（画像欠落のまま保存する危険）。ABORT のまま再実行が正。
> - 各 article.md は独立 note 投稿。ソース編集だけでは live に出ない＝本反映が必要。

## 対象外・別タスク

- **未公開 ~38件**（noteId 無）: 先に note 公開が必要（`note-publish`）→ その後バナー反映。
- **カバー幅超過36件**（`check-note-cover-fit` SKIP無でバナー未配置）: frontmatter `cover.hi/hiSuffix` 短縮 → `node scripts/distribute-author-authority-banner.mjs --all` で配布 → 反映。一覧は `node scripts/check-note-cover-fit.mjs --all`。
- **textual 差別化**（P0-3 残）: `note-magazines.ts` civil description・導入部の散文差別化（[2026-07-21-civil-note-cta-wiring.md](2026-07-21-civil-note-cta-wiring.md) P0-3）。
