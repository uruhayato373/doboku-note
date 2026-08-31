# ココナラ C8 予想模試の誤り修正 — 顧客返信の引き継ぎ

作成 2026-08-31 / 起点は購入者からの指摘（DM 10051134・8/30 18:35）

**残っているのは「顧客への返信と修正版 PDF の送付」だけ。** 教材の修正・R2 への反映・
再発防止ゲートは完了済みで、別 PC ではブラウザ操作だけで完結する。

---

## 1. 何が起きたか

1級土木の施工経験記述で、令和6年度以降の解答欄の区切りは級で**逆**になっている。

| | (1) | (2) |
|---|---|---|
| **1級** R6/R7 | 現場状況・技術的課題**と検討した項目** | 検討項目の対応処置とその評価 |
| **2級** R6/R7 | 現場状況・技術的課題 | **検討した項目**とその対応処置 |

真実源は [secondary-r07/article.mdx](../../content/site/civil-construction-1/secondary-r07/article.mdx) と
[civil-construction-2/secondary-r06/article.mdx](../../content/site/civil-construction-2/secondary-r06/article.mdx) の設問文。

C8 予想模試（1級・¥2,500）は**2級式で作られていた**。1級の解答欄は1区画 8行×25字＝約200字
（[keiken-answer-sheet-limits.json](../../.claude/config/keiken-answer-sheet-limits.json)）なので、
②に 検討＋対応処置＋評価 の3要素を詰めると物理的に入らない。購入者の指摘は完全に正当。

さらに解答解説の字数案内が「①7行250字／②9行300字」で、問題冊子の記入欄（各8行）と食い違って
いた。**分割の誤りと字数案内の誤りが重なって**超過が起きていた。

16冊セットは白（1級 note 原稿の 780+ ラベルを全数確認して誤りゼロ）。被害は模試のみ。

---

## 2. 完了済み

- **模試の原稿を修正** — 問題冊子 10箇所・解答解説 2箇所
- **PDF を再生成** — 誤表記 0 件・URL検証 0 件・記入欄の体裁を目視確認
- **R2 へ反映** — 原稿と PDF の両方。`asset-inbox-push` の再 dry-run で「R2 と同一」を確認済み
- **再発防止** — `npm run check-keiken-answer-split` を新設（quality:audit に ci:true 登録）
- **ココナラブログ3本のソース修正**（ライブは未反映・後述）

---

## 3. 別 PC でやること

### 3-1. 修正版 PDF を手元に置く

R2 に上げてあるので取り寄せるだけ。R2 credential がある端末なら:

```bash
npm run asset-hydrate -- --path ".claude/config/coconala/assets/pdf/coconala-C8"
```

credential が無い端末は CI に代行させる。Actions から `Asset Hydrate (R2 -> artifact)` を
dispatch（`selector_kind=path` / `selector=.claude/config/coconala/assets/pdf/coconala-C8`）→
artifact `hydrated-assets`（tar.gz）をダウンロード → repo 直下で展開。

```bash
tar -xzf hydrated-assets.tar.gz
```

> Git Bash では `tar -xzf 'C:/...'` が `C:` をリモートホストと解釈して失敗する。
> `/c/Users/...` 形式のパスを使う。

取り寄せたら sha256 が台帳と一致することを確認する（誤版を掴んでいないかの確認）。

| ファイル | bytes | sha256 先頭 |
|---|---|---|
| coconala-C8-1級二次予想模試-問題冊子.pdf | 570635 | `7573241c11a7` |
| coconala-C8-1級二次予想模試-解答解説.pdf | 568896 | `8357521c2207` |

**再生成でも可**（原稿は R2 の修正版なので同じものが出る）。Windows なら:

```bash
CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" npm run coconala-content-pdf -- --product C8
```

### 3-2. DM 10051134 へ返信

https://coconala.com/mypage/direct_message/10051134

> ご指摘ありがとうございます。そして申し訳ありません、予想模擬試験の問題冊子に誤りがありました。
>
> おっしゃるとおりで、1級の令和6・7年度は「検討した項目」が①側に入ります。
>
> ・① 現場状況 → 品質管理上の技術的課題 → その課題を解決するために検討した項目
> ・② ①で挙げた検討項目の対応処置 → その評価
>
> 弊教材の問題冊子は、ここを2級の区切り方（①課題／②検討＋対応処置＋評価）で作ってしまっておりました。1級の解答欄は各区画おおむね8行・1行25字程度＝1区画200字前後ですので、ご指摘のとおり②に3要素を詰めると入りません。やみぎく様のご判断が正しく、こちらの誤りです。
>
> あわせて解答解説の字数の目安も「①7行250字／②9行300字」と、問題冊子の記入欄（各8行）と食い違っておりました。こちらも「①8行200字／②8行200字」へ修正しております。
>
> 書き方のコツとして、①の検討項目は「何を検討したか」を2〜3項目挙げるだけに留めてください。検討理由や検討内容の詳述は不要です。そのぶんの字数を②の対応処置（実際に行ったこと・数値）と評価に回すと収まります。
>
> 修正版の問題冊子・解答解説をこのトークルームへお送りします。お手数ですが、そちらをお使いください。なお、16冊セットに収録の「過去問模範答案集」は正しい区切りで作成しておりますので、実際の書き方はそちらの答案例もあわせてご参照ください。
>
> ご指摘いただき本当に助かりました。10月4日の本番、応援しております。

### 3-3. トークルーム 18194267 へ修正版 PDF を添付

https://coconala.com/talkrooms/18194267

**DM とトークルームは別の場所**。質問への返信は DM 側、PDF の添付はトークルーム側になる。
添付は各ファイルにホバーすると出るダウンロード/添付の操作ボタンから行う。

### 3-4. 記録

`.claude/state/coconala/orders-log.json` に対応を追記し、決着したら
`.claude/config/coconala/resolved-inquiries.json` の DM 10051134 の `resolvedOn` を更新する。

> `resolvedOn` より後に新着が入れば `check-coconala-orders` が自動で要対応へ戻す
> （今回この再オープン判定を入れた。以前は dmId 単位の永久除外で、戻ってきた顧客の
> 問い合わせが機械的に握り潰されていた）。

---

## 4. 同じく残っている別件（顧客対応とは独立）

ココナラブログ3本（品質・安全・工程の書き方）が2級式の説明のまま**公開中**で、
しかも送客先は1級商品。ソースは修正済みでライブだけが古い。

- 対象 `content/coconala/blog/{hinshitsu,anzen,koutei}-kanri-kakikata/article.md`
- 差分は「1段落の挿入」＋「1〜3文の置換」だけ。`git show 56c62e61 -- content/coconala/blog/` で全文が出る

**自動化は見送った。** `coconala-blog-publish.mjs` は二重公開ガードで公開済み記事に使えず、
更新には本文を消して入れ直す処理が要る。そのスクリプトのコメントには過去2回の破損
（本文が500/1684字で切断・段落順の破壊）が実測として記録されており、公開中の3本を壊す
リスクに見合わない。ブラウザで直接編集するのが安全。

---

## 5. 注意点

- **返信の送信は運営者が行う**（coconala-operations.md の安全弁）。エージェントは下書きまで
- 模試の原稿 `moshi-src/C8-1級模試/*.md` は R2 退避済みで、ローカルで直したら
  `asset-inbox-push --commit` で書き戻さないと次の hydrate で消える
- `[skip ci]` 付きの CI コミットが main の先頭に来るとデプロイが自動起動しない。
  その場合は `gh workflow run cloudflare-deploy.yml --ref main` で手動起動する（2026-08-31 に遭遇）
