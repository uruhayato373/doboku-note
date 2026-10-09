---
title: 書籍の網羅の意味判定（Evaluator の手順）
---

# 書籍の網羅の意味判定（Evaluator の手順）

書籍（`config/reference-sources.json` の bookBundle）の節が、サイトでどこまで扱われているかを判定し、展開の計画を作る手順。機械の候補表から意味判定を経て展開に至る流れのうち、意味判定の段にあたる。全体の流れは [content-taxonomy.md](./content-taxonomy.md) §7、置き場は [data-storage-decision.md](./data-storage-decision.md)「台帳を 1 本にして DB のように扱う」。

判定では記事を編集しない。判定と計画だけを書き、git 操作もしない。

## 入力（`<dir>` は bookBundle.directory）

| 何 | どこ |
|---|---|
| 判定資料（候補に挙がった記事と見出し・判定する節の一覧） | `content/sources/books/<dir>/coverage/packet.md` |
| 機械の候補表（`units[]` に id・page・heading・topTerms・bestSections） | `content/sources/books/<dir>/coverage/candidates.json` |
| 本の原文（必要な節だけ開く。`<!-- pNNNN -->` でページを探す） | `content/sources/books/<dir>/ocr/*.md` |
| サイトの記事（必要な記事だけ開く。資料に無い記事は grep で探す） | `content/site/<資格>/<slug>/article.mdx` |

原文は著作権のある市販書籍。出力に原文の文を写さない。論点は 30 字以内の語句で書く。

## 判定（判定資料の節に 1 つずつ）

- `covered`: サイトのどこかで同じ論点を扱っている（言い換えや別の章立てでもよい）。`where` に `<資格>/<slug>#見出し` を書く。
- `partial`: 扱っているが、試験・実務で要る要素（分類・機構・判定基準・手順・代表的な数値の意味）が欠けている。`where` と `missing` を書く（欠けている要素を語句で最大 5 つ）。
- `gap`: 受験者・実務者に必要な論点なのに、サイトに無い。
- `out-of-scope`: 展開しない。`reason` に 1 語句で理由を書く。

判断の目安（資格・棚ごと）:

- 対象資格の試験範囲（出題分野）に入るか、土木の実務（計画・施工・品質・安全・維持管理・発注者の確認）で役に立つなら展開対象にする。
- 次は `out-of-scope` にする。
  - 答案例・経験記述・論文の模範例（1級土木の経験記述、技術士・総監の論文、診断士の記述式など）。note の有料商品の領域なので、サイトに答案は書かない。
  - 過去問の設問・解説そのもの。過去問は別に数えている（reason: 過去問）。
  - 前付け・目次・索引・奥付・コラムの雑談・著者の体験談・宣伝。
- 業界の動向・統計（市場規模・就業者数・投資額など）は時点の数値なので、白書・統計の一次資料で確かめられる論点だけを展開対象にする。計画の `points` に「数値は一次資料で最新に更新」と書く。
- 特定の製品・サービスの操作手順（ソフトの画面操作・コマンド）は、土木の実務の判断（何に使えるか・確認すべき点・リスク）に一般化できる論点だけを展開対象にする。それ以外は `out-of-scope`（reason: 製品の操作手順）。
- 同じ論点が本の中で何度も出るときは、1 つを gap か partial にし、残りは `covered` か `out-of-scope`（reason: 本の中で重複）にする。計画が二重にならないようにするため。
- 同じ資格の別の本が同じ論点を扱っていても、判定はこの本の節だけで行う。棚の中での計画の統合は、展開のときに親が行う。

## 展開計画（gap と partial から作る）

- 展開先は既存の記事を優先する（判定資料の一覧から slug を選ぶ）。どの記事の、どの H2 の後に何を足すかを書く。
- 既存の記事に収まらない大きな論点だけ、新しい記事を提案する（`new: true`・`article` は `<資格>/<slug 案>`・`title` 案）。
- すべての gap・partial の節を、いずれかの追加の `unitIds` に入れる。展開しないと決めたなら、判定を `out-of-scope` に直して `reason` を書く（`--check` が計画もれを止める）。
- 追加には優先度を付ける。
  - `A`: 試験で繰り返し問われる、または図で理解が進む。
  - `B`: 試験範囲だが頻度が低い、または実務で役立つ。
  - `C`: 補足。
- 図の案は `figure` に書く。概念図・比較表・フロー・グラフのどれで何を描くかを書き、自作 SVG で描く前提にする（本の図を写さない）。写真が効く論点（変状の見た目・機械・試験器具など）は `photo` に被写体を書く（AI 生成で作る前提）。
- 計画の見出し（`heading`）は判定のための仮の言葉でよい。展開のときに Writer が組み直す（[content-taxonomy.md](./content-taxonomy.md) §7 の 2）。

## 出力

`content/sources/books/<dir>/coverage/verdict.json` に書く。判定を分担するときは、依頼文で指定された `verdict.part<N>.json` に自分の範囲の節だけを書く（親が結合する）。

```json
{
  "sourceId": "<id>", "judged": 0, "counts": {"covered": 0, "partial": 0, "gap": 0, "out-of-scope": 0},
  "units": [ {"id": "u0001", "verdict": "partial", "where": "<資格>/<slug>#見出し", "missing": ["…"], "reason": null} ],
  "plan": [
    {"article": "<資格>/<slug>", "new": false, "title": null,
     "additions": [{"after": "既存の H2 見出し", "heading": "追加する H2/H3 の案", "level": 2, "unitIds": ["u0123"], "points": ["語句"], "priority": "A", "figure": "…", "photo": null}]}
  ]
}
```

- `judged` は units の件数、`counts` は units の判定ごとの件数と一致させる。
- 書き終えたら `node scripts/audit-reference-book-coverage.mjs --check --source-id <id>` を回し、違反 0 になるまで直す（分担のときは親が結合してから回す）。
