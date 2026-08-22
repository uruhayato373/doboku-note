---
name: note-prepublish-review
description: >
  note 公開用ドラフト（content/note/{slug}/article.md）を公開前に統合チェックする Orchestrator スキル。
  inline checks（markdown 互換性・404・文字化け・太字レンダリング崩れ・リンク anchor↔slug 整合）+ 3 並列エージェント（link-injector / figure-auditor / fact-checker）で品質ゲートを通す。
  Use when user asks to [note 公開前レビュー, note ドラフトチェック, note 出版前確認, /note-prepublish-review].
user-invocable: true
---

# /note-prepublish-review — note 公開前統合レビュー

`content/note/{slug}/article.md` を note.com に公開する前の **品質ゲート** スキル。inline 機械チェック + 3 専門エージェント並列実行で、リンク導線・図版品質・事実性を一括検証する。

## 引数

```
/note-prepublish-review {NN-...} [--audit-only] [--external-fact]
```

| 引数 | 説明 |
|---|---|
| `{slug}` | 対象記事ディレクトリ名（例: `総監択一式17年分分析`）。slug の先頭一致でも解決可（例: `総監` → `総監択一式17年分分析`） |
| `--audit-only` | リンク注入を行わず、すべて監査モードで実行（編集なし） |
| `--external-fact` | ファクトチェックのスコープ D（外部一次資料突合）を有効化（デフォルト OFF） |

デフォルトは **link-injection 自動適用 ON / figure-auditor & fact-checker は audit-only**。

## 実行フロー

```
/note-prepublish-review {NN-...}
  │
  ├─ Phase 1: inline checks（軽量・機械的・高速）
  │   ├ ファイル存在: article.md / 参照画像
  │   ├ markdown 互換性: pipe 表 0 / U+FFFD 0（blockquote `>` は note で正しく描画されるため件数報告のみ・BLOCK しない）
  │   ├ frontmatter（あれば）: 必須項目
  │   ├ リンク 404 防止: 各 slug が `content/site/.../{slug}/article.mdx` で `published: true`
  │   ├ 太字レンダリング崩れ: `**…（…）…**` Pattern A（リンク有無不問・全汎用） / `)**（` 境界 Pattern B' を regex 検出（note 独自パーサで描画崩れを起こす既知パターン、content-principles.md §14-b 準拠）
  │   ├ リンク anchor↔slug 整合: anchor テキストとスラッグの title が概念一致しているか辞書（pe-chapters.json + frontmatter fallback）で突合（過去問スラッグは対象外）
  │   ├ 文字数バンド: free 2,000〜3,000 / paid 4,000〜6,000
  │   ├ 3点セット: img/cover.png + hashtags.txt 存在（4e・--require で BLOCK）+ ハッシュタグ形式（99 行以下 / 純粋 / 重複なし＝WARN）
  │   ├ 段落長: >120 字の段落を WARN（4f・note 可読性。reflow ツールで文境界分割を適用）
  │   ├ 売れる構成（観点喚起・report-only・自動判定/BLOCK しない）: 無料部分が `.claude/knowledge/reference/note-selling-structures.md` の5ステップ骨格（悩み→原因→解決→読後の変化→次の行動）を満たし、記事タイプに合う型（悩み直撃/Before→After 等）が機能しているか目視確認を喚起
  │   └ マガジン模範論文（magazines/ 配下のみ）: 試験問題セクション存在 / トレードオフ再掲節の不在 / 設問別解答字数（上限超過=NG・健全帯 85〜100%）/ 答案本文の散文化 / 図版なし / 設問(3) スコープ（国家施策設問の目視）
  │
  ├─ Phase 2: 3 エージェント並列実行
  │   ├ note-link-injector（Generator, Sonnet）— 全 occurrence リンク化（--audit-only 指定時はスキップ）
  │   ├ svg-figure-auditor（Evaluator, Sonnet）— note-svg-policy 準拠監査
  │   └ note-fact-checker（Evaluator, Sonnet）— A+B+C スコープのファクトチェック
  │
  └─ Phase 3: 結果集約・最終判定
      ├ inline 違反 1 件以上 → BLOCK（ブロッカー）
      │   ・BLOCK 対象: ファイル不在 / pipe / U+FFFD / 404 RISK / 太字レンダリング崩れ Pattern A・B' / マガジンCTA形式（markdownリンク・URL同一行の¥）/ 3点セット欠落（cover.png・hashtags.txt）
      │   ・WARN 対象（情報提供のみ・GO 判定に影響しない）: blockquote 件数 / anchor↔slug 整合性 MISMATCH / 文字数バンド逸脱 / hashtags 形式 / 段落長>120字（note 可読性） / 試験問題セクション欠落 / トレードオフ再掲節残存 / 設問別解答字数の健全帯逸脱 / 答案本文の箇条書き / 図版参照あり / 設問(3) 国家スケール設問の目視確認喚起 / 無料部分の売れる構成（5ステップ骨格）観点喚起
      ├ 各エージェントの加重スコア集計
      ├ 合格基準: inline 違反（BLOCK 対象）0 件 + 3 エージェント全て加重スコア 2.0+
      └ 公開可否判定 + 修正アクション一覧
```

