import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import yaml from 'js-yaml';
import { REPO_ROOT, SITE_CONTENT_ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadManifest } from '../scripts/lib/asset-storage.mjs';

// 2026-08-30、公的基準の章記事（manifest.json 駆動・MDX を持たない）へ章ごとの OGP を
// 導入した際に踏んだ 3 つの欠陥の回帰テスト。3 つとも「壊れていても緑のまま」だった点が共通する。
//
//   欠陥1: check-orphan-ogp が章 OGP 344 枚を全部「孤児」と判定した（--fix で全消しになる状態）
//   欠陥2: check-standard-articles の 15 番目の検査が退避台帳を `assets[path]` で引いていた
//          （正しくは `entries[path]`）。手元には実体があるので常にローカル分岐で緑になり、
//          台帳分岐を一度も実行しないまま通り、実体を持たない CI で初めて 344 件が赤になった
//   欠陥3: ogp-supply.yml の trigger paths が MDX 限定で、章を足しても供給が発火しなかった
//
// 台帳分岐（欠陥2）は「ローカル実体があると通ってしまう」のが本体なので、実体を消して
// 検証するのではなく、実体の無い cwd（symlink ミラー）から検査器を走らせて分岐を実走させる。

const ARTICLES_ROOT = join(SITE_CONTENT_ROOT, 'standards-articles');
const CHECK_ORPHAN_OGP = join(REPO_ROOT, 'scripts', 'check-orphan-ogp.mjs');
const CHECK_STANDARD_ARTICLES = join(REPO_ROOT, 'scripts', 'check-standard-articles.mjs');
const OGP_SUPPLY_WORKFLOW = join(REPO_ROOT, '.github', 'workflows', 'ogp-supply.yml');

