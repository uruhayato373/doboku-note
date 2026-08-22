# Codex 実施ログ：GitHub Actions 全復旧

> [!done]
> **2026-08-21 再開・push 済み**：Windows PC で再開手順を実行し、実行可能な検証を通したうえで通常コミットを追加して `develop` へ push した。CI（Linux）の Pre-merge が権威。**main 反映と workflow 再実行はユーザー判断のため未実施**。

> [!warning]
> **再開手順の「ローカル全量検証」は Windows では成立しない**（2026-08-21 実測）。`quality:audit:ci` は orchestrator 新設以来 Windows で 53/54 が 0.0 秒 FAIL していた（`spawnSync` が `.cmd` を起動できず ENOENT）。同 commit で起動は直したが、その先も `:/` ドライブレター分断・`file://` 未対応・glob 0 件など Windows 固有の失敗が 6 件残る。**CI は全 22 workflow が `ubuntu-latest` なので本番影響はない**。詳細と方針判断は backlog `DN-0104`。
> Windows では **pre-commit（staged・現に動く）＋ push して CI に全量を任せる**のが現実的な分担。

## 背景

- GitHub Actions の直近失敗は、Pre-merge の `note-paid-cta` 74件、PSI/GSC bot commit の古い pre-commit hook、Dependabot の `uuid@9` 脆弱性が中心だった。
- 追加の全量確認で、公開 note 記事95本が PDF 特典を案内しているのにソース PDF がない問題も検出した。
- note ファネルの意味監査で、試験後も残る R8 直前 CTA と公開記事4本の live D5 ドリフトも確認した。

## 実施内容

### Actions・依存関係

- `fetch-metrics.yml`、`psi-audit.yml`、`index-coverage.yml` で、main から develop へ切替後に `npm run pre-commit:install` を実行するよう修正。
- PSI 判定を SSOT どおり field-first に修正。単発 lab 超過は診断レポート、field 実害または取得失敗率20%超だけを CI gate とした。
- `tests/psi-threshold-check.test.mjs` を追加。
- `budoux` の推移依存だけを安全に更新できるよう `package.json` overrides で `google-auth-library@^10.6.2` を指定。`uuid@9` を依存木から除去。

### note 回遊・有料記事

- 1級50本・2級24本の計74本へ、無料プレビュー内の土木もくじ帰路と末尾 membership CTA を配線。
- 同74本のうち不足72本へ「この記事でわかること」を追加。
- 総監 tankan 共通 CTA と R8本試験2記事の CTA を、試験後の evergreen 導線へ変更。
- live note は次を修復済み。価格・有料境界を維持した。
  - `nfe8bc37ce88e`：総監コアパック CTA を追加。
  - `nfa8998e22a52`：既存 live CTA を新configで正しく認識。
  - `nb5ebacb3e6c0` / `na3ad4130a85f`：無料プレビューへ総監もくじ帰路を追加。

### PDF 配布物

- 欠落95本の PDF を生成（1級土木38本、総監模範論文57本）。各PDFは5〜8ページで、文字抽出・文字化け・CTA混入を検査済み。
- 総監14ペルソナの PDF spec に R08予想3〜6の不足53記事を追加。
- 1級工事101〜150の spec に CTA 除外範囲を追加。
- `magazine-to-pdf.mjs` は Mac/Linux で Chrome CLI が45秒ハングする既知問題を避けるため、非Windowsのみ Playwright `page.pdf()` を使用するよう修正。Windows経路は維持。
- **PDFの note.com への添付は未実施**。1日100アップロード上限と公開操作を伴うため、次セッションで方針確認して実行する。

## 検証

実施済み：

```bash
npm run quality:audit:ci                 # 54/54 PASS（PDF・PSI最終変更前のチェックポイント）
npm run build                            # PASS（同上）
npm run check-seo-build:ci               # PASS、error 0
npm run check-note-attachments           # PASS、公開770件・約束/実体不一致0
npm run audit-note-funnel -- --live --ci # PASS、D1-D6 drift 0
node scripts/check-note-live-headings.mjs # PASS、761件
node --test tests/psi-threshold-check.test.mjs # 3/3 PASS
npm run psi-audit:check -- --output .tmp/psi-local-report.md
# diagnostic 45 / gate 0（既存最新バッチ。PSI一時取得失敗8/44は20%以下）
npm audit --omit=dev                     # 0 vulnerabilities
git diff --check                         # PASS
```

PDF個別検査：対象95本の `pdfinfo` / `pdftotext` が成功し、5〜8ページ、U+FFFD・`note.com`・membership CTA の混入0。工事101〜150のうち本文がPDFを案内しない12本は、誤って生成したPDFを削除済み（再生成可能）。

> [!warning]
> `quality:audit:ci` と `build` は、その後のPDF spec・PSI判定変更を含む最終差分では未再実行。WIPチェックポイントでは `[skip ci]` を使い、別PCで全量検証してから通常コミットを追加すること。

## 再開時に実行した検証（2026-08-21・Windows PC）

| 手順 | 結果 |
|---|---|
| `npm ci --legacy-peer-deps` | 完了・脆弱性 0 |
| `node --test tests/psi-threshold-check.test.mjs` | 3/3 PASS |
| `npm run check-note-attachments` | PASS（公開 770 件・約束と実体の不一致 0） |
| `npm run check-note-paid-cta` | PASS（674 件検査・変更対象 0） |
| `npm run check-note-intro-benefit` | PASS（公開 756 件すべて benefit 節あり） |
| `git diff --check` | PASS |
| `npm run quality:audit:ci` | 47 PASS / 6 FAIL / 1 timeout — **失敗 7 件のうち 6 件は Windows 固有**（`DN-0104`）、実指摘は `image-assets` の SVG 1 件のみ（今朝の作業とは無関係。2026-08-21 に解消しカードは削除済み） |

`npm run build` と `check-seo-build:ci` は Windows 全量検証が成立しない以上ローカルで通しても意味が薄いため、CI（Linux）へ委ねた。

> [!note]
> 監査実行で `.claude/state/{svg-audit.json,quality/*}` が書き換わるが、Windows ではパス区切りが `content\\site\\...` に化けるため **コミットしない**（他環境の記録を壊す）。実行後は `git restore` すること。

## 残りの手順（ユーザー判断）

Pre-merge 成功後、`/deploy` 手順で main へ反映する。main 反映後に以下を再実行する。

```bash
gh workflow run psi-audit.yml --ref main
gh workflow run fetch-metrics.yml --ref main
gh workflow run note-live-audit.yml --ref main
gh workflow run content-quality-audit.yml --ref main
```

## 後続メモ

- main 反映前はスケジュール Actions が古いworkflowを使うため、既存の赤は消えない。
- note ソース74本の再公開とPDF95本の live 添付は未実施。`check-note-republish` と `check-note-attachments --live --only ...` で対象を絞ってから行う。
- GitHub Actions の最新既知失敗 run：Pre-merge `32372409389`、PSI `32396953887`、Fetch SEO metrics `32418694728`。
- 変更規模は記事74本、PDF95本、PDF spec15本ほか。無関係な生成スナップショットと build index は差分から除外済み。
