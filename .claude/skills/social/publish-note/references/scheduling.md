> **doboku-note 版で読む前に**: 本ファイルは note.com エディタ操作の共通ノウハウ（stats47 由来）です。**アカウント=note.com/dobokunote、Chrome プロファイル、記事パス（content/note/技術士総監/magazines/...）、frontmatter（notePricing/price）、有料境界、ハッシュタグ/カバー/PDF の doboku-note 固有差分は、先に publish-note/SKILL.md の「stats47 → doboku-note 差分マップ」を読むこと。** 本文中の Profile 5 / note.com/stats47 / docs/31_note記事原稿 / is_paid・price_jpy は stats47 の例であり、doboku-note では SKILL.md の対応に読み替える。

# 予約投稿・公開設定の手順

> このファイルは `publish-note` スキルの詳細手順です。概要は [SKILL.md](../SKILL.md) を参照。

## Phase 7: 公開設定（タグ・有料設定・予約投稿）

## 実行順序

```
公開に進む クリック
  ↓
公開設定画面が開く
  ↓
[Phase 7-Pricing] is_paid=true なら 有料 ラジオを選択 + 価格入力
  ↓
[Phase 7-Tags] ハッシュタグ入力
  ↓
[Phase 7-Schedule] 予約日時設定（note は現在 無料で予約公開可） / または「今すぐ公開」
  ↓
[Phase 7-Submit] 投稿する or 予約投稿 or 有料エリア設定 (有料時) ボタンをクリック
```

## Phase 7-Pricing: 有料記事の販売価格設定（is_paid=true のときだけ実行）

> 検証日: 2026-05-18。通常アカウント（プレミアム未加入）で確認。
> 主要 selector はランタイムで都度取得（index は毎回変わる）。

### 動作確定済みの仕様

1. **公開設定画面では「記事タイプ」セクションに 無料 / 有料 のラジオが横並びで配置されている**
   - state 上の表記:
     - 無料: 親 `<div>` (`[N1]`) + 子 `<span>無料</span>` (`[N1+1]`)
     - 有料: 親 `<div>` (`[N2]`) + 子 `<span>有料</span>` (`[N2+1]`)
2. **有料ラジオをクリックすると以下が同時に起こる**
   - 「価格」ヘッダ + Shadow DOM 内の `<input type=text id=price placeholder=300 value=300>` が現れる
   - 画面右上の「投稿する」ボタンの label が **「有料エリア設定」** に変わる（= ボディ側で有料境界を設定するモードへ遷移する次画面が起動するボタン）
3. **`#price` input は最初に value=300 が入っている**。`type` で追加すると "3001200" のように連結されるので、必ず JS で value を上書きしてから input/change イベントを dispatch する
4. **「有料エリア設定」画面ではボディ上で有料境界（区切り線）を選択する必要がある**。本検証では当該画面まで進んでいないため自動化未確定。下記「未確定領域」を参照
5. **予約投稿は現在は無料（誰でも可）**。2026 年時点で予約公開は note プレミアム不要（旧仕様「プレミアム加入者のみ」は撤回）。Windows Playwright 版 `scripts/note-publish.mjs` は `--schedule "YYYY-MM-DDTHH:MM"`（JST）で予約投稿に対応（時間ずらしバッチは `note-publish-magazine.mjs --schedule-start ... --interval-hours N`）。日時を UI で確定できないときは即時公開せず下書きに退避する安全弁つき。selector は本ファイル由来で初回実走の `.tmp/np-sched-*.png` で要確認。

### 自動操作 step

```bash
# 前提: 「公開に進む」を既にクリック済み、公開設定画面が開いている

PRICE=$(jq -r '.priceJpy' /tmp/note-data-<slug>.json)
IS_PAID=$(jq -r '.isPaid' /tmp/note-data-<slug>.json)

if [ "$IS_PAID" = "true" ] && [ "$PRICE" -gt 0 ]; then
  echo "[Phase 7-Pricing] 有料記事として price=$PRICE 円を設定"

  # 7P-1. state を取得して 有料 ラジオの index を見つける
  browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt

  # "有料" span の親 div (1 つ上の行) の index を取る
  # state 上のパターン:
  #   [823]<div />
  #   [824]<span />
  #       有料
  # → 親 div の index ([823]) をクリック対象にする
  PAID_PARENT_IDX=$(grep -B2 '^[[:space:]]*有料$' /tmp/note-state.txt \
    | grep -oE '\[[0-9]+\]<div' | tail -1 | grep -oE '[0-9]+')
  if [ -z "$PAID_PARENT_IDX" ]; then
    echo "ERROR: 有料 ラジオが見つからない。販売価格設定を中断"
    exit 1
  fi
  browser-use --headed --profile "Profile 5" click "$PAID_PARENT_IDX"
  sleep 3

  # 7P-2. 価格 input (Shadow DOM 内 id=price) の value を JS で上書き
  #   理由: 既に value=300 が入っているため type すると連結される
  #         Shadow DOM 内のため CSS で querySelector できないので
  #         deep tree walk で id=price input を探す
  ESCAPED_PRICE=$(printf '%s' "$PRICE" | sed 's/"/\\"/g')
  browser-use --headed --profile "Profile 5" eval "
    function findPriceInput(root) {
      if (!root) return null;
      try {
        const el = root.querySelector && root.querySelector('input#price');
        if (el) return el;
      } catch(e) {}
      const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
      for (const node of all) {
        if (node.shadowRoot) {
          const f = findPriceInput(node.shadowRoot);
          if (f) return f;
        }
      }
      return null;
    }
    const input = findPriceInput(document);
    if (!input) { 'price input not found'; }
    else {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '$ESCAPED_PRICE');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      'set price to ' + input.value;
    }
  "
  sleep 2

  # 7P-3. 価格が反映されたか state で確認
  browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
  if grep -qE "input type=text id=price[^/]*value=$PRICE" /tmp/note-state.txt; then
    echo "[Phase 7-Pricing] 価格 $PRICE 円を反映済"
  else
    echo "WARN: 価格反映を state 上で確認できない。手動確認を推奨"
  fi
fi
```

