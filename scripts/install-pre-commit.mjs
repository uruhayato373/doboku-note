/**
 * pre-commitフック設置スクリプト
 *
 * .git/hooks/pre-commit にMDX検証フックを設置する。
 *
 * Usage:
 *   npm run pre-commit:install
 */

import { writeFileSync, chmodSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const HOOKS_DIR = join(".git", "hooks");
const HOOK_PATH = join(HOOKS_DIR, "pre-commit");

const HOOK_CONTENT = `#!/bin/sh
# Pre-commit hooks
# Installed by: npm run pre-commit:install

# MDX validation
node scripts/pre-commit-mdx.mjs
if [ $? -ne 0 ]; then
  exit 1
fi

# Dark mode border lint (TSX)
node scripts/lint-ui.mjs
if [ $? -ne 0 ]; then
  exit 1
fi

# note article (.md) note-compat lint (markdown 表 / 太字内全角括弧 / 文字化け)
node scripts/note-lint.mjs
if [ $? -ne 0 ]; then
  exit 1
fi

# 建設部門 BK マガジン模範解答の字数ハード上限（答案枚数×600字）超過検出（手書き不可答案の再発防止）
node scripts/check-note-charlimits.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# SNS 投稿（docs/sns/**）の /docs/ リンクが本番に実在するか検証（404 投稿の再発防止）
node scripts/check-sns-urls.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# スキル/エージェント/docs の .md 参照がリポジトリ内に実在するか検証（SSOT ポインタ破損の再発防止）
node scripts/check-doc-refs.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# スキル/エージェントの追加・削除・description 変更に台帳更新が伴うか検証（capability ドリフトの再発防止）
node scripts/check-doc-coupling.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# sales-log.json の productId が sales-recorder.md の mapping に文書化されているか検証（売上mapping陳腐化の再発防止）
node scripts/check-sales-mapping.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# トップの資格カード(home-exam-cards.json)と categories.json の整合（公開済み新資格のトップ未掲載の再発防止）
node scripts/check-home-exam-coverage.mjs
if [ $? -ne 0 ]; then
  exit 1
fi

# アフィリエイト A8 mat が SSOT 許可リスト(affiliate-mats.json)に存在するか検証（mat タイポ/未登録/失効の取りこぼし防止）
node scripts/check-affiliate-mats.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# ポリシークラスタ（決定が複数文書に散在）の横展開もれリマインダ＋台帳 rot 検出（意味的ドリフトの再発防止）
# クラスタ提示は advisory（exit 0）。台帳の files/anchor が実在しない場合のみ exit 1 でブロック。
node scripts/check-policy-anchors.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# ガイド記事（group: guide）の本文 3,000 字下限（薄い記事の再発防止、content-principles §25）
node scripts/check-guide-length.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# 図版 SVG の固定キャンバス標準（figure-N.svg=4:5 400x500 / --wide=16:9 640x360）逸脱検出（figure-canvas-policy）
node scripts/check-figure-canvas.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# note→サイト送客リンクの UTM 規約（生URL単独行=カード化でUTM消失 / inline は utm_source=note 必須）。SKIP_NOTE_UTM=1 で回避
node scripts/check-note-site-utm.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# IG figure-pack 表紙のテンプレ準拠（2ピル/固定バッジ/doboku-note.com/試験dir配下）逸脱検出（表紙ドリフトの再発防止）
node scripts/check-ig-cover.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi
`;

if (!existsSync(HOOKS_DIR)) {
  mkdirSync(HOOKS_DIR, { recursive: true });
}

if (existsSync(HOOK_PATH)) {
  console.log(`Existing pre-commit hook found at ${HOOK_PATH}.`);
  console.log("Overwriting with MDX validation hook.");
}

writeFileSync(HOOK_PATH, HOOK_CONTENT, { mode: 0o755 });

// Windows doesn't use chmod, but set it for cross-platform compatibility
try {
  chmodSync(HOOK_PATH, 0o755);
} catch {
  // Ignore chmod errors on Windows
}

console.log(`✓ pre-commit hook installed at ${HOOK_PATH}`);
console.log("  MDX files will be validated before each commit.");