## Phase 1: inline checks（実装詳細）

```bash
# プロジェクトルートからの絶対パスで実行する（cd で相対パスを壊さない）
ROOT="/Users/minamidaisuke/doboku-note"
F="$ROOT/content/note/{slug}/article.md"

# 1. ファイル存在
test -f "$F" || exit 1

# 2. 図版参照と実ファイルの整合（article 直下 ./img/ と マガジン共用 ../img/ の両方を絶対パスで解決）
#    マガジン論文（content/note/magazines/{magazine}/R0X/article.md）は共用図を ../img/ で参照するため
#    ./img/ だけだと素通りする。../img/ も拾うこと。
ART_DIR="$(dirname "$F")"
grep -oE '!\[[^]]*\]\(\.\.?\/img\/[^)]+\)' "$F" | sed -E 's/.*\((\.\.?\/[^)]+)\).*/\1/' | while read ref; do
  test -f "$ART_DIR/${ref#./}" || echo "MISSING: $ref"
done

# 3. markdown 互換性
#   pipe / U+FFFD は BLOCK 対象。blockquote `>` は note で正しく描画されるため
#   件数報告のみ（WARN 扱い・GO 判定に影響しない）。
echo "pipe=$(grep -c '^|' "$F") blockquote=$(grep -c '^>' "$F") U+FFFD=$(grep -cP '\xef\xbf\xbd' "$F")"

# 4. リンク 404 防止（絶対パスで .local/r2/ を解決）
grep -oE '/docs/pe-comprehensive-management-[a-z0-9-]+' "$F" | sort -u | while read url; do
  slug=${url#/docs/pe-comprehensive-management-}
  src="$ROOT/content/site/pe-comprehensive-management/$slug/article.mdx"
  if [ ! -f "$src" ]; then
    echo "404 RISK: $slug (file not found)"
  elif ! grep -q '^published: true' "$src"; then
    echo "404 RISK: $slug (not published)"
  fi
done

# 4b. 太字レンダリング崩れ（note 独自パーサで描画崩れを起こす既知パターン）
#   Pattern A  : **...（...）...**          — 太字スパン内のどこかに全角括弧（リンク有無を問わない・最汎用）
#   Pattern B' : `)**（` 境界               — リンクURL末尾の `)` 直後に `**` → 全角 `（` が連続
#
#   Pattern A は旧 Pattern B（リンク+全角括弧限定）を内包する超集合。リンク無しの素の
#   **地方自治体の土木職（発注者）として** 形式・複数全角括弧を含む長い太字
#   （資格列挙・施策列挙等）の崩れもこれで捕捉する。content-principles.md §14-b 準拠
#
#   Pattern A の検出には **stateful parse** を使う（Node スクリプト）。単純 grep は
#   `**作成日**: 2026-04-17（v1）/ **SSOT**` のような複数 bold 間の括弧を false-positive
#   として誤検出するため。Pattern B' のみは行内の隣接パターンなので grep で十分
echo "BOLD_RENDER:"
node "$ROOT/.claude/scripts/check-note-bold-paren.mjs" "$F"
Bp=$(grep -nE '\)\*\*（' "$F")
[ -z "$Bp" ] && echo "  Pattern B' : OK" || { echo "  Pattern B' : NG"; echo "$Bp" | sed 's/^/    /'; }

# 4c. リンク anchor↔slug 整合性（pe-chapters.json + frontmatter fallback）
node "$ROOT/.claude/scripts/check-note-link-anchor-match.mjs" "$F"

# 4d. マガジン導線CTA形式（content-principles.md §14-c）
#   ① markdown リンク形式のマガジンURL `[text](…/m/ID)` — bare URL 単独行（リンクカード）でないとカード化されない
#   ② マガジンURL／{{MAGAZINE_URL}} と同一行の価格(¥) — 価格改訂で陳腐化。CTA に価格を書かない（SoT=note-magazines.ts）
echo "MAGAZINE_CTA:"
node "$ROOT/.claude/scripts/check-note-magazine-cta.mjs" "$F"

# 4e. 3点セット充足（content-principles.md §14-d・BLOCK）
#   公開前レビューを回す＝公開意図なので、cover.png + hashtags.txt を無条件必須化（--require）。
#   公開直前は noteUrl 未設定のことが多いため state を見ない。下書きのまま確認したいだけなら無視可。
echo "THREE_SET:"
node "$ROOT/.claude/scripts/check-note-3set.mjs" --require "$F"

# 4f. 段落長（note 可読性・WARN・content-principles.md §14-e）
#   note はモバイル閲覧主体で 1 段落が長いと読まれない。>120 字の段落を WARN として surface。
#   自動分割（語句不変・文境界）は reflow ツールで適用、単文の長文は手動で 2 文に。
echo "PARAGRAPH_LEN:"
node "$ROOT/scripts/reflow-note-paragraphs.mjs" --dry --target 120 "$F"

# 5. 文字数（参考）
chars=$(wc -m < "$F")
echo "文字数: $chars"

# 6. ハッシュタグ（hashtags.txt）
H="$ART_DIR/hashtags.txt"
if [ ! -f "$H" ]; then
  echo "HASHTAGS BLOCK: hashtags.txt 未生成（4e=3点セットで BLOCK）→ /note-hashtags {NN-...} で生成"
else
  total=$(wc -l < "$H" | tr -d ' ')
  hashlines=$(grep -cE '^#' "$H")
  blanks=$(grep -c '^$' "$H")
  comments=$(grep -cE '^#[[:space:]]' "$H")
  dups=$(sort "$H" | uniq -d | wc -l | tr -d ' ')
  echo "HASHTAGS: 行数=$total / # 開始=$hashlines / 空行=$blanks / コメント=$comments / 重複=$dups"
  if [ "$hashlines" -gt 99 ]; then echo "HASHTAGS WARN: 99 個超え（$hashlines 個）"; fi
  if [ "$hashlines" -lt 90 ]; then echo "HASHTAGS FAIL: 90 個未満（$hashlines 個）＝check-note-hashtags で赤落ち。有効レンジ 90〜99"; fi
  if [ "$blanks" -gt 0 ] || [ "$comments" -gt 0 ]; then
    echo "HASHTAGS WARN: 純粋ハッシュタグになっていない（空行/コメント混入）→ コピペで失敗する可能性"
  fi
  if [ "$dups" -gt 0 ]; then echo "HASHTAGS WARN: 重複 $dups 件"; fi
fi

# 7. マガジン模範論文 専用チェック（content/note/magazines/ 配下のときのみ）
case "$F" in
  */content/note/magazines/*)
    # 7a. 設問全文セクション（## 試験問題）の存在
    if grep -q '^## 試験問題' "$F"; then
      echo "ESSAY: 試験問題セクション OK"
    else
      echo "ESSAY WARN: 「## 試験問題」セクション無し（有料記事の自己完結性のため設問全文の再掲を推奨）"
    fi
    # 7b. トレードオフ再掲節の不在（pe-essay-draft v1.5 でテンプレートから除外済み）
    if grep -q '^## トレードオフと解決フレーム' "$F"; then
      echo "ESSAY WARN: 「## トレードオフと解決フレームの整理」節が残存（設問本文と重複する再掲節・削除推奨）"
    else
      echo "ESSAY: トレードオフ再掲節なし OK"
    fi
    # 7c. 解答字数（設問別・組合せ別）— script が年度別の上限を自動抽出し OK/WARN/NG を判定。
    #     上限超過(NG)は失格相当。過少(上限の85%未満)は出力のマス数÷上限で判定する
    node "$ROOT/.claude/scripts/note-essay-charcount.mjs" "$F"
    # 7d. 答案本文の散文化（課題・リスク・障害・克服策等の箇条書き答案を検出）
    #   本番答案は散文で書くため、これらを「- **…**」の箇条書きにしている箇所は
    #   散文化を推奨。SWOT 8 項目・工程スケジュール・TF メンバーの箇条書きは妥当な
    #   ため対象外（管理分野ラベル等の既知アンチパターンのみを positive に検出）。
    proseB=$(grep -nE '^- \*\*(経済性管理|安全管理|人的資源管理|情報管理|社会環境管理|障害|克服策|トレードオフ|利点|問題点|重大な障害)' "$F")
    if [ -n "$proseB" ]; then
      echo "ESSAY WARN: 答案本文に箇条書きの答案あり → 手本準拠で散文化を推奨"
      echo "$proseB" | sed 's/^/    /'
    else
      echo "ESSAY: 答案本文の散文化 OK"
    fi
    # 7e. 図版参照（模範論文マガジンは図版を使わない方針・手本に倣う）
    fig=$(grep -c '!\[' "$F")
    if [ "$fig" -gt 0 ]; then
      echo "ESSAY WARN: 図版参照 $fig 件（模範論文マガジンは図版なし方針）"
    else
      echo "ESSAY: 図版参照なし OK"
    fi
    # 7f. 設問(3) のスコープ（「国としての施策」を問う年度の目視確認）
    #   R06・R07 等の設問(3) は「事業や組織の枠を超えた国としての施策」を問う。
    #   設問(3) 答案の各施策がペルソナの専門分野・所管インフラに閉じていないかを
    #   目視で判定する（grep では判定できない意味的チェック）。
    if grep -qE '事業や組織の枠を超え|国としての施策|我が国において' "$F"; then
      echo "ESSAY WARN(目視必須): 設問(3) は国家スケール設問。各施策がペルソナ業界・所管インフラに閉じず、エネルギー・税制・労働・社会保障など複数省庁にまたがる国家政策になっているか目視確認すること（例: CN 年度で「建設業界の CN 標準化」「道路インフラの CN 化」は業界の枠にとどまり NG。「再エネ主力電源化」「カーボンプライシング」等まで広げる）"
    fi
    ;;
esac
```