/** 検査器は exit code そのものが結果なので、非 0 を例外にせず拾う。 */
function runNode(scriptPath, args, cwd = REPO_ROOT) {
  try {
    const stdout = execFileSync(process.execPath, [scriptPath, ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      status: error.status ?? -1,
      stdout: String(error.stdout ?? ''),
      stderr: String(error.stderr ?? ''),
    };
  }
}

/** standards-articles 配下の全 manifest.json（章記事の真実源）。 */
function listChapterManifests() {
  const out = [];
  if (!existsSync(ARTICLES_ROOT)) return out;
  for (const agency of readdirSync(ARTICLES_ROOT, { withFileTypes: true })) {
    if (!agency.isDirectory()) continue; // README.md 等
    const agencyId = agency.name;
    const agencyDir = join(ARTICLES_ROOT, agencyId);
    for (const documentId of readdirSync(agencyDir)) {
      const manifestPath = join(agencyDir, documentId, 'manifest.json');
      if (!existsSync(manifestPath)) continue;
      out.push({
        agencyId,
        documentId,
        manifestPath,
        manifest: JSON.parse(readFileSync(manifestPath, 'utf8')),
      });
    }
  }
  return out;
}

/** 章 1 件に対応する OGP のリポジトリ相対パス（検査器・退避台帳と同じキー形状）。 */
function chapterOgpRelPath(agencyId, documentId, chapterId) {
  return `content/site/standards-articles/${agencyId}/${documentId}/chapters/${chapterId}/ogp.png`;
}

/**
 * OGP 実体を用意する（既にあれば触らない）。返り値は後片付け関数。
 * ogp.png は R2 退避対象でローカルに無いことがあるため、実在を前提にした検査を書けない。
 */
function ensureOgpFile(absPath) {
  if (existsSync(absPath)) return () => {};
  const dir = dirname(absPath);
  const dirExisted = existsSync(dir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(absPath, '');
  return () => {
    rmSync(absPath, { force: true });
    if (!dirExisted) rmSync(dir, { recursive: true, force: true });
  };
}

const chapterDocuments = listChapterManifests();
const totalChapters = chapterDocuments.reduce((sum, doc) => sum + (doc.manifest.chapters?.length ?? 0), 0);

test('前提: 章記事の manifest が読めている（検査ゼロを PASS と呼ばない）', () => {
  assert.ok(chapterDocuments.length > 0, `standards-articles 配下に manifest.json が 1 件も無い: ${ARTICLES_ROOT}`);
  assert.ok(totalChapters > 0, '全 manifest を合わせても章が 0 件。以降の検査が空振りになる');
});

// ---- 欠陥1: 章 OGP を孤児と誤判定する ------------------------------------

test('孤児判定: 章 OGP は孤児にならない（現状のリポジトリで exit 0）', () => {
  const { status, stdout, stderr } = runNode(CHECK_ORPHAN_OGP, ['--json']);
  assert.equal(
    status,
    0,
    `check-orphan-ogp が孤児を報告した。章 OGP を孤児扱いしていないか確認する。\nstdout:\n${stdout}\nstderr:\n${stderr}`,
  );
  const report = JSON.parse(stdout);
  assert.deepEqual(report.orphans, [], 'ワークツリー孤児が出ている');
  assert.deepEqual(report.manifestOrphans, [], 'manifest 孤児が出ている');
});

test('孤児判定: manifest 記載の章は孤児にせず、記載の無い章ディレクトリだけを孤児にする', () => {
  const doc = chapterDocuments.find((d) => (d.manifest.chapters?.length ?? 0) > 0);
  const validChapterId = doc.manifest.chapters[0].chapterId;
  const validRel = chapterOgpRelPath(doc.agencyId, doc.documentId, validChapterId);
  const orphanRel = chapterOgpRelPath(doc.agencyId, doc.documentId, '__test-orphan__');
  const validAbs = join(REPO_ROOT, validRel);
  const orphanAbs = join(REPO_ROOT, orphanRel);

  assert.ok(
    !doc.manifest.chapters.some((c) => c.chapterId === '__test-orphan__'),
    '__test-orphan__ が実在の章 ID と衝突している。別の名前へ変えること',
  );

  // 実体が無い環境（CI のクリーンチェックアウト）でも判定が成立するよう、正当な章の
  // OGP も無ければ用意する。これが無いと「孤児にしない」側の検査が空振りする。
  const cleanupValid = ensureOgpFile(validAbs);
  const cleanupOrphan = ensureOgpFile(orphanAbs);
  try {
    const { status, stdout, stderr } = runNode(CHECK_ORPHAN_OGP, ['--json']);
    assert.equal(status, 1, `manifest に無い章の OGP を孤児として検出できていない。\nstdout:\n${stdout}\nstderr:\n${stderr}`);
    const report = JSON.parse(stdout);
    assert.ok(
      report.orphans.includes(orphanRel),
      `manifest に無い ${orphanRel} が孤児一覧に無い。検出された孤児: ${JSON.stringify(report.orphans)}`,
    );
    assert.ok(
      !report.orphans.includes(validRel),
      `manifest に載っている章 ${validRel} が孤児にされた（--fix で削除される状態）`,
    );
  } finally {
    cleanupOrphan();
    cleanupValid();
  }
  assert.ok(!existsSync(orphanAbs), `後片付けに失敗した: ${orphanAbs}`);
});

// ---- 欠陥2: 退避台帳のキー形状 -------------------------------------------

test('退避台帳: 全章分の ogp.png エントリがそろっている', () => {
  const entries = loadManifest().entries ?? {};
  const chapterKeys = Object.keys(entries).filter((key) =>
    /^content\/site\/standards-articles\/[^/]+\/[^/]+\/chapters\/[^/]+\/ogp\.png$/.test(key),
  );
  // 2026-08-30 実測は 8 文書 × 43 章 = 344 件。章が増減したらここも動くのが正しいので、
  // 数値を焼き込まず manifest から導出した章数と突き合わせる。
  assert.equal(
    chapterKeys.length,
    totalChapters,
    `台帳の章 OGP エントリ ${chapterKeys.length} 件 ≠ manifest の章数 ${totalChapters} 件`,
  );
});

test('退避台帳: キー形状は entries[フルパス]（欠陥の本体・assets ではない）', () => {
  const manifest = loadManifest();
  assert.ok(manifest.entries, '退避台帳のトップレベルに entries が無い');
  assert.equal(
    manifest.assets,
    undefined,
    '退避台帳に assets が生えている。entries と二重の形状ができると検査側がどちらを引くか曖昧になる',
  );

  const doc = chapterDocuments.find((d) => (d.manifest.chapters?.length ?? 0) > 0);
  const relPath = chapterOgpRelPath(doc.agencyId, doc.documentId, doc.manifest.chapters[0].chapterId);
  const entry = manifest.entries[relPath];
  assert.ok(
    entry,
    `台帳のキーが content/site/... のフルパスでない（basename 等へ変わると検査が全滅する）。引けなかったキー: ${relPath}`,
  );
  assert.equal(entry.group, 'site-ogp-png', `${relPath} の group が site-ogp-png でない`);
});

test('章 OGP 被覆検査（15番目）が全文書で PASS し、検査件数が章数と一致する', () => {
  const { status, stdout, stderr } = runNode(CHECK_STANDARD_ARTICLES, ['--json']);
  assert.notEqual(status, -1, `check-standard-articles を起動できない。\nstderr:\n${stderr}`);
  const report = JSON.parse(stdout);
  assert.ok(report.documents.length > 0, '検査できた文書が 0 件（検査不成立）');

  for (const doc of report.documents) {
    const check = doc.checks.find((c) => c.id === 15);
    assert.ok(check, `${doc.target}: 15 番目の検査（章ごとの OGP）が結果に無い`);
    assert.equal(
      check.status,
      'PASS',
      `${doc.target}: 章 OGP 被覆が PASS でない（${check.status}）。違反: ${JSON.stringify(check.violations)}`,
    );
    const expected = chapterDocuments.find(
      (d) => `${d.agencyId}/${d.documentId}` === doc.target,
    )?.manifest.chapters.length;
    assert.equal(check.checked, expected, `${doc.target}: 検査 ${check.checked} 章 ≠ manifest の ${expected} 章`);
  }
});

test('章 OGP 被覆検査はローカルに実体が無くても退避台帳で PASS する（台帳分岐の実走）', () => {
  // 実ファイルを消さずに台帳分岐を通すため、章 md と manifest だけを symlink した
  // 別 cwd を作って検査器を走らせる。検査器のローカル実体判定は process.cwd() 基準
  // （scripts/check-standard-articles.mjs:690）なので、ミラー側に ogp.png を置かなければ
  // 344 章すべてが台帳分岐へ入る。台帳は REPO_ROOT 基準で読まれるので実物が使われる。
  const doc = chapterDocuments.find((d) => (d.manifest.chapters?.length ?? 0) > 0);
  const target = `${doc.agencyId}/${doc.documentId}`;
  const mirror = mkdtempSync(join(tmpdir(), 'standards-ogp-ledger-'));
  try {
    mkdirSync(join(mirror, '.claude', 'config'), { recursive: true });
    symlinkSync(
      join(REPO_ROOT, '.claude', 'config', 'standards-structure.json'),
      join(mirror, '.claude', 'config', 'standards-structure.json'),
    );
    mkdirSync(join(mirror, 'content', 'site'), { recursive: true });
    symlinkSync(join(SITE_CONTENT_ROOT, 'standards-library'), join(mirror, 'content', 'site', 'standards-library'));

    const srcDir = join(ARTICLES_ROOT, doc.agencyId, doc.documentId);
    const dstDir = join(mirror, 'content', 'site', 'standards-articles', doc.agencyId, doc.documentId);
    mkdirSync(join(dstDir, 'chapters'), { recursive: true });
    symlinkSync(join(srcDir, 'manifest.json'), join(dstDir, 'manifest.json'));
    // 章 md だけを symlink し、ogp.png の入る {chapterId}/ ディレクトリは作らない。
    for (const entry of readdirSync(join(srcDir, 'chapters'), { withFileTypes: true })) {
      if (entry.isDirectory()) continue;
      symlinkSync(join(srcDir, 'chapters', entry.name), join(dstDir, 'chapters', entry.name));
    }

    // 前提を自分で確かめる。ミラーに実体が残っていると台帳分岐を通らず検査が空振りする。
    for (const chapter of doc.manifest.chapters) {
      const mirrored = join(dstDir, 'chapters', chapter.chapterId, 'ogp.png');
      assert.ok(!existsSync(mirrored), `ミラーに OGP 実体が残っている: ${mirrored}`);
    }

    const { status, stdout, stderr } = runNode(CHECK_STANDARD_ARTICLES, [target, '--json'], mirror);
    assert.notEqual(status, -1, `ミラー cwd で check-standard-articles を起動できない。\nstderr:\n${stderr}`);
    const report = JSON.parse(stdout);
    const check = report.documents.find((d) => d.target === target)?.checks.find((c) => c.id === 15);
    assert.ok(check, `${target}: 15 番目の検査が結果に無い。\nstdout:\n${stdout}`);
    assert.equal(
      check.status,
      'PASS',
      `ローカル実体が無いと台帳を引けていない（欠陥2 の再導入）。違反 ${check.violations.length} 件: ${JSON.stringify(check.violations.slice(0, 3))}`,
    );
    assert.equal(check.checked, doc.manifest.chapters.length, `${target}: 検査 ${check.checked} 章 ≠ ${doc.manifest.chapters.length} 章`);
  } finally {
    rmSync(mirror, { recursive: true, force: true });
  }
});

// ---- 欠陥3: 供給ワークフローの trigger paths ------------------------------

test('ogp-supply.yml の push paths が章記事の manifest とビルダを含む', () => {
  // 素のテキスト検索だとコメント行や別トリガーの記述でも当たってしまうため、
  // devDependency の js-yaml で構造として読む（scripts/check-scheduled-exec-branch.mjs と同じ手）。
  const doc = yaml.load(readFileSync(OGP_SUPPLY_WORKFLOW, 'utf8'));
  // YAML 1.1 実装では `on:` が真偽値キーになりうるので両方を見る。
  const on = doc.on ?? doc[true];
  assert.ok(on?.push?.paths, 'ogp-supply.yml に on.push.paths が無い');
  const paths = on.push.paths;

  assert.ok(
    paths.includes('content/site/standards-articles/**/manifest.json'),
    `章記事の manifest が trigger paths に無い（章を足しても OGP 供給が発火しない）。現在の paths: ${JSON.stringify(paths)}`,
  );
  assert.ok(
    paths.includes('scripts/build-standards-ogp.mjs'),
    `build-standards-ogp.mjs が trigger paths に無い（生成ロジックを直しても再供給されない）。現在の paths: ${JSON.stringify(paths)}`,
  );
  assert.ok(
    paths.includes('content/site/**/*.mdx'),
    `記事 MDX の trigger が消えている。現在の paths: ${JSON.stringify(paths)}`,
  );
});

test('章記事の manifest 実パスが trigger pattern の射程に入る', () => {
  // pattern と実パスがすれ違っていれば workflow は書いてあっても発火しない。
  const doc = chapterDocuments[0];
  const relPath = `content/site/standards-articles/${doc.agencyId}/${doc.documentId}/manifest.json`;
  assert.ok(existsSync(join(REPO_ROOT, relPath)), `manifest 実パスが解決できない: ${relPath}`);
  assert.ok(
    relPath.startsWith('content/site/standards-articles/') && relPath.endsWith('/manifest.json'),
    `manifest の置き場が trigger pattern から外れた: ${relPath}`,
  );
});
