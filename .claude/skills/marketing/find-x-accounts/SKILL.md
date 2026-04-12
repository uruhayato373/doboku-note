---
name: find-x-accounts
description: X（旧Twitter）でトピック別に発信アカウントを収集・分析し、Markdownレポートに保存する。競合・インフルエンサー調査、フォロー候補の発見、noteやx-post戦略のインプットに使う。
---

# /find-x-accounts — X 発信アカウント調査

指定トピックについて発信している X アカウントを、Playwright MCP ブラウザで検索・収集し、`docs/marketing/x-accounts/{topic}.md` に保存する。

## 使い方

```
/find-x-accounts 技術士 総合技術監理
/find-x-accounts 1級土木施工管理技士
/find-x-accounts civil-engineering --limit 20
```

### 引数

| 位置 | 説明 | 例 |
|---|---|---|
| 1〜 | 検索キーワード（スペース区切りで AND 検索） | `技術士 総合技術監理` |
| `--limit N` | 収集件数上限（デフォルト 15） | `--limit 20` |
| `--topic slug` | 保存ファイル名のスラッグ（未指定ならキーワードから自動生成） | `--topic pe-comprehensive` |

## 前提条件

- **X のログインが必須**: X は未ログイン状態でユーザー検索・プロフィール閲覧が大半ブロックされる。スキルは「半自動」フローで動作する。
- Playwright MCP ブラウザが利用可能であること（`mcp__playwright__browser_*` ツール群）。

## 実行フロー

### Step 1: ブラウザ起動とログイン確認

1. `mcp__playwright__browser_navigate` で `https://x.com/home` にアクセス
2. `mcp__playwright__browser_snapshot` でログイン状態を判定
   - ログイン済み: タイムラインが表示される → Step 2 へ
   - 未ログイン: `/i/flow/login` にリダイレクト → **ユーザーに手動ログインを依頼**
     - 出力例: 「X がログインを要求しています。ブラウザで手動ログインしてから『続けて』と入力してください」
     - ユーザーが続行するまで待機

### Step 2: ユーザー検索の実行

1. 検索URLに直接アクセス: `https://x.com/search?q={encoded_keywords}&f=user`
   - URLエンコードは `encodeURIComponent` 相当で実装
2. `mcp__playwright__browser_snapshot` で検索結果を取得
3. 結果が 0 件の場合: キーワードを緩めて再検索（AND → OR、または主要語1つのみ）を提案しユーザー判断を仰ぐ

### Step 3: アカウント情報の抽出

検索結果のユーザーカードから、上位 `--limit` 件について以下を取得:

| 項目 | 取得元 |
|---|---|
| 表示名 | ユーザーカードの name 要素 |
| ユーザー名（@handle） | `/` 始まりのリンク |
| bio | カードの説明文 |
| 認証バッジ | あれば `verified` フラグ |

フォロワー数・直近ツイート傾向は、上位 5〜10 件のみプロフィールページを個別訪問して追加取得する（全件訪問は重いため省略）。

### Step 4: レポート生成

出力先: `docs/marketing/x-accounts/{topic}.md`

- `topic` は `--topic` 未指定時、キーワードをローマ字/英字化したスラッグ（例: `技術士 総合技術監理` → `pe-comprehensive-management`、該当カテゴリがあれば流用）
- ディレクトリが存在しなければ作成

### レポートテンプレート

```markdown
# X アカウント調査: {キーワード}

- 調査日: {YYYY-MM-DD}
- 検索クエリ: `{keywords}`
- 収集件数: {N}件

## サマリー

{全体の傾向を3〜5行で。発信ジャンル、主要アカウント層、密度など}

## アカウント一覧

### 1. {表示名} (@{handle})

- フォロワー: {N} / フォロー: {N}
- bio: {bio文}
- 発信傾向: {直近ツイートから読み取れるテーマを1〜2行}
- プロフィール: https://x.com/{handle}

### 2. ...
```

## 注意事項

- **Rate Limit**: X は短時間の大量アクセスで検索/プロフィール閲覧をブロックする。プロフィール個別訪問は上位 10 件までに抑える
- **プライベート情報は収集しない**: DM・非公開ツイート・連絡先情報は対象外。公開プロフィールとツイートのみ扱う
- **Playwright ブラウザは使い終わったら `mcp__playwright__browser_close` で閉じる**
- **既存ファイルがある場合**: 上書き前にユーザーに差分を提示し、追記/置換を確認する

## 使いどころ

- `/x-post` / `/note-post` でタグ付けやメンション先を決める前の事前調査
- 競合アカウント洗い出し（Phase 2 の competitor-audit と連携可能）
- フォロー戦略の初期リスト作成
