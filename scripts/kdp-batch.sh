#!/bin/zsh
# KDP 連続提出＋出版ドライバ（2026-07-27 の実運用で確立。10冊を無人で処理した実績）
#
# 使い方: npm run kdp-batch -- f-08 f-09 f-10 ...   （id を順に処理）
#
# 1 冊あたりのサイクル（約 3.5 分）:
#   1. EPUB/表紙を Downloads へ配置（sync-kindle-dist）
#   2. 下書き提出（kdp-publish --id）
#   3. **Chrome 終了＋プロファイル exit_type 正常化** ← 必須。これを挟まないと
#      前段の Chrome とプロファイルが競合して無言でハングする（2026-07-27 に 3 回発生）
#   4. 出版（--publish-only --commit-publish）
#      ※ --commit-publish 単独は全フローをやり直すため、カテゴリー設定済みの下書きで
#        「[cat] L0 選択失敗 → ABORT」になる。--publish-only は価格ページ直行で安全
#   5. catalog.json を in_review + draftAsin へ更新
#
# 中断条件（いずれも即 exit・出版はしない）:
#   - EPUB が Downloads に無い（exit 1）
#   - 下書きで ABORT / 作成数制限（exit 2）… KDP「本の作成数制限を超えました」ダイアログ。
#     数日で枠が回復するので、回復後に残りの id を渡して再開する
#   - 下書きが [done] に到達しない（exit 3）
#   - 出版結果が「結果: OK」でない（exit 4）
# ※ 価格/ロイヤリティの期待値突合は kdp-publish.mjs 側が行い、不一致なら出版せず停止する。
#
# 真実源: .claude/skills/conversion/kdp-publish/SKILL.md
set -u
cd "$(dirname "$0")/.." || exit 1
LOG=.tmp/kdp-batch.log
mkdir -p .tmp
: > "$LOG"

clean_profile() {
  pgrep -f "playwright-kdp-profile" | xargs -r kill 2>/dev/null
  sleep 4
  pgrep -f "playwright-kdp-profile" | xargs -r kill -9 2>/dev/null
  sleep 1
  python3 - <<'PY' 2>/dev/null
import json
p='.local/playwright-kdp-profile/Default/Preferences'
try:
    d=json.load(open(p,encoding='utf-8')); d.setdefault('profile',{})['exit_type']='Normal'
    d['profile']['exited_cleanly']=True
    json.dump(d, open(p,'w',encoding='utf-8'), ensure_ascii=False)
except Exception: pass
PY
  rm -f .local/playwright-kdp-profile/SingletonLock .local/playwright-kdp-profile/SingletonCookie .local/playwright-kdp-profile/SingletonSocket 2>/dev/null
}

for ID in "$@"; do
  echo "===== $ID 開始 $(date +%H:%M:%S) =====" | tee -a "$LOG"

  npm run --silent sync-kindle-dist -- --downloads "$ID" >> "$LOG" 2>&1
  if [ ! -f "$HOME/Downloads/kindle-$ID.epub" ]; then
    echo "STOP: $ID の EPUB が Downloads に無い" | tee -a "$LOG"; exit 1
  fi

  clean_profile
  D=.tmp/kdp-$ID-draft.log
  node scripts/kdp-publish.mjs --id "$ID" > "$D" 2>&1
  if grep -qE "ABORT|制限|上限|作成できる本の数" "$D"; then
    echo "STOP: $ID 下書きで異常" | tee -a "$LOG"; tail -5 "$D" | tee -a "$LOG"; exit 2
  fi
  if ! grep -q "\[done\] DRAFT 完了" "$D"; then
    echo "STOP: $ID 下書きが完了しなかった" | tee -a "$LOG"; tail -5 "$D" | tee -a "$LOG"; exit 3
  fi
  DA=$(grep -oE "draft ASIN: [A-Z0-9]+" "$D" | head -1 | awk '{print $3}')
  echo "  draft OK: $DA" | tee -a "$LOG"

  clean_profile
  P=.tmp/kdp-$ID-pub.log
  node scripts/kdp-publish.mjs --id "$ID" --publish-only --commit-publish > "$P" 2>&1
  if ! grep -q "結果: OK" "$P"; then
    echo "STOP: $ID 出版が OK でない" | tee -a "$LOG"; tail -6 "$P" | tee -a "$LOG"; exit 4
  fi
  echo "  ★出版 OK $(date +%H:%M:%S)" | tee -a "$LOG"

  python3 - "$ID" "$DA" <<'PY' 2>&1 | tee -a "$LOG"
import json,sys
i,da=sys.argv[1],sys.argv[2]
p='scripts/kindle-published/catalog.json'
d=json.load(open(p,encoding='utf-8'))
b=[x for x in d['books'] if x['id']==i][0]
b['status']='in_review'; b['submittedDate']='2026-07-27'
if da: b['draftAsin']=da
json.dump(d, open(p,'w',encoding='utf-8'), ensure_ascii=False, indent=2); open(p,'a').write('\n')
print(f"  catalog: {i} → in_review / {da}")
PY
done
clean_profile
echo "===== 全 $# 冊 完了 $(date +%H:%M:%S) =====" | tee -a "$LOG"
