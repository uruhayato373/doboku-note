# コードの拡張性 負債の棚卸し（段0）

> [!note]
> 2026年10月20日の計測。読むだけで、コードは変えていない。対象は `git ls-files` の追跡ファイル。「同名の関数」は正規表現で拾った候補で、中身が同じかは見ていない。「どこからも呼ばれない」はファイル名の文字列が他のファイルに出てこないことで判定したので、パスを組み立てて呼ぶものは誤って数えている可能性がある。

## 進める順番

| 段 | 対象 | いちばん大きい負債 |
|---|---|---|
| 1 | スクリプトの型 | `scripts/` の 906 本・163,129 行が型検査の外 |
| 2 | 関数の集約 | 同じ名前の関数が lib の外の 3 ファイル以上にあるものが 89 名・333 ファイル |
| 3 | ディレクトリと孤立物 | ファイル名がどこにも出てこないスクリプト 44 本 |
| 4 | 記録・計測 | 計測の入力で型の無い JSON 8 件 |
| 5 | エージェント・スキル | 呼び出しの記録が無く、使われていないものを判断できない |

順番の理由:

- **型を先にする。** 段2で関数を lib へ寄せると、呼び出し側の引数や戻り値の食い違いが起きやすい。型があれば `tsc` がそれを拾う。
- **集約をディレクトリより先にする。** ディレクトリを移すと、package.json の 563 本と手順書の参照をすべて書き換えることになる。重複と孤立を先に減らせば、移す量そのものが減る。
- **計測を4番目にする。** 計測の入力 JSON の型は、段1と同じ zod の仕組みにそのまま乗る。
- **エージェント・スキルを最後にする。** エージェントやスキルはコマンドとデータの形を呼ぶ側なので、その下が固まってから整理する。ただし、利用の記録は判断までに数週間分のデータが要るので、記録を取り始めることだけは前倒しする。

どの段も、まず「増やさない検査」（ラチェット）を置く。返済は、その箇所に触るカードのついでに行う。一括の置き換えは、置き換えても挙動が変わらない純関数に限る。

## 1. スクリプトの型

- `tsconfig.json` の `include` は `.ts`・`.tsx` だけで、`scripts/` の `.mjs` は型検査されていない。`@ts-check` を付けたファイルは 0 本。
- `scripts/lib/` の 330 本のうち 130 本に JSDoc の `@param` がある。しかし検査されていないので、注釈と実装がずれても気づけない。
- 設定と記録には、実行時の型がほぼ揃っている。データ台帳 263 件のうち、config は 70 件中 68 件、data は 94 件中 76 件に zod の型があり、`check-datasets` の違反は 0 件。足りないのは静的な側で、読む側のスクリプトが欄の名前を間違えても、実行するまで分からない。
- `src/` は `strict` だが `noImplicitAny: false`。

**処方:** スクリプト用の tsconfig（`checkJs`、対象は `// @ts-check` を付けたファイル）を作り、CI で回す。付けた本数を減らさない検査も置く。最初に付けるのは、多くのスクリプトが読む lib（config と data を読み込む部分）。zod の型から `z.infer` で JSDoc の型を引けるようにする。

## 2. 関数の集約

| 重複している処理 | 自前で定義しているファイル数 | 既にある lib |
|---|---|---|
| CLI 引数（getArg 40・parseArgs 28・arg 16・flag 11・opt 7） | 延べ 102 | [cli-args.mjs](../../../scripts/lib/cli-args.mjs)（利用 50 本） |
| sleep | 38 | 複数の lib に分散 |
| ファイルの走査（walk） | 18 | [fs-walk.mjs](../../../scripts/lib/fs-walk.mjs)（利用 87 本） |
| git の呼び出し | 19 | なし |
| sha256 | 14 | lib の中でも 4 ファイルが同名で export |
| toPosix | 10 | asset-storage.mjs |

