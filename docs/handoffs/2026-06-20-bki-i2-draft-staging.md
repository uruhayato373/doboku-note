# BK-I 必須科目I R03/04/06/07 I-2 両収録版 ドラフト staging 完了 → カットオーバー手順

> [!done]
> **2026-06-20 ドラフト staging 完了**: BK-I R03/04/06/07 の「I-1・I-2 両収録版」を note ドラフトとして4本作成（`note-publish.mjs` DRAFT・/new paste で書式正確）。**公開も購入者影響もゼロ・完全可逆**。R03 ドラフトを DOM 検証＝H2全セクション/H3×16/太字×61/I-1・I-2 両解答存在で書式完璧を確認。残り＝下記カットオーバー（公開→マガジン入替→旧削除）を**ユーザーが note UI で実施**。

## 背景

ライブの BK-I R03/04/06/07 は **I-1 のみの単答版**（API remained ≈ 2100-2510）。ソース（`docs/note/技術士建設部門/magazines/BK-I_必須科目I/{R03,R04,R06,R07}/article.md`）は commit `a7a27e48c` で **I-1・I-2 両収録版**に補完済み。R05（`n7c4de5d27342`）は既に両収録ライブ（remained 3739）＝対象外。

**方式判断（2026-06-20）**: in-place type は I-2 が H3×12・太字×34 の richly formatted で**編集画面 paste 不可ゆえ書式崩れ確実** → `/new` 再作成を選択。ただし `/new` は note-publish の冪等ガード・旧記事の非公開/マガジン削除に自動化が無いため、**最安全の「ドラフト staging → 手動カットオーバー」**で進行（ユーザー選択）。

## staging 済みドラフト（公開待ち）

| 年度 | 新ドラフト noteId | 旧ライブ noteId（差し替え対象） | 境界検証 |
|---|---|---|---|
| R03 | `nb1ddc4eb7622` | `ne8b5b287351f` | boundaryBeforeExam=true |
| R04 | `n8d72cf82ca72` | `n61e459a3c541` | true |
| R06 | `n149dd5284f51` | `nf7881f25de47` | true |
| R07 | `n6cbd95df5aad` | `nffe6938dc40c` | true |

- マガジン: `m0f3bc3933454`（技術士 建設部門 必須科目I 模範解答集・¥3,480・**購入者1名 2026-06-14**）。旧 R03-R07＋R8予想6本を収録中。
- note-magazines.ts は個別記事 noteId を参照しない（マガジンのみ）→ SSOT 更新は各 `article.md` frontmatter のみ。
- **価格ドリフト注意**: frontmatter `price: 500` だがライブ全 BK-I 個別記事は **¥780**。公開時は ¥780 で揃える（R05 含め実効780）。frontmatter は staging では未変更（実ファイル無傷）。

## カットオーバー手順（ユーザー・note UI、1年度ずつ）

各年度 `新ドラフト` について:

1. **公開**: `https://editor.note.com/notes/<新ドラフトid>/edit` を開く → 「公開に進む」→ **有料 ¥780**を確認 → **有料エリア設定で境界が「試験問題」H2 直前**であること（staging で検証済み・要再確認）→ 「投稿する」。カバー・90タグは設定済み。**公開しても noteId は不変**（ドラフトid=公開後id）。
2. **マガジン入替**: 公開した新記事を `m0f3bc3933454` に追加し、**対応する旧記事を同マガジンから削除**（重複回避）。
   - 追加は自動化可: `node scripts/note-magazine-add-articles.mjs --target m0f3bc3933454 --notes nb1ddc4eb7622,n8d72cf82ca72,n149dd5284f51,n6cbd95df5aad --commit`（4本公開後にまとめて）。
   - **削除は自動化なし**＝note UI でマガジン編集から旧4本（ne8b5b287351f/n61e459a3c541/nf7881f25de47/nffe6938dc40c）を外す。
3. **旧記事**（任意）: 旧4本を非公開/下書きに戻す（公開 URL の古い単答版を消す）。販売中ゆえ note の警告を確認しながら。マガジン購入者は新版（マガジン経由）でアクセス継続。
4. **frontmatter 更新**（自動化可・依頼可）: 公開後、各 `article.md` の `noteUrl`/`noteId`/`notePublishedAt` を新IDへ更新してコミット。

> [!warning]
> **重複ウィンドウ**: 手順1-2 の間、マガジンに「旧単答＋新両収録」が一時的に併存。手順2で旧削除まで一気に行う。**新記事公開＝販売中商品ラインへのライブ変更**なので1年度ずつ検証しながら。

## 自動化資産 / 学び
- ドラフト staging 手法: 同ディレクトリに noteUrl/noteId 除去の `article-staging.md` を作成 → `note-publish.mjs --article <staging>`（DRAFT・writeBack は COMMIT 分岐のみなので frontmatter 無汚染）→ 削除。cover/hashtags は staging サフィックスで自動フォールバック。
- `/new` paste は H2/H3/太字を正確に再現（in-place type と決定的に違う）。
- 真実源: `docs/note/技術士建設部門/noteコンテンツ計画.md`・update-mode.md（[[../../.claude/skills/social/publish-note/references/update-mode.md]]）
