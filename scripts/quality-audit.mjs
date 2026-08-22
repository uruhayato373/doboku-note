#!/usr/bin/env node
/**
 * quality-audit.mjs — コード・記事・画像/SVG の機械チェックを横断実行する統合 orchestrator。
 *
 * 既存の check-* / lint / test / build 系スクリプトを宣言的な CHECKS 配列で束ね、
 * 各チェックの pass/fail/skip/timeout・所要時間・stdout 要約を1回で収集する。
 * pre-commit（staged ゲート）や個別 npm script を置き換えるものではなく、
 * 「いま全部通るか」を1コマンドで俯瞰し、レポート化するための上位ランナー。
 *
 * 使い方:
 *   node scripts/quality-audit.mjs         # 全チェック実行 → .claude/state/quality/audit-latest.{json,md}
 *   node scripts/quality-audit.mjs --ci    # ci:true の厳格サブセットのみ・fail/timeout で exit 1・レポート書込なし
 *   node scripts/quality-audit.mjs --json  # 結果 JSON を stdout に出す（レポートファイルも書く）
 *
 * 設計:
 *   - 各チェックは spawnSync で独立プロセス実行。timeout 到達で SIGTERM → status='timeout'（ハング対策完結）。
 *   - `ci: true` = マージ前に守るべき厳格チェック（型・テスト・MDX・lint・ラチェット・リンク・台帳整合）。
 *   - `ci: false` = report-only（棚卸し・情報提供。census/knip/env-inventory 等。--ci では実行しない）。
 *   - `skip(env)` が理由文字列を返したらスキップ（dev server 必須・build 成果物必須など）。
 *   - 外部 API・公開更新（note/R2/deploy/fetch-*）は定義に載せない（副作用ゼロを保証）。
 *   - 存在しない npm script は skip 扱い（新チェックの段階導入に耐える）。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const OUT_DIR = join(ROOT, '.claude', 'state', 'quality');
const JSON_OUT = join(OUT_DIR, 'audit-latest.json');
const MD_OUT = join(OUT_DIR, 'audit-latest.md');
const CENSUS = join(OUT_DIR, 'census.json');

const argv = process.argv.slice(2);
const CI = argv.includes('--ci');
const EMIT_JSON = argv.includes('--json');

function readJson(p, fallback) {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; }
}

const PKG = readJson(join(ROOT, 'package.json'), { scripts: {} });

// localhost:port が LISTEN しているか（dev server 検出）。500ms で諦める。
function portOpen(port) {
  return new Promise((res) => {
    const sock = net.connect({ host: '127.0.0.1', port }, () => { sock.destroy(); res(true); });
    sock.on('error', () => res(false));
    sock.setTimeout(500, () => { sock.destroy(); res(false); });
  });
}

// ---- チェック定義 ---------------------------------------------------------
// npm: package.json の script 名 / cmd: 直接コマンド配列。どちらか一方。
const CHECKS = [
  // ── ci:true 厳格ゲート ──
  { id: 'type-check', npm: 'type-check', timeout: 240_000, ci: true },
  { id: 'unit-tests', npm: 'test', timeout: 180_000, ci: true },
  // `npm test` は tests/*.test.mjs しか見ない。.claude/scripts/ads/__tests__/ の 3 本（38 テスト）は
  // 別 script になっていて、2026-08-17 まで**どの CI にも登録されておらず誰も走らせていなかった**。
  { id: 'ads-tests', npm: 'test:ads', timeout: 120_000, ci: true, note: 'A8/もしも/afb のサイト帰属ガードと CSV 正規化の単体テスト' },
  // 2026-08-17: check-gate-parity で「どこからも呼ばれていない」と判明したため配線（実行して緑を確認）。
  { id: 'public-bloat', npm: 'check-public-bloat', timeout: 60_000, ci: true, note: 'public/ の生成物滞留（放置するとビルドが落ちる）' },
  { id: 'gate-parity', npm: 'check-gate-parity:ci', timeout: 60_000, ci: true, note: 'pre-commit / quality-audit / workflow のどこからも呼ばれていない検査を検出（オーファン化の防止）' },
  { id: 'eslint', npm: 'lint', timeout: 180_000, ci: true },
  { id: 'validate-mdx', npm: 'validate-mdx', timeout: 180_000, ci: true },
  { id: 'content-quality-ratchet', npm: 'check-content-quality:ci', timeout: 240_000, ci: true, note: 'latest-report.md を上書き' },
  { id: 'frontmatter', cmd: ['node', '.claude/scripts/lint-frontmatter.mjs', '--all'], timeout: 180_000, ci: true },
  { id: 'svg-audit', npm: 'audit-svg:ci', timeout: 180_000, ci: true, note: 'svg-audit.json を上書き' },
  { id: 'image-assets', npm: 'check-image-assets:ci', timeout: 120_000, ci: true },
  { id: 'orphan-figures', npm: 'check-orphan-figures', timeout: 90_000, ci: true },
  { id: 'backlog-schema', npm: 'check-backlog-schema', timeout: 30_000, ci: true, note: 'backlog タグ行の語彙・[検証:]の実在・パーサ契約（admin と sweep が同じカードを見ているか）' },
  { id: 'external-write-orphans', npm: 'check-external-write-orphans', timeout: 300_000, ci: false, note: '「外部へは成功・台帳の書き戻しは失敗」の検出（2026-06-17 の YouTube 事故＝6本アップ済みなのに台帳 pending が実例）。gh 経由で run ログを読むためネットワークが要る＝ci:false。**読み手は /weekly-review の backlog 消化サマリ節**（同節へコマンドを配線済み）' },
  { id: 'ogp-line-count', npm: 'check-ogp-line-count', timeout: 180_000, ci: false, note: 'OGP タイトルの折返し行数を実測する surfacer（判定はしない）。読み手＝DN-0057 の着手時。check-ogp-title-fit はフォントサイズしか見ていないので、行数はここでしか分からない' },
  { id: 'relative-links', npm: 'check-relative-links', timeout: 60_000, ci: true, note: 'Markdown の相対リンク `](../x)` の実在。check-doc-refs はリンクテキストしか見ないので、置き場を変えると href だけが黙って壊る' },
  { id: 'workflow-clone-depth', npm: 'check-workflow-clone-depth', timeout: 30_000, ci: true, note: 'workflow の full clone 禁止。remote 11 GB でランナーの空きを超え、fetch-depth: 0 は No space left on device でランナーごと落ちる（2026-08-21 実発生）' },
  { id: 'workflow-publish-ref', npm: 'check-workflow-publish-ref', timeout: 30_000, ci: true, note: 'schedule workflow の checkout ref。ref を書かないと main を checkout し、npm ci が main のフックを入れたまま develop へ commit して drift guard に弾かれる（2026-08 に 3 回発生）' },
  { id: 'information-architecture', npm: 'check-information-architecture', timeout: 60_000, ci: true, note: '4 領域モデル（docs/content/.claude/実装）への逆戻り検知。廃止した置き場への新規ファイル・docs への制作物混入・content への台帳混入・二重 SSOT' },
  { id: 'content-layout', npm: 'check-content-layout', timeout: 60_000, ci: true, note: 'content/ の移行インベントリ（件数・容量・二重 SSOT）を read-only で観測' },
  { id: 'project-task-refs', npm: 'check-project-task-refs', timeout: 30_000, ci: true, note: 'docs/ の廃止参照（task-queue.json）と backlog ID 参照切れ。error は判断の余地がなく直し方も自明なのでゲート' },
  { id: 'backlog-health', npm: 'check-backlog-health', timeout: 30_000, ci: false, note: '台帳の候補 surfacer（沈んだ不具合・定期の混入・重複候補）。読み手は /weekly-review Phase 2 と /backlog-sweep --audit' },
  { id: 'mdx-dates', npm: 'check-mdx-dates', timeout: 60_000, ci: true, note: '記事日付が frontmatter に揃っているか（欠けるとビルドが git 履歴へフォールバックし、公開 SEO 信号がリポジトリ操作で動く状態に逆戻りする）' },
  { id: 'note-cover-tokens', npm: 'check-note-cover-tokens', timeout: 30_000, ci: true, note: 'note カバーの資格トークンが実ディレクトリを網羅しているか。未登録 dir は生成器が無言で総監へ落とし、色だけでなく資格ラベルまで総監のまま出荷される（2026-08-18 に技術士一次で1か月超の誤出荷が判明）' },
  { id: 'table-references', npm: 'check-table-references', timeout: 90_000, ci: true, note: '本文が指す表N.Mのキャプションが実在するか（転記由来の宙に浮いた参照）' },
  { id: 'figure-embed-dims', npm: 'check-figure-embed-dims', timeout: 90_000, ci: true, note: 'ArticleImage の width/height と SVG の実 viewBox の突合。従来は r2-audit（週次 cron）と pre-commit(staged) だけで、push 経路に backstop が無かった' },
  { id: 'bold-rendering', npm: 'check-bold-rendering', timeout: 120_000, ci: true, note: '閉じ/開き ** が flanking を満たさず太字にならずアスタリスクが本文に出る事故。remark で実パースして text ノードに ** が残るかで判定する（規則の再実装ではない）' },
  { id: 'orphan-ogp', npm: 'check-orphan-ogp', timeout: 90_000, ci: true },
  // 2026-08-18: 実質オーファンだった（package.json にはあるがどの経路にも配線なし）。EPUB の書式インバリアントは epubcheck が見ない領域で、ビルダー 2 本に CSS/構造がコピー実装されている。
  { id: 'kindle-format', npm: 'check-kindle-format', timeout: 300_000, ci: true, note: '配布 EPUB の書式インバリアント（本文可読性・章の改ページ・解答のネタバレ改ページ）。ローカルは EDR のファイル走査律速で数分かかるが CI では速い。0 冊なら exit 2（検査不成立）' },
  { id: 'kindle-epub-leak', npm: 'check-kindle-epub-leak', timeout: 180_000, ci: true, note: '配布 EPUB に章タイトル article.mdx / YAML frontmatter が印字される事故（2026-08-12・e-02 は審査中だった）。真因はソース MDX の BOM で frontmatter の ^--- が外れること。EPUB 実展開＋ソース BOM の二段で検査する' },
  { id: 'figure-crop-integrity', npm: 'check-figure-crop:ci', timeout: 180_000, ci: true, note: '図クロップの写り込み（STRAY_SLIVER）を baseline 比の新規のみ gate。figure-crop-report.json を上書き' },
  { id: 'guide-length', npm: 'check-guide-length', timeout: 90_000, ci: true },
  { id: 'lcp-image-hints', npm: 'check-lcp-image-hints', timeout: 60_000, ci: true, note: '本文フォールド内1枚目の図版は eager+fetchpriority=high（lazy だと低速回線で LCP が数秒伸びる・EXP-005）' },
  { id: 'scheduled-exec-branch', npm: 'check-scheduled-exec-branch', timeout: 60_000, ci: false, note: '定期ジョブの実行ブランチ対応表（棚卸し）。WARN 判定は現ブランチ依存のため CI では意味が薄く report-only' },
  { id: 'home-exam-coverage', npm: 'check-home-exam-coverage', timeout: 60_000, ci: true },
  { id: 'character-avatars', npm: 'check-character-avatars', timeout: 60_000, ci: true, note: 'note CTA のキャラアバター: manifest siteCta ⇔ 配信 webp ⇔ ctaPose union の三者整合（union だけ広げると本番 404）' },
  { id: 'category-curriculum', npm: 'check-category-curriculum', timeout: 60_000, ci: true },
  { id: 'career-separation', npm: 'check-career-separation', timeout: 60_000, ci: true },
  { id: 'ssot-consumers', npm: 'check-ssot-consumers', timeout: 60_000, ci: true },
  { id: 'sales-freshness', npm: 'check-sales-freshness', timeout: 30_000, ci: true, note: '売上転記が止まっていないか（updatedAt が 21 日超で赤）。2026-07 は 18% しか転記されず 34 日誰も気づかなかった' },
  { id: 'sales-mapping', npm: 'check-sales-mapping', timeout: 60_000, ci: true, note: 'sales-log の productId が sales-recorder.md の mapping に文書化されているか（pre-commit のみだった backstop を push 経路にも）' },
  { id: 'note-funnel', npm: 'check-note-funnel', timeout: 90_000, ci: true },
  { id: 'magazine-cta-reachability', npm: 'check-magazine-cta:ci', timeout: 120_000, ci: true, note: '公開マガジンがサイト内で 1 面以上 CTA として出るか（top / 中間CTA / MagazineCard）。baseline 外の新規 0 面で落ちる' },
  { id: 'note-hashtags', npm: 'check-note-hashtags', timeout: 90_000, ci: true, note: 'note 記事ハッシュタグ 90 個以上（全量 backstop・pre-commit は staged のみ）' },
  { id: 'note-boundary', npm: 'check-note-boundary', timeout: 90_000, ci: true, note: 'paid published 記事の有料境界(paidBoundary)解決可能性（全ロック/漏洩の RULE_GAP 再発防止・全量）' },
  { id: 'note-paid-cta', npm: 'check-note-paid-cta', timeout: 90_000, ci: true, note: '有料記事の L2 もくじ CTA が有料境界より前（無料プレビュー内）にあるか。末尾配置は非購入者に不可視' },
  { id: 'note-frontmatter-dup', npm: 'check-note-frontmatter-dup', timeout: 60_000, ci: true, note: 'frontmatter トップレベルキーの重複。YAML 重複キーで gray-matter が停止し PDF 生成が落ちる' },
  { id: 'note-link-cards', npm: 'check-note-link-cards', timeout: 60_000, ci: true, note: '自社note記事はサイト管理画像付き NoteLink に限定。生リンク・旧noteカバー・画像欠落を禁止' },
  { id: 'note-membership', npm: 'check-note-membership', timeout: 60_000, ci: true, note: 'メンバーシップの会費/定員/planId が SSOT config と一致するか。note は会費を変更できずプラン作り直しが唯一の手段なので、ドリフト放置は修復不能に近づく（--live は実機突合・ローカル専用）' },
  { id: 'doc-refs', npm: 'check-doc-refs', timeout: 90_000, ci: true },
  { id: 'dead-handles', npm: 'check-dead-handles', timeout: 60_000, ci: true, note: '退役ハンドル（404 note旧名・凍結X旧アカ）への参照' },
  { id: 'jst-date', npm: 'check-jst-date', timeout: 30_000, ci: true, note: '運用記録の日付がUTCで前日付になっていないか' },
  { id: 'exam-calendar', npm: 'check-exam-calendar', timeout: 30_000, ci: true, note: '1級・2級土木の公式試験日SSOTと既知誤記を検査' },
  { id: 'x-campaign-plan', npm: 'check-x-campaign-plan', timeout: 30_000, ci: true, note: 'X月間計画の日付・導線・URL・販売投稿間隔を検査' },
  // BROKEN_SLUG 166→0（RelatedKeywords 解決を categories.json 由来へ統一・2026-07-13）を受け、
  // site scope の内部リンク切れを ci gate へ昇格（--scope site。build 前 source link 契約）。
  { id: 'internal-links', cmd: ['npm', 'run', '--silent', 'check-links', '--', '--scope', 'site'], timeout: 180_000, ci: true, note: 'site scope の /docs・/category・anchor リンク切れ（RelatedKeywords 共通 resolver）' },
  { id: 'katex-warnings', npm: 'audit-katex:ci', timeout: 240_000, ci: true, note: 'build の KaTeX strict 警告を数式単位で検出（remark-math パイプライン。0 件を維持）' },

  // note-meta-lint は 2026-08-16 に Node20 対応済み（glob import → readdirSync）。
  // 2026-08-17 に 49 件を実検査して「違反 0 / 機械ブロック未整備 0」を確認したので
  // report → ゲートへ昇格した。report のまま置くと、また壊れても誰も読まない（§9）。
  { id: 'note-meta-lint', npm: 'note-meta-lint', timeout: 60_000, ci: true, note: 'note掲載文.txt の文字数上限と機械ブロック（セット/単品価格）の整備' },

  // ── report-only（棚卸し・情報提供。--ci では実行しない） ──
  { id: 'coconala-blog', npm: 'check-coconala-blog', timeout: 60_000, ci: true, note: 'ココナラブログ記事のハードゲート（外部リンク1本でアカウント制限になりうる）＋公開済み記事の送客先が listed から外れていないかのドリフト' },
  { id: 'doc-lifecycle', npm: 'check-doc-lifecycle', timeout: 90_000, ci: false },
  { id: 'policy-anchors', npm: 'check-policy-anchors', timeout: 90_000, ci: false },
  { id: 'ogp-coverage', npm: 'check-ogp-coverage', timeout: 90_000, ci: false },
  { id: 'ogp-design', npm: 'check-ogp-design', timeout: 120_000, ci: false },
  { id: 'quality-census', npm: 'quality-census', timeout: 180_000, ci: false, note: 'census.json 再生成（薄層可視化）' },
  { id: 'env-inventory', cmd: ['node', 'scripts/report-env-inventory.mjs'], timeout: 60_000, ci: false },
  { id: 'knip', npm: 'knip', timeout: 300_000, ci: false, note: 'デッドコード候補の全量（要 grep 裏取り・返済は週次レビューの棚卸しで）' },
  // デッドコードの「増加」だけを機械で止めるラチェット（ci ゲート）。
  // knip 本体は false positive を出すので消す判断は人間に残す（＝上の report は維持）が、
  // report のままだと誰も読まずに溜まる。実際 knip は batch-approve.mjs の壊れ import を
  // 報告し続けたまま 4 か月放置された。既存分の返済は強制せず、増やすことだけ禁じる。
  // baseline 更新: npm run check-knip-ratchet -- --update-baseline（2026-08-16 追加）
  // アセット退避の整合ゲート（DN-0111 Phase 3・2026-08-21 追加）。R2 へはアクセスせずオフラインで完結。
  // 「Git から外し・ローカルからも消し・R2 には上がっていなかった」は次に必要になるまで表面化しない。
  { id: 'asset-storage', npm: 'check-asset-storage', timeout: 90_000, ci: true, note: '退避台帳と設定とワークツリーの辻褄（公開バケット誤配置・r2Key 衝突・復元不能・manifest への秘密混入）' },
  // Git に何を追跡してよいかのラチェット（DN-0111 Phase 1・2026-08-21 追加）。
  // 既存違反（教材ページ画像 868 / base64 SVG 756 等）は baseline で猶予し、増加だけを止める。
  // baseline 更新: npm run check-git-binary-policy -- --update-baseline
  { id: 'git-binary-policy', npm: 'check-git-binary-policy', timeout: 120_000, ci: true, note: '生成物・著作権物・巨大 blob・拡張子偽装の新規追跡を baseline ラチェットで止める（HEAD 4.16GiB / remote 11GB の再発防止）' },
  { id: 'knip-ratchet', npm: 'check-knip-ratchet', timeout: 300_000, ci: true, note: 'デッドコードが baseline から増えていないか' },
  {
    id: 'cta-density', npm: 'check-cta-density', timeout: 90_000, ci: false,
    skip: () => existsSync(join(ROOT, 'out', 'docs')) ? null : 'ビルド成果物 out/docs が無い（npm run build 後に実行）',
  },
  {
    id: 'seo-meta', npm: 'check-seo-meta', timeout: 300_000, ci: false,
    skip: async () => (await portOpen(3020)) ? null : 'dev server (localhost:3020) 不在（npm run dev 起動時のみ実行）',
  },
  // 週次レビューが読む収益カバレッジ集計が「実行できる」ことを毎回確かめる（ci ゲート）。
  // 2026-07-06 に magazine-placement.ts から resolveCategoryMagazines が消えて import
  // エラーになったが検出器が無く、週次レビューは 6 週間ぶん古い集計を貼り続けた
  // （2026-08-16 発覚）。入力はコミット済み GA4 スナップショットなので creds 不要で常に走る。
  {
    id: 'monetization-coverage',
    cmd: ['npx', 'tsx', '.claude/scripts/report-monetization-coverage.mts', '--check'],
    timeout: 120_000, ci: true,
    note: '収益カバレッジ集計が実行可能か（import 破損・入力欠落を検知）',
  },
  // スクリプト層の壊れた相対 import を落とす（ci ゲート）。tsc は `**/*.ts` しか見ず
  // `.mjs` と `.claude/**` は型検査の死角。実行されなくなった経路の破損は実行時エラーでも
  // 気づけないため機械で止める。knip の Unresolved imports は同種を報告していたが
  // ci:false で誰も読んでいなかった（2026-08-16 追加）。
  {
    id: 'script-imports', npm: 'check-script-imports', timeout: 60_000, ci: true,
    note: 'scripts/ .claude/ の相対 import が解決可能か（参照先の移動・削除への追随漏れ）',
  },
];

function resolveCommand(check) {
  if (check.cmd) return check.cmd;
  if (check.npm) {
    if (!PKG.scripts || !PKG.scripts[check.npm]) return null; // 未定義 script
    return ['npm', 'run', '--silent', check.npm];
  }
  return null;
}

function tail(str, n = 20) {
  if (!str) return '';
  const lines = str.replace(/\s+$/, '').split('\n');
  return lines.slice(-n).join('\n');
}

/**
 * 失敗の手がかりになる行だけを抜く。
 *
 * 末尾 N 行では足りない。`node --test` の TAP は 600 件超のうち 1 件が落ちても
 * 失敗行は途中に埋もれ、末尾に来るのは無関係な最後のテストと集計だけになる。
 * 2026-08-21 の CI がまさにこれで、ログに残ったのは `[FAIL] unit-tests 19.8s` の
 * 1 行だけだった（--ci はレポートファイルも書かないので他に読む所が無い）。
 */