### 未確定領域（要追加検証）

以下は本検証では到達していない。実装する前に同じ手順で DOM 投資を行うこと:

1. **有料エリア設定画面の DOM**
   - 「有料エリア設定」ボタンをクリックした後、ボディ上で有料境界を指定する画面が現れる
   - frontmatter の `ここから先は有料部分:` マーカー行を境界として自動選択する手法は未確認
   - 暫定対応: `is_paid=true` のときは Phase 7-Pricing で価格設定までを自動化し、有料エリア設定ボタン押下以降は**手動で完了**するよう案内を出す
2. **投稿実行ボタン（有料エリア設定確認 → 投稿）の selector**
   - 上記画面に到達後、最終的に「投稿する」を押す flow も未検証
3. **予約投稿との併用**
   - is_paid=true + 予約投稿 の同時指定がどの順番で UI 操作が必要か未検証

### 暫定運用ルール

- **完全自動化対応**: `is_paid=false`（無料記事）の場合のみ Phase 7 全自動
- **半自動化対応**: `is_paid=true` の場合は Phase 7-Pricing まで自動 → 「有料エリア設定」ボタン以降は人間が手動完了
- スキル完了時のレポートで `is_paid=true` の記事は「有料エリア設定が未完了」と明記する

---

## 即時公開フロー（日時指定なし）

予約投稿日時を指定しない場合でも、Phase 7 で即時公開できる。

### 7-0. 公開に進む → 「今すぐ公開」

```bash
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
PUB_IDX=$(find_idx "公開に進む")
browser-use --headed --profile "Profile 5" click $PUB_IDX
sleep 3

# ハッシュタグ入力（hashtags.txt 優先・無ければ tags.txt、head -50）
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
TAG_IDX=$(find_idx "ハッシュタグを追加する")
browser-use --headed --profile "Profile 5" click $TAG_IDX
# タグファイル | head -50 の各タグを入力（7-2 と同じ手順）

# 日時設定をスキップして「今すぐ公開」をクリック
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
NOW_IDX=$(find_idx "今すぐ公開")
browser-use --headed --profile "Profile 5" click $NOW_IDX
sleep 3
```

---

## 予約投稿フロー（日時指定あり）

### 7-1. 公開に進む

```bash
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
PUB_IDX=$(find_idx "公開に進む")
browser-use --headed --profile "Profile 5" click $PUB_IDX
sleep 3
```

### 7-2. ハッシュタグ入力

```bash
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
TAG_IDX=$(find_idx "ハッシュタグを追加する")
browser-use --headed --profile "Profile 5" click $TAG_IDX
```

タグファイルの各タグについて入力する。タグファイルは **`hashtags.txt` を優先し、無ければ `tags.txt`** を使う（koumuin-claude-code シリーズは各記事に `hashtags.txt`（90 タグのプール）を持つ）。

note のハッシュタグ投稿上限の都合で **`head -50` で上位 50 個に絞る**（hashtags.txt の先頭ほど重要なタグ。実際の上限は投稿時に要確認、超過分は弾かれるだけで害はない）:

```bash
TAGFILE="<articleDir>/hashtags.txt"
[ -f "$TAGFILE" ] || TAGFILE="<articleDir>/tags.txt"
while IFS= read -r tag; do
  [ -z "$tag" ] && continue
  browser-use --headed --profile "Profile 5" type "$tag"
  browser-use --headed --profile "Profile 5" keys Enter
  sleep 0.5
done < <(head -50 "$TAGFILE")
```

### 7-3. 予約投稿の日時設定

```bash
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
SCHED_IDX=$(find_idx "日時の設定")
browser-use --headed --profile "Profile 5" click $SCHED_IDX
sleep 2
```

カレンダーで日付を選択:

```bash
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
# aria-label="Choose YYYY年M月D日..." の要素を検索
DATE_IDX=$(find_idx "Choose <YYYY>年<M>月<D>日")
browser-use --headed --profile "Profile 5" click $DATE_IDX
sleep 1
```

時刻リストから時間を選択:

```bash
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
TIME_IDX=$(find_idx "<HH:MM>")
browser-use --headed --profile "Profile 5" click $TIME_IDX
sleep 1
```

### 7-4. 予約投稿を実行

```bash
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
RESERVE_IDX=$(find_idx "予約投稿")
browser-use --headed --profile "Profile 5" click $RESERVE_IDX
sleep 3
```

完了ダイアログが表示されたら「閉じる」をクリック:

```bash
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
CLOSE_IDX=$(find_idx "閉じる")
if [ -n "$CLOSE_IDX" ]; then
  browser-use --headed --profile "Profile 5" click $CLOSE_IDX
  sleep 1
fi
```
