# ハンドオフ｜建設部門 単品価格 ¥500→¥780 値上げ

## 状況

建設部門（BK系）マガジン収録記事の単品価格を ¥500 → ¥780 に値上げする作業。

## 完了済み

1. **SoT 更新済み**: `src/lib/note-magazines.ts` の価格表記を `単品¥780` に変更（コミット済み）
2. **スクリプト作成済み**: `scripts/note-article-price-sweep.mjs`
3. **エージェント作成済み**: `.claude/agents/note-operator.md`
4. **dry-run 確認済み**: 8マガジン・143記事が対象

## 残作業

### note.com での実価格変更

```bash
# 1. ログインセッション確認（必要なら再ログイン）
npm run note-edit-session

# 2. 価格変更実行
node scripts/note-article-price-sweep.mjs --pattern pe-construction --price 780 --commit
```

**対象**:
- `pe-construction-required-magazine` (必須I) — 11記事
- `pe-construction-road-magazine` (道路) — 24記事
- `pe-construction-river-coast-magazine` (河川砂防) — 18記事
- `pe-construction-urban-planning-magazine` (都市計画) — 18記事
- `pe-construction-geotechnical-magazine` (土質基礎) — 18記事
- `pe-construction-steel-concrete-magazine` (鋼コン) — 18記事
- `pe-construction-construction-planning-magazine` (施工計画) — 18記事
- `pe-construction-environment-magazine` (建設環境) — 18記事

**合計**: 143記事 × ¥500→¥780

### 変更後の検証

```bash
npm run verify-note-magazines -- --contents
```

## 背景

- 建設部門は単品が売れてマガジンが売れない（科目分散のため）
- 総監とは異なる価格戦略が必要
- 単品値上げで収益性を改善
