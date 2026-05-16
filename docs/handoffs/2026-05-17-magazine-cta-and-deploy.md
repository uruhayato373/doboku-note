---
title: 2026-05-17 note 有料マガジン CTA インフラ + AI 検索最適化 + deploy セッション引き継ぎ
date: 2026-05-17
session_focus: site → note 動線整備 (frontmatter 駆動 CTA + llms.txt + 4 ペルソナカバー) + deploy blocker 解消 + 本番デプロイ
related_strategy: docs/note/19_note段階投下プラン.md
related_memory: project_note_magazine_infra
---

# 2026-05-17 セッション引き継ぎ

## 何が起きたか（1 行）

GA4 で note.com → site が異常に良質（21u/14d・engagement 76%・12分滞在）だが逆向きの導線が pillar/keyword しかなかったため、frontmatter 駆動の note 有料マガジン CTA インフラを実装して 8 種類の配置パターンに拡張し、AI 検索向け llms.txt も配置して本番デプロイまで完了した。

## 本セッションの commit

| Commit | 種別 | 内容 |
|---|---|---|
| `7aa91f551` | feat | note 有料マガジン CTA infra: data layer + page.tsx + llms.txt |
| `37ff1adb1` | site | 白書テーマ群 W6 前倒し: 過去問逆リンク + magazine 配置拡張 + mlit-whitepaper-2025 SeeAlso fix |
| `cade20701` | site | 白書テーマ仕上げ (並行エージェント): 5 ピラー×7 テーマ動線 + primary 逆リンク 135 件 |
| `e593fd42d` | chore | tags.json に 4 タグ追加で lint LOW warning 解消 |
| `042bb5429` | feat | 4 ペルソナマガジン用カバー画像 (1280×670 T06) + scripts/generate-magazine-covers.mjs |

push: `develop` → `main` (`281fc0466`) → Cloudflare Pages デプロイ完了 (run #25960654435 success)

## 本番反映済みの内容

1. **note 有料マガジン CTA インフラ** — `src/lib/note-magazines.ts` + `src/lib/magazine-placement.ts` で frontmatter 駆動
2. **8 種類の配置パターン**:
   - `pillar` (5 本) → 精読ガイド ¥7,800
   - `keyword` (600+) / `keyword-2026` → 精読ガイド
   - `pattern-essay-{persona}` (4 本) → 該当ペルソナ模範論文
   - `r0X-essay-{persona}` (16 本、`published: false` あり) → 該当ペルソナ模範論文
   - `r0X-secondary` (R01-R07、7 本) → 全 4 ペルソナ模範論文 + 精読ガイド sidebar
   - `essay-exam-strategy` → 精読ガイド + 全 4 ペルソナ
   - `mlit-whitepaper-2025` (白書ハブ) → 精読ガイド + 全 4 ペルソナ (強 CTA)
   - `essay-mlit-*` (7 テーマ記事) → 精読ガイド + テーマ別ペルソナ
3. **`public/llms.txt`** — AI クローラー導線、openai 45u + chatgpt 10u /14d の流入質向上を狙う
4. **4 ペルソナカバー画像** — `public/images/magazines/essay-{river-consultant,general-contractor,environment-survey,road-municipality}-cover.{png,webp}` (1280×670 T06 mono-tag)
5. **13 ページの hub-spoke 逆リンク** — r03-r07 secondary 5 本 + 8 キーワードページから白書テーマ記事へ
6. **mlit-whitepaper-2025 deploy blocker 解消** — `<SeeAlso items={[...]} />` の API 誤用を MDX bullet list に書き直し

## 公開待ち（運営者作業）

**4 ペルソナマガジンは原稿完成済み・カバー画像準備済み・サイト側 CTA インフラ完成済み**。残る作業は note.com 上の公開だけ。

### 公開手順

1. note.com で 4 ペルソナ × 5 年分マガジンを作成
   - `docs/note/magazines/総監模範論文-河川コンサル/R03-R07/article.md` を 5 本投稿
   - 同様に ゼネコン (5 本) / 環境調査 (5 本) / 道路発注者 (3 本 = R05-R07)
2. カバー画像アップロード: `public/images/magazines/essay-{persona}-cover.png` (deploy 後 `https://doboku-note.com/images/magazines/essay-{persona}-cover.png` で取得可能)
3. 4 マガジン URL を取得
4. `src/lib/note-magazines.ts` の対応エントリで:
   ```ts
   'essay-river-consultant-magazine': {
   -  published: false,
   -  noteUrl: '',
   +  published: true,
   +  noteUrl: 'https://note.com/dobokunote/m/XXXXXXXX',
     ...
   }
   ```
5. commit → `/deploy` → 全配置先 (約 35 ページ) に CTA が即時表示

### 期待効果

- pattern-essay-{persona} (4 ハブ) / r03-r07-secondary (7 ページ) / essay-exam-strategy / 白書テーマ 8 ページ = **約 20 ページに新規 CTA 出現**
- 既存トラフィック上位: keyword-2026 (89u/14d)・category page (61u)・r07-secondary (34u) → 直接 CTA 露出は無いが、回遊先で必ず CTA 接触
- マガジン単価 ¥1,980 × 想定 10 部/月/マガジン × 4 = **月 ¥79,200** がベースライン期待値

## 補足

### キーとなる気づき

1. **既存インフラの活用が最強**: `MagazineInlineCard` / `MagazineSidebarCard` がすでに存在し、`page.tsx` で 3 箇所使われていた。新規コンポーネント作成なしで宣言的設定への置き換えのみで完了。
2. **frontmatter 駆動の防御**: `published: false || noteUrl === ''` で getMagazine() が null を返すため、note 未公開のマガジンは自動的に非表示。配置ルールだけ事前に書いておけば、公開時に運営者が `note-magazines.ts` 1 ファイル変更するだけで全 CTA が同時出現。
3. **mlit-whitepaper-2025 deploy blocker は誤った component API**: `<SeeAlso items={[...]} />` (RelatedKeywords の API と取り違え) で `<Link href={undefined}>` 500 エラー。コミット message に「auth destructure」と出るが実体は Next.js Link の prop validation。

### 並行エージェントとの競合

セッション中に別エージェントが `magazine-placement.ts` に mlit テーマ配置を追加 (commit `37ff1adb1`)、`tags.json` を更新 (commit `e593fd42d`)。git stash と pop で衝突が発生したが解消済み。今後並行作業時は **1 機能 = 1 エージェント** の原則を守る。

### 残る作業

1. **Phase 4 (P-01 暗記カード PDF ¥980)** — note 段階投下プラン Phase R-0 の最後の柱。受験期ピーク (6 月) までに着手判断
2. **r03-r06 secondary 解説充実** — r07-secondary (34u/14d) と同等まで引き上げ
3. **カバー色バリエーション** — 現状 4 ペルソナとも同色 (シアン+ネイビー)。将来的にペルソナ別アクセント色で視認性向上 (今は MVP)
4. **note 公開後の deploy 連動** — 運営者作業の commit + `/deploy` フロー
