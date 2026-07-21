# 2026-07-21 土木 note 導線配線 + 既存答案強化 / まとめノート型パイロット

## 発端の問い

「総監 note のテキスト記事を、土木施工管理でも note 有料展開できないか？（競合込みで）」

## 結論（調査5本の裏取り済み）

- 総監の「テキスト記事」= `tankan-reading-guide`（5管理テキスト精読ガイド ¥1,980・5本、[note-magazines.ts:72-86](../../src/lib/note-magazines.ts)）。キーワードページ650本を出題頻度で体系化し、サイトへ送客する教科書型パッケージ。成立要因は ①頻度分析という加工 ②無料コンテンツへの送客 ③総監層の高WTP。
- **そのままの横展開は非推奨**。土木は guide/textbook 約94本を無料公開済みで、単純再パッケージは [noteコンテンツ計画.md §9.4](../note/1級・2級土木/noteコンテンツ計画.md) が Red Line #4（無料サイトとのカニバリ）で却下済み。頻度型テキストの枠は `civil-1-ichiji-ronten`（一次 出る順 ¥1,480）で既に埋まっている。
- 土木のテキスト/暗記帯は ¥500-1,500 の低価格衝動買いセグメント（どぼくじら暗記ノート¥500が実売500部超）。総監¥1,980の価格感度は通りにくい。自社も `civil-1/2-anki-note`（¥980/¥580）で接地済み。

## 重要な発見：土木答案系は「品質」でなく「導線」で死んでいる

- `.claude/state/sales/sales-log.json` 集計で **civil系の実売は全期間で実質1件**（`civil-1-niji-marugoto-pack` ¥11,800）。総監・建設部門は数十件。中身の品質は悪くない。
- 原因＝答案系マガジンに上げ/回遊導線が構造的に欠落（**末尾もくじ回遊は185本中7本のみ**だった）。

## 完了（このブランチ `feat/civil-magazine-cta-wiring`・commit `3320bf9c17`）

> [!done] P0-1 ソース配線（180ファイル・pre-commit通過）
> - `wire-note-funnel-cta.mjs` に `--include-magazines` 追加＋**手書きパックURLの実体冪等化**（二重化防止）
> - 末尾もくじ回遊：**7→185本**（178本追加）
> - 冒頭パック上げ：経験記述系 **46本**（完全攻略パック¥9,800／2級バンク）。既存手書き上げ87+37本はskip
> - 学科・一次系は既存の適切CTA（学科パック `mcfe1059b3335`/`m9a09a8982734`、まるごとパック `md29a34906314`）を保持しskip＝intentミスマッチなし
> - [note-funnel-architecture.md](../reference/note-funnel-architecture.md) 原則9 を同期（magazines も wire 可能に）

## 残タスク

> [!warning] 要ユーザー操作（note.com 実機ログイン）
> - **ライブ反映**：ソース配線は live note に自動反映されない。178本を `npm run note-append-cta` で反映するには実機操作＝ユーザーGoが必要。反映しないと配線は「ソースだけ生きてライブは死んだまま」。
> - **P0-2 未公開疑いの確認**：完全攻略パック `工事03/05/06/08/09`（frontmatter `noteUrl:""`）が [00-想定工事索引/article.md:52-63](../note/1級・2級土木/1級土木/magazines/1級土木-経験記述-完全攻略パック/00-完全攻略ガイド-想定工事索引/article.md) で購入可能リンクとして配布されている。実機でリンク生存を確認し、切れていれば索引側を修正 or 公開処理。

ローカルで着手可能（ソース側）:

- **P0-3 差別化の明示**：「元・地方自治体土木職（発注者）＋1級合格者本人」が [土木もくじ/article.md:27](../note/1級・2級土木/土木もくじ/article.md) にしか無い。`note-magazines.ts` の civil 6商品 description と主要記事の導入部へ展開。
  - **更新 2026-07-21（視覚部分 完了）**: 著者オーソリティ汎用バナー（総監=分析力／元発注者=採点者視点／施工管理技士=当事者）を新設し、土木 note **195記事**（入口25＋内部170）の top/bottom へ配置済み（commit `92d9529cd`/`e565b1f31`）。真実源 [author-authority-banner.md](../reference/author-authority-banner.md)、`civil-keiken-essay-writer`/`coconala-operator`/`civil-keiken-tensaku-drafter` に配線。**残**: ①textual 展開（`note-magazines.ts` civil description・導入部の散文差別化）②カバー幅超過36本へのバナー追加（カバー短縮後 `distribute-author-authority-banner.mjs --all` 再実行）③195記事のライブ再パブリッシュ。
- **P1 導入フック改善**：導入部が「こんな人のための記事です」の機能列挙のみ。[note-selling-structures.md:41](../reference/note-selling-structures.md) の失敗談→教訓／Before→After型へ差し替え（主力商品で型出し→バルク展開の順を推奨）。
- **P2 無料00インデックス新設**：完成答案集・過去問模範答案集・2テーマ組合せ大全は自前のリード獲得入口が無い（koji-bank/完全攻略パックにはある）。
- **B まとめノート型パイロット**（下記）。

## まとめノート型パイロット設計（1本・GO待ち）

| 項目 | 内容 | 根拠 |
|---|---|---|
| 対象 | **2級土木 × 安全管理・法規**（次点：品質管理） | 1級は無料 `secondary-*-basics` と4/5テーマで深く重複、2級は全テーマ概観レベルでカニバリ最小。安全管理は1級2級とも secondary 無料記事が存在しない |
| 差別化軸 | **図解・一覧性**（見て覚える）。既存 `gakka-kijutsu`＝答案の型の散文、`anki-note`＝一問一答、両者とも `figure-*.svg` 0件でフォーマット非重複 | 実読確認済み |
| 中身 | ①頻出論点のツリー/マトリクス図 ②数値・基準値一覧（手すり85cm・作業床幅40cm 等）③出る順ランキング図版。**赤シート暗記は anki-note と被るので入れない** | — |
| 価格 | **¥780**（civil-2-gakka単品¥480・anki¥580の上、競合 miyabi_labo ¥1,000-1,500 の下） | 09競合分析 |
| 注意 | 同テーマの無料/既存商品と論点は重複。オーナーが [計画.md:388](../note/1級・2級土木/noteコンテンツ計画.md) で既決の「カニバリは考慮せず計測して判断」路線と同じリスク | — |

技術基盤：図解SVGパイプライン（総監精読ガイドで稼働実績・`docs/note`全体で110点）が流用可能。

## 技術メモ（再発防止）

> [!note]
> - **civil の topCta は bare URL 単独行形式**（[note-funnel.json:59](../../.claude/config/note-funnel.json)）で note-lint §14-c 準拠。**総監・建設部門の topCta は markdownリンク+¥価格で §14-c 衝突（53本ブロック）**——civil とは別問題。総監/建設で magazines 配線するなら先に config.topCta を bare URL 化する必要。
> - 日本語パスは `git -c core.quotepath=false` を付けないと `git status`/カウントが素通りする。
> - 次スレッド着手時は必ず `git branch --show-current` と origin 遅れ確認。この作業は `feat/civil-magazine-cta-wiring`。develop への集約は PR。

## 次の一手（推奨順）

1. （1）P0-3差別化＋P1導入フックを主力商品（完成答案集5本）で型出し → バルク展開。いま配線した178本の"読ませる価値"を上げるのが先。
2. （2）まとめノート型パイロット2級安全管理を1本試作 → note計測。
3. ユーザー操作が取れるタイミングで ライブ反映（note-append-cta）＋ P0-2実機確認。