function failureExcerpt(stdout, stderr, maxLines = 40) {
  const lines = (String(stdout || '') + '\n' + String(stderr || '')).split('\n');
  const SIGNAL = /^not ok \d|Cannot find module|^\s*[A-Za-z]*Error\b|\[FAIL\]|^\s*expected:|^\s*actual:|^\s*at .*\.test\.mjs/;
  const picked = [];
  for (let i = 0; i < lines.length && picked.length < maxLines; i++) {
    if (SIGNAL.test(lines[i])) { picked.push(lines[i]); continue; }
    // TAP は assert のメッセージを `error: |-` の**次の行以降**に置く。
    // ここに「content/note が少なすぎる: 3710」のような実数が入るので、
    // 失敗テスト名だけ拾って捨てると原因の核心が落ちる（2026-08-21 に実際に落とした）。
    if (/^\s*error:/.test(lines[i])) {
      picked.push(lines[i].replace(/\s*\|-\s*$/, '').trimEnd());
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        if (!lines[j].trim() || /^\s*(code|failureType|stack|location|duration_ms|\.\.\.|---):?/.test(lines[j])) break;
        picked.push(lines[j].trimEnd());
      }
    }
  }
  const out = picked.length ? picked : lines.filter(Boolean).slice(-maxLines);
  return out.join('\n').trim();
}