- lib に既にある名前を手元で定義し直している関数が 57 名ある。
- lib の中で、同じ名前の export を複数のファイルが持っているものが 34 名ある。
- `src/lib` と `scripts/lib` の両方に同じ名前の関数が 3 つある（countChars・isStructuralTag・escapeRegExp）。サイトとスクリプトで判定が分かれている可能性がある（CLAUDE.md §7「同じ判定を複数箇所に実装しない」）。
- `scripts/lib/` のうち、どのテストも import していないものが 33 本ある。
- knip の基準線は、未使用 export 7・未使用の型 17・package.json に無い依存 4・解決できない import 1。これは既にラチェットで止めている。
- `render`・`xml`・`brandFrame`（22〜35 ファイル）は、図を描く `render-figure-*` の雛形を写して作ったもの。段3の孤立物と重なる。

**処方:** CLI 引数は cli-args.mjs へ寄せる。sleep・sha256・toPosix・walk は純関数なので、lib へ一括で置き換える。「lib にある名前を手元で定義する」件数を増やさない検査を置く。800 行を超えるファイル（scripts に 18 本）は、触るときに分ける。

## 3. ディレクトリと孤立物

- `scripts/` の直下に 574 本が平たく並んでいる。接頭辞の内訳は check 193・render 46・note 39・build 32・coconala 19。サブディレクトリは hooks と kindle-covers の 2 つだけ。
- ファイル名がどこにも出てこないスクリプトが 44 本ある。内訳は `render-figure-*` 31・`render-editorial-*` 2、移行や一回きりの作業 11（migrate-x-tweets・migrate-channel-split・backfill-note-hashtags・bulk-score・build-site など）。knip は `scripts/**` をすべて入口として扱っているので、これらを拾えない。
- npm scripts 563 本のうち、package.json の中でも外でも名前を呼ばれていないものが 31 本ある。test:watch のように人が手で打つ入口も含むので、すべてが不要とは限らない。
- `src/` で 500 行を超えるのは 6 本。最大の note-magazines.ts（2,376 行）は config/products.json からの生成物なので、負債ではない。

**処方:** ディレクトリの一括移動はしない。参照の書き換えが大きいわりに、探しやすさは接頭辞の命名で既に得られている。孤立した 44 本は「図を作り直すための元として残す」か「退役する」かに分け、退役するものは削除する（git の履歴に残る）。一回きりのスクリプトの置き方を決め、孤立の本数を増やさない検査を置く。

## 4. 記録・計測

- 計測の入力のうち、型の無い JSON が 8 件ある（instagram.insights・afb.outcomes・a8.inventory・ga4.admin-last-run・ga4.ui-urls・ga4.ui-history・ga4.ui-diff・cloudflare.zone）。週次・月次が読む取得結果の形が変わっても、検査で止まらない。欠測を 0 と読む事故が起きうる経路になっている。
- `check-datasets` に警告が 4 件ある（cloudflare.zone に型が無い・planned を外せるもの 3 件）。
- `.claude/state/` のパスを直書きしている箇所が 92 ファイル・130 件ある（基準線で凍結中）。
- `quality-audit` の検査は 171 本で、内訳は ci 135・ops 20・報告のみ 16。報告のみのうち 4 本（outbound-links・env-inventory・disk-hygiene・branch-hygiene）は、note に読み手が書かれていない。CLAUDE.md §9 の「赤いのに誰も見ていない検査」の候補になる。

**処方:** 8 件に zod の型を付け、台帳で結ぶ。読み手の書かれていない 4 本は、ci にするか、読み手を決めるか、退役するかを決める。

## 5. エージェント・スキル

- エージェントは 90、スキルは 111（SKILL.md の数）。
- 呼び出しの記録が無い。`.claude/settings.json` の hook が見ているのは Bash・Write・Edit だけ。Claude の会話記録は 10/17 以降の 47 本しか手元に無く、Codex 側の記録は無い。今の時点で退役を決めると、推測で決めることになる。
- 未稼働だと明記されているのは content-planner（Phase 2）。

**処方:** 先に、Skill と Agent の呼び出しを `.claude/state/` へ追記する hook を置く。4〜8 週分たまったら、使われていないものと役割が重なるものを統合または退役する。登録簿（[agents-registry.md](../../../.claude/knowledge/reference/agents-registry.md)・[skills-registry.md](../../../.claude/knowledge/reference/skills-registry.md)）は同じ commit で更新する。