**注意**: `cd` を使うと `.local/r2/` への相対パスが壊れるので、必ず `$ROOT` を絶対パスで保持する。

**マガジン模範論文の解答字数判定**: `note-essay-charcount.mjs` は設問別・組合せ（施策／方法）別の解答字数（原稿用紙マス数の推定値＝全角1マス・半角英数2字で1マス）と、答案用紙の上限・判定（OK / WARN / NG）を出力する。答案用紙 1 枚＝600 字。上限は試験問題セクションの「答案用紙X枚以内」「各組合せを答案用紙1枚以内」から**年度別に自動抽出**し（枚数記載のない記事は直近の標準形式を仮定）、設問・組合せごとに上限超過（NG）と余白僅少（WARN＝上限の97%以上）を判定する。**上限超過（NG）は試験で書き写せない＝失格相当のため、必ず修正アクションに挙げる**。あわせて、解答字数が上限の **85% 未満**（答案用紙を使い切れていない薄い答案）も WARN として挙げる（出力のマス数÷上限で算出）。

## Phase 2: エージェント並列起動

3 つのエージェントを **同一メッセージ内** で Agent ツール multiple invocation により並列起動する:

- `note-link-injector` — `subagent_type: note-link-injector`
- `svg-figure-auditor` — `subagent_type: svg-figure-auditor`
- `note-fact-checker` — `subagent_type: note-fact-checker`