async function runCheck(check) {
  const started = Date.now();
  if (CI && !check.ci) return null; // --ci では report-only を実行しない
  if (check.skip) {
    const reason = await check.skip();
    if (reason) return { id: check.id, ci: check.ci, status: 'skip', skipReason: reason, durationMs: 0, note: check.note };
  }
  const command = resolveCommand(check);
  if (!command) {
    return { id: check.id, ci: check.ci, status: 'skip', skipReason: `npm script '${check.npm}' が未定義`, durationMs: 0, note: check.note };
  }
  // Windows では npm/npx の実体が .cmd のため shell 無しの spawnSync は ENOENT で即死する。
  // これを放置すると node 直起動の検査だけが走り、残り全部が 0.0s FAIL になる＝「偽赤」で
  // 誰も結果を読まなくなる（CLAUDE.md §9）。コマンドは内部固定でユーザー入力を含まないため
  // shell 経由で安全に起動できる。
  const r = spawnSync(command[0], command.slice(1), {
    cwd: ROOT, encoding: 'utf8', timeout: check.timeout, maxBuffer: 16 * 1024 * 1024,
    shell: process.platform === 'win32',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  const durationMs = Date.now() - started;
  let status;
  if (r.error && r.error.code === 'ETIMEDOUT') status = 'timeout';
  else if (r.status === 0) status = 'pass';
  else status = 'fail';
  return {
    id: check.id, ci: check.ci, status, exitCode: r.status ?? null, durationMs,
    stdoutTail: tail(r.stdout), stderrTail: tail(r.stderr), note: check.note,
    // 全文はここでしか手に入らない（tail 済みの文字列からは信号行を拾えない）
    excerpt: status === 'pass' ? '' : failureExcerpt(r.stdout, r.stderr),
  };
}

function censusSummary() {
  const c = readJson(CENSUS, null);
  if (!c) return null;
  // build-quality-census.mjs の出力から薄層件数を拾う（スキーマ差異に頑健に）
  const flat = JSON.stringify(c);
  const thin = (flat.match(/"thin"/g) || []).length;
  return { hasCensus: true, thinMarkers: thin };
}

function buildMarkdown(results, meta) {
  const L = [];
  L.push('# 機械品質監査レポート (quality:audit)');
  L.push('');
  L.push(`- 生成: ${meta.stamp}`);
  L.push(`- モード: ${CI ? 'CI（厳格サブセット）' : 'フル（report 含む）'}`);
  const counts = results.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  L.push(`- 結果: pass ${counts.pass || 0} / fail ${counts.fail || 0} / timeout ${counts.timeout || 0} / skip ${counts.skip || 0}`);
  L.push('');
  L.push('| チェック | 区分 | 状態 | 時間 | 備考 |');
  L.push('|---|---|---|---|---|');
  for (const r of results) {
    const badge = { pass: 'PASS', fail: '**FAIL**', timeout: '**TIMEOUT**', skip: 'skip' }[r.status];
    const sec = r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : '—';
    const memo = r.status === 'skip' ? (r.skipReason || '') : (r.note || '');
    L.push(`| ${r.id} | ${r.ci ? 'ci' : 'report'} | ${badge} | ${sec} | ${memo} |`);
  }
  const failed = results.filter((r) => r.status === 'fail' || r.status === 'timeout');
  if (failed.length) {
    L.push('');
    L.push('## 失敗の詳細（stdout 末尾）');
    for (const r of failed) {
      L.push('');
      L.push(`### ${r.id} — ${r.status} (exit ${r.exitCode})`);
      L.push('```');
      L.push(r.excerpt || tail(r.stdoutTail, 20) || '(stdout 空)');
      if (r.stderrTail) { L.push('--- stderr ---'); L.push(tail(r.stderrTail, 10)); }
      L.push('```');
    }
  }
  if (meta.census) {
    L.push('');
    L.push('## census（薄層コンテンツの目安）');
    L.push(`- census.json あり。thin マーカー数（概算）: ${meta.census.thinMarkers}。詳細は quality-census 出力を参照。`);
  }
  L.push('');
  return L.join('\n');
}

async function main() {
  const stamp = new Date().toISOString();
  const results = [];
  for (const check of CHECKS) {
    const res = await runCheck(check);
    if (res) {
      results.push(res);
      const badge = { pass: 'PASS', fail: 'FAIL', timeout: 'TIMEOUT', skip: 'SKIP' }[res.status];
      const sec = res.durationMs ? ` ${(res.durationMs / 1000).toFixed(1)}s` : '';
      process.stderr.write(`[${badge}] ${res.id}${sec}${res.skipReason ? ' — ' + res.skipReason : ''}\n`);
    }
  }
  const meta = { stamp, census: censusSummary() };
  const failed = results.filter((r) => r.status === 'fail' || r.status === 'timeout');

  if (!CI) {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(JSON_OUT, JSON.stringify({ generated_at: stamp, ci: CI, results, census: meta.census }, null, 2));
    writeFileSync(MD_OUT, buildMarkdown(results, meta));
    process.stderr.write(`\n[quality-audit] レポート: ${JSON_OUT} / ${MD_OUT}\n`);
  }
  if (EMIT_JSON) process.stdout.write(JSON.stringify({ results, failed: failed.map((f) => f.id) }, null, 2) + '\n');

  const summary = results.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  process.stderr.write(`[quality-audit] pass ${summary.pass || 0} / fail ${summary.fail || 0} / timeout ${summary.timeout || 0} / skip ${summary.skip || 0}\n`);

  if (CI && failed.length) {
    // --ci はレポートファイルを書かないので、ここで出さないとログに理由が残らない。
    for (const r of failed) {
      process.stderr.write(`\n--- ${r.id} — ${r.status} (exit ${r.exitCode}) ---\n`);
      process.stderr.write((r.excerpt || '(出力なし)') + '\n');
    }
    process.stderr.write(`[quality-audit] CI 失敗: ${failed.map((f) => f.id).join(', ')}\n`);
    // process.exit(1) だと stderr がパイプのとき直前の書き込みが捨てられる。
    process.exitCode = 1;
  }
}

main();
