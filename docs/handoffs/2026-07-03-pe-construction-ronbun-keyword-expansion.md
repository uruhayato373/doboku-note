# ハンドオフ: 技術士建設部門 論点キーワード拡充・回遊網整備（2026-07-03）

別PC継続用。このセッションで完了した内容と、やり残し（別PCで着手可）をまとめる。

> [!note]
> **拾い方**: 別PCで `git pull origin develop` 後、下記「やり残しタスク」の該当項目に着手する。タスクは `docs/todo/backlog.md` にも登録済み（このハンドオフは着手開始時に `docs/handoffs/_archive/` へ退避してよい）。

## 完了したこと（本番反映済み・develop=main=`8949d66b3`）

### 1. 反映方針の再々確定（SSOT）
- 運営者が「本書は著作権に問題ない（権利保有）」と明言 → **逐語文章の積極活用＋書籍スキャン図のクロップ埋込**へ転換（2026-07-03）。
- 真実源: `docs/textbook/技術士（建設部門）/論文対策キーワード/README.md` 方針ブロック／`docs/reference/image-policy.md`「運営者権利保有書籍の例外」。
- 手法の真実源: `docs/handoffs/_archive/2026-06-22-pe-construction-verbatim-reflection.md`（図クロップ手順・逐語スプライス・クリーン化チェックリスト）。

### 2. 必須科目I 6テーマの書籍全文スプライス＋図＋校正
- 対象: `.local/r2/posts/pe-construction/{shakai-shihon,iji-kanri,bousai-genseigai,ninaite-dx,chiiki-dukuri,datsutanso-kankyo}-ronbun-keyword/article.mdx`
- 各記事へ出典 textbook（`docs/textbook/技術士（建設部門）/論文対策キーワード/0N_*.md`）のキーワード解説を**機械スプライス**で全文収録（約190KB→約1MB）。
- 書籍スキャン図28枚をクロップ→webp化して `<ArticleImage>` で埋込（出典caption付き）。
- **通し校正 約60件**（sonnetワーカーが確実な誤字修正・疑義保留 → 親が定型句/制度名のドメイン知識で裁定）。

### 3. 回遊網の整備（2段階・本番でリンク到達を実測確認済み）
- **必須科目I 6テーマ**: 相互リンク網（各記事に兄弟5＋ハブ1の流入）＋ハブ `pe-construction-guide-required-essay` 双方向。→ 横断が有効なので相互リンク採用。
- **選択科目 3記事**（road / river-coast / urban-planning）: 縦の導線のみ（ハブ `pe-construction-pe-secondary-essay-guide` ↔ 記事＋必須科目Iへ橋渡し）。→ 独立トラックなので相互リンクは意図的に不採用。

### 4. 計測復活の同時デプロイ
- 別セッションの GA SSR復活（#350）も同時に main へ昇格済み。回遊改善の効果は GA4/GSC で追える。

## 確立した再利用可能な手法（次の科目/試験でそのまま使える）

> [!tip]
> **機械スプライス方式**（LLM打ち直しは逐語を崩すのでスクリプトで構造的に保証）:
> 1. textbook の `#### (N) …` ブロックを行範囲で機械抽出→記事の対応 H2 配下へ差し込む。
> 2. 除去: `<!-- p.NN -->` ページマーカー / `（図:…）` / `図の出典:` / `資料）`。
> 3. `![図NN](img/figNN.png)` → 対応 `<ArticleImage>` に置換。
> 4. **図クロップ**: `sharp` で `extract` トリム（指写り・傾き・前後本文除去）→ `Read` で目視確認→微調整→`webp({quality:82})`。
> 5. **クリーン化**: 4列以上表→箇条書き / 骨子案・素案の陳腐化是正（第6次社会資本整備重点計画・第3次交通政策基本計画＝**令和8年1月16日閣議決定済み**）/ 書籍内部参照「本章第N節」→サイト内参照。
> 6. **逐語ガード**: 増補分に出典との45字以上連続一致が無いことを Python で機械確認。
> 7. 検証: `node .claude/scripts/validate-mdx.mjs <file>` / U+FFFD=0。

## やり残しタスク（別PCで着手可）

### A. 選択科目キーワード集の欠落科目を補完 🟢（backlog登録済み）
- 現状: 選択科目は11分野中3分野（道路/河川砂防海岸/都市計画）のみ整備。
- 残: geotechnical（土質基礎）/ 鋼構造コンクリート / 港湾空港 / 電力土木 / 鉄道 / トンネル / 施工計画 / 建設環境 の8分野を需要順に新規作成。
- **新規作成すればハブ `pe-secondary-essay-guide` の「選択科目別 論点キーワード」節に追記するだけで同じ回遊導線に自動で乗る**（ハブに「順次拡充予定」と明示済み）。

### B. 選択科目3記事の within-specialty インラインリンク 🟢（低優先）
- road / river-coast / urban-planning は現在アウトバウンド内部リンクが薄い（縦の導線のみ）。本文中の専門キーワードから同分野の個別キーワードページへリンクを張ると回遊がさらに深まる。本文精読を伴うので別スコープ。

### C. 逐語スプライス方式の他試験への横展開 🟡
- 1級土木 施工管理・法規編 textbook → サイト拡充は別 backlog 項目（`docs/todo/backlog.md` の該当節）＋別セッションの `recover/civil1-textbook-expansion` ブランチで進行中。統合判断が必要。

## 環境・運用メモ（別PC移行時の注意）

> [!warning]
> - 本セッションはメイン worktree が別セッション占有中だったため、**sparse worktree `C:/tmp/dn-doc`（develop）** で全作業した。別PCではメイン worktree が使えるので通常運用でよい。
> - **デプロイは origin ref 間 ff 昇格**で実施（`git push origin <develop-sha>:refs/heads/main`）。main ⊂ develop を `git merge-base --is-ancestor` で確認してから push。`--force` 不使用。
> - インデックス（backlinks 等）は **CI build 冒頭で refresh-indexes が走る**のでローカル commit 不要。
> - `develop` は複数セッション/PCが並行 push する。着手前に `git fetch && git merge --ff-only origin/develop`、push 前に巻き込み確認。
> - 一時 worktree `C:/tmp/dn-doc` は本PC専用。別PCでは新規に作業ツリーを使う。

## 現在の状態

- develop = main = `8949d66b3`（本番反映済み・doboku-note.com / .pages.dev で全リンク到達確認済み）。
- 論点キーワード9記事すべて `published: true`＋本番200。