各エージェントへのプロンプトは「対象記事のフルパス」+「目的」+「報告フォーマット」を含む自己完結型にする（エージェントは会話履歴を持たないため）。

`--audit-only` 指定時は note-link-injector の起動をスキップし、現状リンクの検証のみ行う。

## Phase 3: 結果集約

各エージェントの報告を以下の構造で集約する。**エージェントの出力をそのまま貼らない**:

- **BLOCK は全件**（公開を止める判断に直結するため省略しない）
- **WARN は種別ごとに件数＋代表 1 例**にまとめる
- 各エージェントの所見は 3〜5 行の要約に落とす

```
## /note-prepublish-review 結果

対象: content/note/{slug}/article.md
実行モード: {default | audit-only}
実行時刻: YYYY-MM-DD HH:MM:SS

---

### Phase 1: inline checks

| 項目 | 結果 | 備考 |
|---|---|---|
| ファイル存在 | ✅ | |
| markdown 互換性 | ✅ | pipe=0 U+FFFD=0（blockquote=N は WARN・BLOCK しない） |
| リンク 404 防止 | ✅ | 全 N slug が published |
| 太字レンダリング崩れ | ✅ | Pattern A / B' ともに 0 件 |
| リンク anchor↔slug 整合 | ⚠️ | N 件の懸念（ヒューリスティック検査・目視確認推奨） |
| 図版ファイル存在 | ✅ | N 枚すべて確認 |
| 文字数 | ⚠️ | N 字（free 範囲 2k〜3k に対し N 字） |
| 試験問題セクション | ✅ | マガジン論文のみ・「## 試験問題」存在 |
| トレードオフ再掲節 | ✅ | マガジン論文のみ・再掲節なし |
| 設問別解答字数 | ⚠️ | マガジン論文のみ・設問(1) N字（上限 M字・X%）… 超過=NG・健全帯 85〜100% |
| 答案本文の散文化 | ✅ | マガジン論文のみ・課題/障害/克服策等の箇条書き答案 N 件 |
| 図版参照 | ✅ | マガジン論文のみ・図版なし方針 |

---

### Phase 2: agent reports

#### note-link-injector
（agent からの報告をそのまま転記）

#### svg-figure-auditor
（同上）

#### note-fact-checker
（同上）

---

### 総合判定

- inline 違反: 0 件 ✅
- agent 加重スコア:
  - link-injector: N1（追加リンク数）
  - figure-auditor: N2 / 3
  - fact-checker: N3 / 3
- **公開可否: GO / NO-GO**

### 修正アクション（NO-GO の場合のみ）

1. ...
2. ...
```

