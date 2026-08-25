# 選択科目パック：導線・計測・運用接続手順書

## 1. 目的

公開した11商品を、該当選択科目の受験者へだけ提示し、売上を商品ID別・科目別に評価できる状態にする。

## 2. 商品導線の原則

```text
科目別の過去問・論点ページ → 該当科目のまるごとパック（主CTA）
建設部門もくじ             → 11科目パック一覧
単科マガジン               → 低価格の代替選択肢として維持
必須科目Iページ             → 必須科目I単科を維持
```

他科目パックを横並びで見せない。受験者は選択科目を1つだけ選ぶため、各spokeでは本人の科目に一致する1商品だけを主CTAにする。

## 3. サイトCTA

`src/lib/magazine-placement.ts`の`matchPeConstructionEssay`を更新する。

- `required`は`pe-construction-required-magazine`のまま。
- 11選択科目は対応する`pe-construction-*-pack`へ変更する。
- slug正規表現と科目対応をテーブル駆動に寄せ、11本のifを別箇所へ複製しない。

サイトMDX内に単科`<MagazineCard>`を直接置いている科目別論点ページも、該当pack IDへ置換する。少なくとも次の11科目を全件検索する。

```text
road
river-coast
urban-planning
geotechnical
steel-concrete
construction-planning
environment
port-airport
power-civil
railway
tunnel
```

単科への導線を完全に消す必要はないが、同じ表示位置にpackと単科を二重表示しない。

## 4. 建設部門もくじ

`{NOTE_ROOT}/技術士建設部門/建設部門もくじ/article.md`を更新する。

- 冒頭の選び方を「自分の選択科目のまるごとパック」へ変更。
- 11科目のパック一覧を、試験上のBK順で掲載。
- 各項目に「必須I＋選択科目」「¥4,980」を毎回長文で重複させず、節冒頭で共通説明する。
- 単科マガジン一覧は「必須Iをすでに持っている人向け」として残す。
- 道路だけを特別扱いする旧コピーを撤去する。
- note URLは`note-magazines.ts`とライブAPIの実値を使用する。

ソース変更後、無料記事なので`note-update-body`のdry-runで本文・カード化・目次を確認し、実反映前にユーザーの公開操作承認を確認する。実反映時は更新通知を必ず「いいえ」にする。

## 5. 科目別無料note記事

次の既存3記事は単科URLから該当pack URLへ主CTAを変更する。

```text
道路の論文キーワード
河川海岸の論文キーワード
都市計画の論文キーワード
```

- 本文の専門解説は変更しない。
- packを「必須Iも含む」と明示する。
- 単科を選びたい人は建設部門もくじから到達できるようにする。
- ソース検証後に`note-update-body`をdry-run→commitし、更新通知は「いいえ」。
- 公開APIで新pack URL出現と旧単科URLの主CTA残存有無を確認する。

## 6. 売上記録

sales recorderが次の10 product IDを決定的に認識できるようにする。

```text
pe-construction-tunnel-pack
pe-construction-urban-planning-pack
pe-construction-river-coast-pack
pe-construction-steel-concrete-pack
pe-construction-geotechnical-pack
pe-construction-railway-pack
pe-construction-environment-pack
pe-construction-port-airport-pack
pe-construction-construction-planning-pack
pe-construction-power-civil-pack
```

既存ログの`bk-road-pack`など過去product IDを一括改名しない。新旧IDの正規化が必要なら、互換aliasを明示し、既存売上履歴を破壊しない。

管理画面の売上画面で、11packを「建設部門・科目パック」としてまとめ、科目別に件数・売上を確認できるようにする。

## 7. 計測

公開日を基準として、4週後と8週後のレビュータスクをbacklogへ登録する。本文をweekly/monthlyへ複製せずID参照する。

レビュー項目：

- pack販売数。
- 同科目単科販売数。
- pack比率。
- 科目全体売上。
- 公開前同期間との売上差。
- サイトのpack CTAクリック数。
- noteもくじからの流入。

値上げは科目単独で2か月10件を満たした場合に検討する。道路を含め、条件未達の商品を一律値上げしない。

## 8. 恒久文書

実装後、商品体系と現行価格を次の正式SSOTへ反映する。

- `{NOTE_ROOT}/技術士建設部門/noteコンテンツ計画.md`
- 収益化戦略の現行note商品節。
- `src/lib/note-magazines.ts`。
- 必要な場合のみ管理画面README。

「道路だけ実証中」「都市計画・トンネルは未公開」などの旧記述を全検索し、現実と一致させる。

## 9. 検証

```bash
npm run check-pe-construction-packs
npm run verify-note-magazines -- --vs-txt --contents --json
npm run check-magazine-cta:ci
npm run check-note-funnel
npm run check-note-republish
npm run check-doc-refs
npm run type-check
npm run build
git diff --check
```

live更新を行った場合は追加で実行する。

```bash
npm run verify-note-status
npm run audit-note-funnel -- --live
```

ネットワーク取得が成立しなかった検査をPASS扱いにしない。

## 10. 受入条件

- 11packすべてがサイト内1面以上から到達可能。
- 科目別ページが該当科目packへ送客する。
- 建設部門もくじが11packと11単科を役割別に案内する。
- 売上記録が10新商品を個別識別できる。
- 4週・8週レビューがbacklog IDとして登録される。
- buildと全指定検査が成功する。
