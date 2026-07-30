# Codex/Claude 実施ログ：noteメンバーシップ導線の実装計画

> [!done]
> **2026-07-30 完了**：公開noteとローカル実装をPlaywrightで照合し、Claude Code用の実装作業票と一括実行プロンプトを作成した。今回は計画作成のみで、サイト・noteライブは変更していない。

## 背景

- noteプロフィールと加入ページは正常だが、高意図記事から加入ページへの直接リンクがなかった。
- `civil-membership-lab` はnoteで公開済みなのに、サイト側SoTでは `published:false`、`noteUrl:''` のままだった。
- 土木の公開済みnote記事191本（会員内記事を除く）のうち、合格ラボへの言及は5本、直接リンクは0本だった。
- 説明記事はソース上freeだが、ライブでは本文の大半が会員限定だった。

## 実施内容

- `.claude/plans/civil-note-membership-funnel-remediation-2026-07-30.md`
  - サイトSoT、描画条件、note記事6本、ライブ反映、回帰テスト、運用文書同期、停止条件を定義。
  - `published:true` だけでは二次ページへCTAが出ないため、土木secondaryの中間CTA対象化とinline順序の修正を必須化。
  - 新規会員記事の公開は、既存会員への配信を考慮して別承認ゲートに分離。
- `.claude/prompts/civil-note-membership-funnel-remediation.md`
  - Claude Codeへそのまま渡せる一括実行プロンプトを作成。

## 検証

```bash
git diff --check
rg -n "membership/join|civil-membership-lab" \
  .claude/plans/civil-note-membership-funnel-remediation-2026-07-30.md \
  .claude/prompts/civil-note-membership-funnel-remediation.md
npm run check-doc-refs
```

- `git diff --check`: 成功。
- 正式加入URL／商品IDの記載: 41件を確認。
- 文字化け `U+FFFD`／`﹖`／`�`: 0件。
- `npm run check-doc-refs`: 1,204ファイルを検査し、参照切れ0件。

コード、記事本文、noteライブを変更していないため、`type-check`、`note-lint`、ライブ更新検証は未実施。

## 後続メモ

- Claude Codeは `.claude/prompts/civil-note-membership-funnel-remediation.md` を入口にする。
- 実装仕様の正値は `.claude/plans/civil-note-membership-funnel-remediation-2026-07-30.md`。
- W1予想問題と添削事例の新規公開は、コア導線修正後にユーザーの明示承認を得てから行う。
- deployは今回も実装プロンプトの非スコープ。developで検証後、ユーザー判断で別途実施する。