## 公開後の管理

note 公開直後に以下の手順で「公開済み記事」として記録する。

### 1. UTM パラメータ付与（公開直前 or 直後に実行）

```bash
node scripts/add-note-utm.mjs 総監       # slug 前方一致でドラフトに UTM 付与
node scripts/add-note-utm.mjs 総監 --dry-run  # 変更内容のプレビュー
```

`content/note/{slug}/article.md` 内の `https://doboku-note.com/...` 全リンクに以下を付与:
- `utm_source=note`
- `utm_medium=referral`
- `utm_campaign={frontmatter.utmCampaign}`

note → doboku-note の流入が GA4 で「Referral / note」として計測可能になる。

### 2. frontmatter に公開メタデータを記録

```yaml
---
notePublishedAt: 2026-04-29
noteUrl: https://note.com/dobokunote/n/n3bcb87efddad
noteId: n3bcb87efddad
notePricing: free                # free | paid
noteSeries: 総監択一式分析         # 任意
utmCampaign: 90-soukan-analysis   # add-note-utm.mjs が消費
---
```

### 3. 公開済みインデックスを再生成

```bash
node .claude/scripts/build-note-published-index.mjs
```

`.claude/state/note-published.json` に集計が出力される。`pricing: paid` を含む将来の有料記事や series まとめページの参照源として利用。

