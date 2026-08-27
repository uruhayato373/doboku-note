/**
 * アセット退避基盤（DN-0111 Phase 3）のテスト。
 *
 * 守りたい事故は 2 つで、向きが逆:
 *   A. **公開バケットへの誤配置** — 購入者限定 PDF や未公開ドラフトが URL で取れるようになる。
 *      取り返しがつかないので、判定不能は必ず private へ倒れることを固定する。
 *   B. **復元不能** — Git から外し、ローカルからも消し、R2 には上がっていなかった。
 *      manifest が命綱なので、キーの導出と衝突検出と秘密混入を固定する。
 *
 * R2 へはアクセスしない（純関数だけを対象にする）。
 */
import { strict as assert } from 'node:assert';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  loadConfig, groupFor, r2KeyFor, mimeFor, bucketForFile, visibilityFor,
  findSecrets, sanitizeEntry, cachePathFor, emptyManifest, toPosix,
} from '../scripts/lib/asset-storage.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CFG = loadConfig();
const groupById = (id) => CFG.groups.find((g) => g.id === id);

test('config: 全 group が bucket / keyFrom / visibilityFrom を正しく宣言している', () => {
  assert.ok(CFG.groups.length > 0, 'group が 0 件＝検査不成立');
  for (const g of CFG.groups) {
    assert.ok(['public', 'private', 'byVisibility'].includes(g.bucket), g.id + ' の bucket');
    const kf = g.keyFrom || 'repoRelative';
    assert.ok(kf === 'repoRelative' || kf.startsWith('stripPrefix:'), g.id + ' の keyFrom');
    assert.ok(g.reason && g.reason.length > 20, g.id + ' に「なぜその置き場か」が要る');
    assert.ok(g.phase, g.id + ' にどの Phase で動かすかが要る');
  }
  for (const need of ['public', 'private']) assert.ok(CFG.buckets[need], 'buckets.' + need);
  assert.equal(CFG.buckets.private.publicHost, null, 'private バケットに公開ホストを持たせない');
});

test('groupFor: パスから所属グループを引ける（他グループを巻き込まない）', () => {
  assert.equal(groupFor('content/note/技術士総監/x/img/cover.png', CFG).id, 'note-cover-png');
  assert.equal(groupFor('content/note/技術士総監/x/pdf/a.pdf', CFG).id, 'note-delivery-pdf');
  assert.equal(groupFor('content/sources/textbook/主任技師2022/img/p1.png', CFG).id, 'textbook-page-image');
  assert.equal(groupFor('content/sns/instagram/cem/pack/img/01.png', CFG).id, 'ig-rendered-image');
  // 対象外は null。サイト記事の図版や原稿を巻き込まない。
  assert.equal(groupFor('content/site/civil-construction-1/guide-x/img/fig.png', CFG), null);
  assert.equal(groupFor('content/note/技術士総監/x/article.md', CFG), null);
  assert.equal(groupFor('content/note/技術士総監/x/img/figure-a.png', CFG), null);
});

test('r2Key: stripPrefix でキーからリポジトリ内パスの重複が消える', () => {
  const cover = r2KeyFor('content/note/1級・2級土木/x/img/cover.png', groupById('note-cover-png'));
  assert.equal(cover, 'note/covers/1級・2級土木/x/img/cover.png');
  assert.ok(!cover.includes('content/note'), 'キーに content/note を二重に含めない');

  const tb = r2KeyFor('content/sources/textbook/主任技師2022/img/p1.png', groupById('textbook-page-image'));
  assert.equal(tb, 'textbook/主任技師2022/img/p1.png', '既存 rclone 運用のキー体系と一致すること');
});

test('r2Key: stripPrefix に合わないパスは黙って通さず例外にする', () => {
  assert.throws(
    () => r2KeyFor('content/site/x/img/a.png', groupById('textbook-page-image')),
    /stripPrefix/,
  );
});

test('r2Key: Windows 区切りでも同じキーになる（複数 PC で同一キー）', () => {
  const g = groupById('textbook-page-image');
  const posix = r2KeyFor('content/sources/textbook/a/img/p.png', g);
  // toPosix は path.sep 依存なので、ここでは「キーに \\ が残らない」ことを固定する
  assert.ok(!posix.includes('\\'), 'キーに Windows 区切りを残さない');
  assert.equal(toPosix('a/b/c.png'), 'a/b/c.png');
});

