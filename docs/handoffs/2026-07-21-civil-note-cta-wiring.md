# 2026-07-21/22 土木 note 導線配線 + lint負債解消 + UTM戦略併用（統合・デプロイ済）

## 発端の問い
「総監 note のテキスト記事を、土木施工管理でも note 有料展開できないか？（競合込みで）」

## 結論（調査5本の裏取り済み）
- 総監の「テキスト記事」= `tankan-reading-guide`（5管理テキスト精読ガイド ¥1,980・5本）。単純横展開は非推奨（Red Line #4 カニバリ・頻度型は `civil-1-ichiji-ronten` で充足済み）。
- **土木答案系は「品質」でなく「導線」で死んでいる**：`.claude/state/sales/sales-log.json` で civil 実売は実質1件（`civil-1-niji-marugoto-pack`）。末尾もくじ回遊は185本中7本のみだった。

## 完了（すべて main=develop `a1368c35a4` に統合・push・デプロイ済／HTTP 200検証）

> [!done] ソース修正（コミット済）
> - **CTA配線 178本**：`wire-note-funnel-cta --include-magazines` 追加＋手書きパックURL冪等化。経験記述系46本に冒頭パック上げ、178本に末尾もくじ回遊（7→185本）。学科系は既存CTA保持しskip。原則9 doc同期。
> - **lint負債解消**：複数行blockquote 72件→note-safe単一行（コールアウトはタイトル太字化・全文保持）。cover上段超過 36件→hi補足カッコ除去+hiSuffixタグライン除去（文字途中切断なし・工事名保持）。utm_medium=inline 86件→referral。
> - **UTM戦略的併用へ方針変更**（[02_チャネル動線設計.md](../project/03_SNS/02_チャネル動線設計.md) line108改訂）：主要CTA(本文)=インライン+UTM／補助送客(`## 関連リソース`節 or `<!-- card-ok -->`配下)=カード許可。`check-note-site-utm` を①article.md限定②カード許可判定に更新。civil 79件を仕分け（本文57件インライン化＝doc-meta-indexの正式タイトル使用／関連リソース22件カード維持）。
> - **統合**：他セッションの feature/work（著者オーソリティバナー）・pe-exam（戦略doc）を develop へマージ。feature ブランチは remote/local とも掃除済み（main/develop のみ）。

## 要ライブ反映（note.com 実機・"公開しなければいけない記事"＝取りこぼし注意）

> [!warning] これらは **ソースだけ直っていて live note は旧状態**。自動フラグされないのでこのハンドオフが唯一の追跡。
> ユーザーが次に note 記事を修正する時に**まとめて**反映するのが効率的（本人方針）。
>
> 1. **CTA 178本の反映** → `npm run note-append-cta`（追記方式）。ドリフト検出は `npm run audit-note-funnel -- --live`（D5）で機械確認できる **← これだけは自動追跡あり**。
> 2. **blockquote/cover/UTM の本文修正の反映** → 該当記事の**フル再公開**（`publish-note --update`）が必要。D5対象外＝機械追跡なし。対象＝§完了の72+36+57件が入った article.md（`git show a1368c35a4 --stat` と直近2コミットで特定可）。緊急度は低（旧状態でも表示は崩れない）が、再公開時に一緒に反映する。
> 3. **カバー画像の再生成 36枚** → cover の frontmatter タイトルは直したが実画像 `img/cover.png` は旧タイトルのまま。`generate-note-covers.mjs` で再生成→R2アップロード。**note 上のカバー差し替えは手動UI/republish**（自動不可＝[[note-ogp-card-no-delete]]）。
> 4. **P0-2 未公開疑い**：完全攻略パック `工事03/05/06/08/09`（frontmatter `noteUrl:""`）が [00-想定工事索引/article.md:52-63] で購入可能リンクとして配布。実機でリンク生存確認→切れていれば索引修正 or 公開。

## 未着手の商品強化（ソース側・ローカルで着手可）
- **P0-3 差別化の明示**：「元・地方自治体土木職（発注者）＋1級合格者本人」を `note-magazines.ts` の civil 6商品 description と主要記事導入部へ展開（別セッションがバナーで視覚部分は着手済＝`2026-07-21-author-authority-banner-live-reflect.md` 参照）。
- **P1 導入フック改善**：導入部「こんな人のための記事です」列挙→失敗談/Before→After型（[note-selling-structures.md:41]）。主力商品で型出し→バルク。
- **P2 無料00インデックス新設**：完成答案集・過去問模範答案集・2テーマ組合せ大全（自前のリード獲得入口が無い）。
- **B まとめノート型パイロット**：2級土木×安全管理・法規 ¥780（図解・一覧性で `gakka-kijutsu`/`anki-note` と非重複）。GO待ち。

## 追跡機構の所在（この先の判断用）
| 追跡対象 | 仕組み | 自動か |
|---|---|---|
| 公開状態（published/noteUrl） | `note-magazines.ts` ＋ `.claude/state/note-published.json` ＋ `verify-note-magazines` | ○ |
| CTA のソース先行/ライブ未反映 | `audit-note-funnel -- --live`（D5） | ○ |
| 本文(blockquote/cover/UTM)のライブ未反映 | **このハンドオフのみ** | ✗ |
| カバー画像の再生成要否 | **このハンドオフのみ** | ✗ |

## 技術メモ（再発防止）
> [!note]
> - 総監・建設部門の `topCta` は markdownリンク+¥で note-lint §14-c 衝突（53本）。civil は bare URL で準拠。総監/建設で magazines 配線するなら先に config.topCta を bare URL 化。
> - 既存コンテンツ負債は「編集した記事だけ」pre-commit で surface する（quotepath素通り解消後）。blockquote/cover/UTM は本セッションで civil article.md 分を解消済み。**内部doc（企画/設計/プラン/クラスター/README）の `> [!note]` コールアウトは正当**なので不変（lint も article.md 限定に変更済）。
> - 残る総監 article.md の utm-missing 2件（`記述式の書き方/article.md`）は別資格の既存債務・別対応。
> - 日本語パスは `git -c core.quotepath=false` 必須。着手時に `git branch --show-current` と origin遅れ確認。