### 4. doboku-note サイト側に動線追加（任意・記事性質に応じて）

特に効果が大きい場合は、関連するハブページ（exam-index / category 概要など）に `<Callout type="reference">` で note 記事へのリンクを追加する。

## 既存スキル・エージェントとの関係

| 関連 | 役割 |
|---|---|
| `/social-post note analysis|guide|keywords` | note ドラフトの **生成** |
| `/social-post note desumasu` | 既存ドラフトの **トーン変換** |
| `/note-hashtags` | 公開前のハッシュタグ生成 |
| **`/note-prepublish-review`（本スキル）** | 公開前の **統合品質ゲート** |
| `scripts/add-note-utm.mjs` | 公開直前の UTM 一括付与 |
| `.claude/scripts/build-note-published-index.mjs` | 公開済み記事インデックス生成 |
| `note-link-injector` agent | リンク注入の Generator |
| `svg-figure-auditor` agent | 図版品質の Evaluator |
| `note-fact-checker` agent | 事実性の Evaluator |
| `.claude/knowledge/reference/note-svg-policy.md` | 図版品質ルールの真実源 |
| `.claude/skills/social/social-post/SKILL.md` | リンク注入ルールの真実源 |

## 実行例

```
/note-prepublish-review 総監択一式17年分分析
/note-prepublish-review 総監                         # 先頭一致で 総監... に解決
/note-prepublish-review 一般 --audit-only            # リンク注入はスキップ、監査のみ
/note-prepublish-review 論文骨子 --external-fact     # 外部ファクトチェックを opt-in
```

## ハーネス設計上の位置づけ

- **Generator/Evaluator 分離**: link-injection は Generator、figure & fact-check は Evaluator として独立
- **Opus で考え、Sonnet で実行**: 3 エージェントは全て sonnet。最終判断（公開可否）は親 Claude（Opus）が行う
- **シンプル化**: 既存の `social-post`（生成）+ 本スキル（レビュー）の 2 軸で note ワークフローが完結。新規スキル乱立を防ぐ

## 制約

- **対象は `content/note/` 配下のみ**（doboku-note 本体の MDX は `/check-mdx` 等の別スキル管轄）
- **実行は記事 1 本ずつ**（バルク対応は別スキル `/bulk-note-review` を将来検討）
- **本スキルは編集を行いうる**（link-injector による）。`--audit-only` で抑制可能
- **スコープ**: 総監・建設部門・1級・2級土木 いずれの集客記事も対象（試験種不問）

## 公開前 reflow フロー（段落長 4f WARN が出たとき）

Phase 1 4f で「>120字の段落」WARN が出たら、公開前に以下を適用する：

```bash
# 1. 実適用（img/ 参照や見出しは自動保護）
npm run note-reflow -- "{記事ディレクトリ}"

# 2. git diff で画像参照が壊れていないか確認
git diff content/note/...

# 3. commit してから note-publish
```

> ⚠ 2026-06-23 まで `reflow-note-paragraphs.mjs` に画像 alt text 誤分割バグあり（`![` 先頭を対象外にする修正済み）。旧バージョンで実行済みの場合は `fix-alt-text.mjs` で事後修正可。