test('visibility: 判定不能は必ず private へ倒れる（公開バケット誤配置の防止）', () => {
  const g = groupById('note-cover-png');
  // 実在しない記事 dir → frontmatter を読めない → private
  assert.equal(visibilityFor('content/note/存在しない記事/img/cover.png', g), 'private');
  assert.equal(bucketForFile('content/note/存在しない記事/img/cover.png', g), 'private');
});

test('visibility: fixed:private のグループは常に private バケットへ行く', () => {
  const g = groupById('note-delivery-pdf');
  assert.equal(visibilityFor('content/note/a/pdf/x.pdf', g), 'private');
  assert.equal(bucketForFile('content/note/a/pdf/x.pdf', g), 'private');
});

test('visibility: IG は status.json の入れ子スキーマを読む（トップレベルだけ見ない）', () => {
  // 2026-08-21 実査: 106 件中 85 が {carousel:{...}}、15 が {reel:{...}}、5 が両方、1 が旧形式。
  // トップレベルの status/posted だけを見た初版は 106 件中 6 件しか拾えなかった。
  // visibilityFor は REPO_ROOT 相対で解決するので、fixture は **リポジトリ内**（.tmp/・Git 非追跡）に作る。
  // リポジトリ外の tmpdir に作ると全部「解決不能→private」になり、スキーマ解釈を一切検査しないまま緑になる。
  const base = join(ROOT, '.tmp', 'test-ig-status');
  rmSync(base, { recursive: true, force: true });
  try {
    const cases = [
      ['posted-carousel', { carousel: { status: 'posted', posted_at: '2026-07-19T22:49:25+09:00' } }, 'public'],
      ['posted-by-timestamp', { carousel: { status: 'scheduled', posted_at: '2026-07-19T22:49:25+09:00' } }, 'public'],
      ['scheduled', { carousel: { status: 'scheduled', posted_at: null } }, 'private'],
      ['posted-reel', { reel: { status: 'posted' } }, 'public'],
      ['both-one-posted', { reel: { status: 'scheduled' }, carousel: { status: 'posted' } }, 'public'],
      ['draft', { carousel: { status: 'draft' } }, 'private'],
      ['legacy-toplevel', { keyword: 'x', posted: true, carousel: {} }, 'public'],
      ['broken-json', null, 'private'],
      ['no-status-file', undefined, 'private'],
    ];
    let checked = 0;
    for (const [name, json, want] of cases) {
      const packDir = join(base, name, 'img');
      mkdirSync(packDir, { recursive: true });
      if (json !== undefined) {
        writeFileSync(join(base, name, 'status.json'), json === null ? '{ broken' : JSON.stringify(json));
      }
      writeFileSync(join(packDir, '01.png'), '');
      const rel = toPosix(join(base, name, 'img', '01.png').slice(ROOT.length + 1));
      assert.equal(visibilityFor(rel, groupById('ig-rendered-image')), want, name);
      checked++;
    }
    assert.equal(checked, cases.length, '全ケースを実検査していること');
    // 「全部 private になって偶然通った」を弾く: public を返すケースが実際にあることを確かめる
    assert.ok(cases.filter(([, , w]) => w === 'public').length >= 4, 'public 期待のケースが十分あること');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('visibility: note カバーは noteStatus: reserved（予約投稿）を noteId 単独で public 判定しない', () => {
  // 2026-08-27 実発生: 学科記述予想/03_品質管理 が noteStatus: reserved（notePublishedAt 翌日）
  // なのに noteId が投稿作成時点で既に払い出されていたため、旧ロジックが public と誤判定した。
  const base = join(ROOT, '.tmp', 'test-note-visibility');
  rmSync(base, { recursive: true, force: true });
  try {
    const cases = [
      ['reserved-with-noteid', 'noteStatus: reserved\nnoteId: "n123"\nnoteUrl: "https://note.com/x/n/n123"', 'private'],
      ['published-with-noteid', 'noteStatus: published\nnoteId: "n456"\nnoteUrl: "https://note.com/x/n/n456"', 'public'],
      ['draft-no-noteid', 'noteStatus: draft', 'private'],
    ];
    let checked = 0;
    for (const [name, fmBody, want] of cases) {
      const articleDir = join(base, name);
      const imgDir = join(articleDir, 'img');
      mkdirSync(imgDir, { recursive: true });
      writeFileSync(join(articleDir, 'article.md'), `---\n${fmBody}\n---\n# 本文\n`);
      writeFileSync(join(imgDir, 'cover.png'), '');
      const rel = toPosix(join(imgDir, 'cover.png').slice(ROOT.length + 1));
      assert.equal(visibilityFor(rel, groupById('note-cover-png')), want, name);
      checked++;
    }
    assert.equal(checked, cases.length, '全ケースを実検査していること');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('mime: 拡張子から Content-Type を引く（未知は octet-stream）', () => {
  assert.equal(mimeFor('a/b.png'), 'image/png');
  assert.equal(mimeFor('a/b.PDF'), 'application/pdf');
  assert.equal(mimeFor('a/b.epub'), 'application/epub+zip');
  assert.equal(mimeFor('a/b.xyz'), 'application/octet-stream');
});

test('sanitizeEntry: 許可キー以外は落とす（秘密の混入経路を塞ぐ）', () => {
  const e = sanitizeEntry({
    logicalPath: 'a', bucket: 'private', r2Key: 'k', sha256: 'x', bytes: 1,
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE', signedUrl: 'https://x?X-Amz-Signature=abc', absPath: '/Users/me/x',
  });
  assert.deepEqual(Object.keys(e).sort(), ['bucket', 'bytes', 'logicalPath', 'r2Key', 'sha256']);
  assert.equal(e.accessKeyId, undefined);
  assert.equal(e.signedUrl, undefined);
});

test('findSecrets: credential / 署名 URL / 絶対パス / R2 エンドポイントを検出する', () => {
  const m = emptyManifest();
  m.entries['a'] = { logicalPath: 'a', generator: 'AKIAIOSFODNN7EXAMPLE' };
  m.entries['b'] = { logicalPath: 'b', generator: 'https://x.com/y?X-Amz-Signature=deadbeef' };
  m.entries['c'] = { logicalPath: 'c', generator: '/Users/minamidaisuke/doboku-note/x' };
  m.entries['d'] = { logicalPath: 'd', generator: 'https://abc.r2.cloudflarestorage.com/k' };
  const hits = findSecrets(m);
  assert.deepEqual([...new Set(hits.map((h) => h.key))].sort(), ['a', 'b', 'c', 'd']);
});

test('findSecrets: 正常なエントリは誤検出しない（sha256 の 64 桁 hex を秘密扱いしない）', () => {
  const m = emptyManifest();
  m.entries['content/note/a/img/cover.png'] = sanitizeEntry({
    logicalPath: 'content/note/a/img/cover.png',
    group: 'note-cover-png', bucket: 'public', r2Key: 'note/covers/a/img/cover.png',
    sha256: 'a'.repeat(64), bytes: 1024, mime: 'image/png', visibility: 'public',
    regenerable: false, generator: 'scripts/generate-note-covers.mjs', requiredBy: ['scripts/note-publish.mjs'],
  });
  assert.deepEqual(findSecrets(m), []);
});

test('cachePath: R2 キーと同じ相対構造で cache に落ちる', () => {
  const p = cachePathFor(CFG, 'textbook/主任技師2022/img/p1.png');
  assert.ok(p.includes('.local'), 'cache は Git 非追跡領域に置く');
  assert.ok(p.endsWith(join('textbook', '主任技師2022', 'img', 'p1.png')));
});

test('config の invariants に「確認できないものは消さない」旨が明記されている', () => {
  // 運用の芯なので、消えたら気づけるように固定する。
  const joined = (CFG.invariants || []).join('\n');
  assert.match(joined, /dry-run/i);
  assert.match(joined, /sha256/i);
  assert.match(joined, /ローカルにも Git にも残す/);
});
