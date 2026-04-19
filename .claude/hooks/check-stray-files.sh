#!/bin/bash
# リポジトリ直下に残った untracked な一時ファイル（スクショ・レンダー等）を警告する Stop フック
# ブロックはしない（警告のみ）。一時出力は .tmp/ 配下に出すこと（詳細: .tmp/README.md）

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$REPO_ROOT" || exit 0

# untracked + ignored（.gitignore で除外された）画像等のうち、リポジトリ直下のもののみ抽出
stray=$(
  {
    git ls-files --others --exclude-standard \
      -- '*.png' '*.jpg' '*.jpeg' '*.gif' '*.webp' '*.svg' '*.tmp' '*.bak' 2>/dev/null
    git ls-files --others --ignored --exclude-standard \
      -- '*.png' '*.jpg' '*.jpeg' '*.gif' '*.webp' '*.svg' '*.tmp' '*.bak' 2>/dev/null
  } | awk -F/ 'NF==1' | sort -u
)

[ -z "$stray" ] && exit 0

echo "" >&2
echo "⚠️  リポジトリ直下に一時ファイルが残っています:" >&2
echo "$stray" | sed 's/^/    /' >&2
echo "" >&2
echo "    → 次回から .tmp/ 配下に出してください（詳細: .tmp/README.md）" >&2
echo "    → 不要なら: rm <ファイル名>  または  rm .tmp/*" >&2
echo "" >&2

exit 0
