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
import { execFileSync } from "child_process";

// worktree 対応: worktree では .git はファイル（gitdir ポインタ）なので
// 相対 ".git/hooks" は解決できない。共有フックの実体パスを git に問い合わせる。
function resolveHooksDir() {
  try {
    const p = execFileSync("git", ["rev-parse", "--git-path", "hooks"], {
      encoding: "utf8",
    }).trim();
    if (p) return p;
  } catch {
    /* fall through */
  }
  return join(".git", "hooks");
}

const HOOKS_DIR = resolveHooksDir();
const HOOK_PATH = join(HOOKS_DIR, "pre-commit");

const HOOK_CONTENT_BODY = `#!/bin/sh
# Pre-commit hooks
# Installed by: npm run pre-commit:install

# 記事の dateModified を commit の瞬間に frontmatter へ書く（2026-08-22）。
#
# 日付の真実源は frontmatter で、sitemap lastmod / JSON-LD datePublished / RSS が
# そこから作られる。以前はビルド時に git log から引いていたが、公開 SEO 信号が
# リポジトリ基盤に依存してしまい、リネーム・移行・履歴書換えのたびに全ページの
# 日付が黙って動いた（2026-08-18 の情報アーキテクチャ移行で全 1,084 記事が
# created まで巻き戻った）。ビルドが全履歴を要求する副作用もあった。
#
# **このフックが無いと frontmatter はまた古びる**（反転前の実測で 1,117 件中
# 1,040 件が中央値 49 日ズレていた）。部分 staging のファイルは触らず警告する。
# 回避は SKIP_MDX_DATES=1。
if [ "$SKIP_MDX_DATES" != "1" ]; then
  node .claude/scripts/backfill-mdx-dates.mjs --staged
  if [ $? -ne 0 ]; then
    exit 1
  fi
fi

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

# 1級・2級土木 施工経験記述（完成答案集/過去問/予想/想定工事バンク）の解答欄字数超過検出（手書き不可答案の再発防止）
node scripts/keiken-charcount.mjs --staged --strict
if [ $? -ne 0 ]; then
  exit 1
fi

# keiken マガジンが keiken-charcount の探索対象に配線されているか（字数ゲート素通りの再発防止・2026-07-01）
node scripts/check-magazine-wiring.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# 公開したマガジンがサイトで CTA として実際に出るか（published:true にしただけで売り場に
# 出ていない事故の再発防止・2026-08-13）。ゲート自体は 2026-07-31 に作られていたが
# quality:audit にしか配線されておらず、公開の瞬間に誰も走らせていなかったため
# cce-essay-magazine が CTA 0 面のまま公開された。**作ったゲートは走らせて初めてゲート**。
# note-magazines.ts / magazine-placement.ts / hub-cta.ts が staged のときだけ走る（重いので）。
if git diff --cached --name-only | grep -qE '^src/lib/(note-magazines|magazine-placement|hub-cta)\.ts$'; then
  npx tsx scripts/check-magazine-cta-reachability.ts --ci
  if [ $? -ne 0 ]; then
    exit 1
  fi
fi

# note 単品価格がマガジン内・宣言済みシリーズ内で一貫しているか（値上げの当て漏れ・値崩れの再発防止・2026-07-28）
node scripts/check-note-price-consistency.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# マガジン収録の期待値（repo 実数 ↔ SoT 件数表記）。記事を足したのにライブ未収録＋表記も古い
# という事故（2026-08-24 ゼネコン/河川コンサル各2本）の再発防止。ライブ軸は CI 側で見る。
node scripts/check-magazine-membership.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# Markdown の相対リンク ](../x) の実在（check-doc-refs はリンクテキストしか見ない）。
# SKIP_RELATIVE_LINKS=1 で回避
node scripts/check-relative-links.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# 統合済み（_redirects で 301 の転送元）の記事を published: true にして「再公開」してしまう事故を止める。
# 統合の記録は frontmatter ではなく _redirects にしか無いことがあり、目視では気づけない（2026-08-22 実事故）
node scripts/check-published-vs-redirects.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# Git に何を追跡してよいか（生成物・著作権物・巨大 blob・拡張子偽装・同一原本の二重生成）。
# HEAD 4.16GiB / remote 11GB でランナーが落ちるところまで来ているので、まず増加を止める。
# 既存違反は baseline で猶予され、増加だけが FAIL になる。SKIP_GIT_BINARY_POLICY=1 で回避
if [ -z "$SKIP_GIT_BINARY_POLICY" ]; then
  node scripts/check-git-binary-policy.mjs --staged
  if [ $? -ne 0 ]; then
    exit 1
  fi
fi

# 4 領域モデル（docs/content/.claude/実装）への逆戻り検知。廃止した置き場への新規ファイル・
# docs への制作物混入・content への台帳混入。SKIP_INFORMATION_ARCHITECTURE=1 で回避
node scripts/check-information-architecture.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# SNS 投稿（content/sns/**）の /docs/ リンクが本番に実在するか検証（404 投稿の再発防止）
node scripts/check-sns-urls.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# 退役アカウント/ハンドル（404 の note 旧名・凍結 X 旧アカ）への参照（2026-08-13。
# SSOT の1行が死んだまま生成物32本が404リンクを吐いていた事故の再発防止）
node scripts/check-dead-handles.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# 運用記録の「今日」が UTC で出ていないか（JST 09:00 前に走らせると前日付になる事故の再発防止・
# 2026-08-13 に coconala-blog の publishedAt と note-attachments の measuredAt で実発生）
node scripts/check-jst-date.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# 1級・2級土木の公式試験日SSOTと既知の誤日付を検証
node scripts/check-exam-calendar.mjs
if [ $? -ne 0 ]; then
  exit 1
fi

# X月間キャンペーン計画の日付・導線・URL・販売投稿間隔を検証
node scripts/check-x-campaign-plan.mjs
if [ $? -ne 0 ]; then
  exit 1
fi

# スキル/エージェント/docs の .md 参照がリポジトリ内に実在するか検証（SSOT ポインタ破損の再発防止）
node scripts/check-doc-refs.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# backlog タグ行の語彙・[検証:] の実在・完了 prose の混入を検証（台帳が機械読取不能になるのを止める）
node scripts/check-backlog-schema.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# スキル/エージェントの追加・削除・description 変更に台帳更新が伴うか検証（capability ドリフトの再発防止）
node scripts/check-doc-coupling.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# handoff の削除/退避で残タスクの backlog 抽出もれ・_archive 復活を検証（2026-07-14 退避事故の再発防止・SKIP_HANDOFF_EXTRACT=1 で回避）
node scripts/check-handoff-extraction.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# sales-log.json の productId が sales-recorder.md の mapping に文書化されているか検証（売上mapping陳腐化の再発防止）
node scripts/check-sales-mapping.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# ココナラ カタログ(coconala-services.ts)↔state(orders/kpi)↔sales-log の配線ドリフト検証（2026-07-16）
node scripts/check-coconala-wiring.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# ココナラ 受注スナップショット↔orders-log の突合（2026-08-05。オフライン検査・実体取得は npm run coconala-orders）
if [ -f scripts/check-coconala-orders.mjs ]; then
  node scripts/check-coconala-orders.mjs --staged --no-freshness
  if [ $? -eq 1 ]; then
    exit 1
  fi
fi

# ココナラブログ記事のハードゲート（2026-08-12。外部リンク1本でアカウント制限になりうるので commit 時点で止める）
if [ -f scripts/check-coconala-blog.mjs ]; then
  node scripts/check-coconala-blog.mjs --staged
  if [ $? -eq 1 ]; then
    exit 1
  fi
fi

# Brain カタログ(brain-products.ts)↔listings↔dist の配線ドリフト検証（2026-07-22。スクリプトが無いブランチではスキップ＝並行セッション安全）
if [ -f scripts/check-brain-wiring.mjs ]; then
  node scripts/check-brain-wiring.mjs --staged
  if [ $? -ne 0 ]; then
    exit 1
  fi
fi

# トップの資格カード(home-exam-cards.json)と categories.json の整合（公開済み新資格のトップ未掲載の再発防止）
node scripts/check-home-exam-coverage.mjs
if [ $? -ne 0 ]; then
  exit 1
fi

# category-curriculum.json の slug 実在＋career タグ整合（カテゴリページ体系リストの slug 陳腐化・silent drop の再発防止）
node scripts/check-category-curriculum.mjs
if [ $? -ne 0 ]; then
  exit 1
fi

# 転職・キャリア記事が学習系ナビ一覧に混ざらないことを検証（career タグ ⇔ HIGH_INTENT/careerFeatured の整合）
node scripts/check-career-separation.mjs
if [ $? -ne 0 ]; then
  exit 1
fi

# アフィリエイト A8 mat が SSOT 許可リスト(affiliate-mats.json)に存在するか検証（mat タイポ/未登録/失効の取りこぼし防止）
node scripts/check-affiliate-mats.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# affiliate-career-only 違反 prose（添削サービス/講座ブランド等の再提案）を検知（PR#272 取りこぼしの再発防止）
# 2026-08-17 修正: node の直後に $? 判定が無く、間に check-affiliate-wiring の if 複合文が挟まっていたため、
# 末尾の "if [ $? -ne 0 ]" は**複合文の終了ステータス（内側で exit しなければ常に 0）**を見ていた。
# ＝ prose 違反で exit 1 しても commit が通る「壊れたゲート」だった。各 node の直後に判定を置く形へ揃える。
node scripts/check-affiliate-prose.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

if [ -f scripts/check-affiliate-wiring.mjs ]; then
  node scripts/check-affiliate-wiring.mjs --staged
  if [ $? -ne 0 ]; then
    echo "[pre-commit] アフィリ配線（3 ASP）に不整合。commit を中止しました。"
    exit 1
  fi
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

# 本文フォールド内1枚目の図版は eager+fetchpriority=high（LCP 遅延の再発防止・EXP-005）
node scripts/check-lcp-image-hints.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# 定期ジョブが実行するファイルを実行対象外のブランチで変更していないか（WARN・非ブロッキング）
# 「push 先 ≠ 実行ブランチ」の取り違え防止。検査の故障時のみ exit 1 なので判定は付ける。
if [ -f scripts/check-scheduled-exec-branch.mjs ]; then
  node scripts/check-scheduled-exec-branch.mjs --staged
  if [ $? -ne 0 ]; then
    exit 1
  fi
fi

# note 記事ハッシュタグは 90 個以上（発見性ゲート・staged の hashtags*.txt のみ）
node scripts/check-note-hashtags.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# 有料 note 記事の無料プレビュー内に「この記事でわかること」があるか（購入判断材料の欠落防止）
node scripts/check-note-intro-benefit.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# PDF 配布を約束している note 記事に、添付すべき PDF 実体があるか（購入者に届かない事故の source 側）
node scripts/check-note-attachments.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# note 有料記事の有料境界(paidBoundary)が解決可能か（全ロック/漏洩の温床＝RULE_GAP 再発防止）
node scripts/check-note-boundary.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# frontmatter の重複キー（後勝ちで値が黙って入れ替わる）
node scripts/check-note-frontmatter-dup.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# ガイド OGP 主題フォントの下限（長い題が小さく出てカード間でばらつくのを防止、ogp-prompts.md）
node scripts/check-ogp-title-fit.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# note カバー(G2)の banner/hi/leadIn がフル1280幅を超えて画面外で切れる"真の溢れ"を検出（note-cover.md）
node scripts/check-note-cover-fit.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# 図版 SVG の固定キャンバス標準（figure-N.svg=4:5 400x500 / --wide=16:9 640x360）逸脱検出（figure-canvas-policy）
node scripts/check-figure-canvas.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# 孤立 figure（img/figure-*.svg が同記事の本文から未参照＝サイト非表示）検出（結線もれの再発防止）
node scripts/check-orphan-figures.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# 本文が指す「表N.M」のキャプションが実在するか（転記由来の宙に浮いた参照）
node scripts/check-table-references.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# MDX の <ArticleImage> width/height が SVG の実 viewBox と一致するか（キャンバス移行で埋込寸法が
# 旧値のまま取り残される穴。check-figure-canvas は SVG 側しか見ない・2026-08-03 に 26 箇所を是正）
node scripts/check-figure-embed-dims.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# 太字が描画されるか（閉じ/開き ** が flanking を満たさないとアスタリスクが本文に出る）。
# 規則を再実装せず remark で実パースし、text ノードに ** が残るかで判定する。
node scripts/check-bold-rendering.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# MDX の BOM（U+FEFF）。先頭に付くと frontmatter の ^--- が外れ、Kindle ビルダが title を
# 拾えず章名が article.mdx になり YAML が本文に印字される（2026-08-12・審査中の e-02 で発生）。
# 目視できない事故なので機械で止める。EPUB 展開は重いので commit 時は --bom-only。
node scripts/check-kindle-epub-leak.mjs --bom-only
if [ $? -ne 0 ]; then
  exit 1
fi

# note→サイト送客リンクの UTM 規約（生URL単独行=カード化でUTM消失 / inline は utm_source=note 必須）。SKIP_NOTE_UTM=1 で回避
node scripts/check-note-site-utm.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# X→サイト送客リンクの UTM 規約（utm_source=x / utm_medium=social 必須・_archive は対象外）。SKIP_X_UTM=1 で回避
node scripts/check-x-utm.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# IG figure-pack 表紙のテンプレ準拠（2ピル/固定バッジ/doboku-note.com/試験dir配下）逸脱検出（表紙ドリフトの再発防止）
node scripts/check-ig-cover.mjs --staged
if [ $? -ne 0 ]; then
  exit 1
fi

# IG figure-pack CTA のテンプレ準拠（見出し/誘導文/画像内ハッシュタグ禁止）逸脱検出（CTAドリフトの再発防止）
node scripts/check-ig-cta.mjs --staged
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

// 導入済みフックが古いまま走り続ける事故の再発防止（2026-08-13）。
// フックの再インストールは `npm install`（prepare）でしか走らないため、ゲートを追加しても
// 各 worktree / 各マシンの .git/hooks は古いままになる。実際にこの日、CTA 到達検査を
// ソースへ足したのに導入済みフックには入っておらず、無言で素通りしていた。
// 内容ハッシュを印として埋め、フック自身が「自分が古い」ことを検知して落ちるようにする。
import { createHash } from 'node:crypto';
import { readFileSync as _readSelf } from 'node:fs';
// Windows では new URL(...).pathname が "/C:/..." を返し、C:\C:\... に解決されて ENOENT になる。
import { fileURLToPath } from 'node:url';
// ハッシュは **ソーステキスト**（テンプレートリテラルの生の中身）から取る。
// 評価後の文字列から取ると、シェル側が同じ計算を再現できず必ず不一致になる
// （2026-08-13 に一度その実装で誤検知＝全 commit がブロックされた）。
const _selfSrc = _readSelf(fileURLToPath(import.meta.url), 'utf8');
const _bodyMatch = _selfSrc.match(/const HOOK_CONTENT_BODY = `([\s\S]*?)`;/);
const HOOK_HASH = createHash('sha256').update(_bodyMatch ? _bodyMatch[1] : '').digest('hex').slice(0, 12);
const DRIFT_GUARD = `
# --- フック鮮度チェック（install-pre-commit.mjs が埋め込む） ---
# ソース側のゲート構成が変わったのに再インストールしていないと、古いフックが静かに走る。
HOOK_HASH_INSTALLED="${HOOK_HASH}"
HOOK_HASH_SOURCE=$(node -e "
const {createHash}=require('node:crypto');
const s=require('fs').readFileSync('scripts/install-pre-commit.mjs','utf8');
const m=s.match(/const HOOK_CONTENT_BODY = \\\`([\\s\\S]*?)\\\`;/);
process.stdout.write(m?createHash('sha256').update(m[1]).digest('hex').slice(0,12):'unknown');
" 2>/dev/null)
if [ -n "$HOOK_HASH_SOURCE" ] && [ "$HOOK_HASH_SOURCE" != "unknown" ] && [ "$HOOK_HASH_INSTALLED" != "$HOOK_HASH_SOURCE" ]; then
  echo "[pre-commit] 導入済みフックが古い（installed=$HOOK_HASH_INSTALLED source=$HOOK_HASH_SOURCE）。"
  echo "             npm run pre-commit:install を実行してから commit してください。"
  exit 1
fi
# --- ここまで ---
`;
const HOOK_CONTENT = HOOK_CONTENT_BODY.replace(
  '# Installed by: npm run pre-commit:install\n',
  '# Installed by: npm run pre-commit:install\n' + DRIFT_GUARD,
);
writeFileSync(HOOK_PATH, HOOK_CONTENT, { mode: 0o755 });

// Windows doesn't use chmod, but set it for cross-platform compatibility
try {
  chmodSync(HOOK_PATH, 0o755);
} catch {
  // Ignore chmod errors on Windows
}

console.log(`✓ pre-commit hook installed at ${HOOK_PATH}`);
console.log("  MDX files will be validated before each commit.");
