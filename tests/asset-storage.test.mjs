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
import { mkdirSync, writeFileSync, rmSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  loadConfig, groupFor, r2KeyFor, mimeFor, bucketForFile, visibilityFor,
  findSecrets, sanitizeEntry, cachePathFor, emptyManifest, toPosix,
  migrateManifestToLeanFormat, expandManifestFromLeanFormat, AUDIENCE_RULES,
  loadManifest, loadManifestRaw, writeManifestAtomic, mergeOffloadedEntry,
} from '../scripts/lib/asset-storage.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

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
    // 置き場は「誰が使うか」で決める（2026-09-05）。人しか読まないものは R2 でなく Drive vault。
    assert.ok(['site', 'ci', 'human'].includes(g.audience), g.id + ' に audience（site|ci|human）が要る');
    if (g.audience === 'human') {
      assert.ok(typeof g.audienceException === 'string' && g.audienceException.length >= 20, g.id + ' は human なので R2 に残す理由（audienceException）が要る');
    } else {
      assert.ok(AUDIENCE_RULES[g.audience].includes(g.bucket), g.id + ': audience=' + g.audience + ' に bucket=' + g.bucket + ' は許されない');
    }
  }
  for (const need of ['public', 'private']) assert.ok(CFG.buckets[need], 'buckets.' + need);
  assert.equal(CFG.buckets.private.publicHost, null, 'private バケットに公開ホストを持たせない');
});

test('groupFor: パスから所属グループを引ける（他グループを巻き込まない）', () => {
  assert.equal(groupFor('content/note/技術士総監/x/img/cover.png', CFG).id, 'note-cover-png');
  assert.equal(groupFor('content/site/civil-construction-1/guide-x/ogp.png', CFG).id, 'site-ogp-png');
  assert.equal(groupFor('.local/archive/git-history/a.bundle', CFG).id, 'git-history-bundle');
  // 2026-09-05 に Drive vault（drive-vault.json）へ移した人 tier の group は R2 側に無い
  assert.equal(groupFor('content/note/技術士総監/x/pdf/a.pdf', CFG), null);
  assert.equal(groupFor('content/sources/textbook/主任技師2022/img/p1.png', CFG), null);
  assert.equal(groupFor('content/sns/instagram/cem/pack/img/01.png', CFG), null);
  assert.equal(groupFor('content/sns/instagram/cem/pack/reels/wav/a.wav', CFG), null, 'reels の wav/mp4 も 2026-09-05（DN-0170）から Drive');
  assert.equal(groupFor('.tmp/video-render/sample/video.mp4', CFG), null);
  assert.equal(groupFor('.tmp/video-render/verify-frames/contact-sheet.png', CFG), null);
  // 記事図の切り出し原本 png は 2026-10-22（DN-0707）から R2。配信する webp と SVG は Git に残す。
  assert.equal(groupFor('content/site/civil-construction-1/guide-x/img/fig.png', CFG).id, 'site-figure-png');
  assert.equal(r2KeyFor('content/site/civil-construction-1/guide-x/img/fig.png', groupById('site-figure-png')),
    'posts/civil-construction-1/guide-x/img/fig.png', 'r2-sync.yml のキー体系（posts/）と一致すること');
  // 対象外は null。配信する webp・SVG や原稿を巻き込まない。
  assert.equal(groupFor('content/site/civil-construction-1/guide-x/img/fig.webp', CFG), null);
  assert.equal(groupFor('content/site/civil-construction-1/guide-x/img/figure-a.svg', CFG), null);
  assert.equal(groupFor('content/note/技術士総監/x/article.md', CFG), null);
  assert.equal(groupFor('content/note/技術士総監/x/img/figure-a.png', CFG), null);
});

test('r2Key: stripPrefix でキーからリポジトリ内パスの重複が消える', () => {
  const cover = r2KeyFor('content/note/1級・2級土木/x/img/cover.png', groupById('note-cover-png'));
  assert.equal(cover, 'note/covers/1級・2級土木/x/img/cover.png');
  assert.ok(!cover.includes('content/note'), 'キーに content/note を二重に含めない');

  const ogp = r2KeyFor('content/site/civil-construction-1/guide-x/ogp.png', groupById('site-ogp-png'));
  assert.equal(ogp, 'posts/civil-construction-1/guide-x/ogp.png', 'r2-sync.yml のキー体系（posts/）と一致すること');

  const bundle = r2KeyFor('.local/archive/git-history/a.bundle', groupById('git-history-bundle'));
  assert.equal(bundle, 'archive/git-history/a.bundle', 'ローカル置き場のディレクトリ名を R2 キーへ重複させない');
});

test('r2Key: stripPrefix に合わないパスは黙って通さず例外にする', () => {
  assert.throws(
    () => r2KeyFor('content/site/x/img/a.png', groupById('note-cover-png')),
    /stripPrefix/,
  );
});

test('r2Key: Windows 区切りでも同じキーになる（複数 PC で同一キー）', () => {
  const g = groupById('note-cover-png');
  const posix = r2KeyFor('content/note/a/img/cover.png', g);
  // toPosix は path.sep 依存なので、ここでは「キーに \\ が残らない」ことを固定する
  assert.ok(!posix.includes('\\'), 'キーに Windows 区切りを残さない');
  assert.equal(toPosix('a/b/c.png'), 'a/b/c.png');
});

test('visibility: 判定不能は必ず private へ倒れる（公開バケット誤配置の防止）', () => {
  // note-cover-png は 2026-09-05（DN-0171）から fixed:private。noteFrontmatter の解釈そのものは
  // 再生成系（audit-repository-assets 等）が使い続けるので visibilityFrom を直接与えて固定する
  const g = { id: 'note-synthetic', visibilityFrom: 'noteFrontmatter', bucket: 'byVisibility' };
  // 実在しない記事 dir → frontmatter を読めない → private
  assert.equal(visibilityFor('content/note/存在しない記事/img/cover.png', g), 'private');
  assert.equal(bucketForFile('content/note/存在しない記事/img/cover.png', g), 'private');
});

test('visibility: fixed:private のグループは常に private バケットへ行く', () => {
  const g = groupById('git-history-bundle');
  assert.equal(visibilityFor('.local/archive/git-history/a.bundle', g), 'private');
  assert.equal(bucketForFile('.local/archive/git-history/a.bundle', g), 'private');
  // config に無い visibilityFrom は private へ倒れる（判定不能＝非公開）
  assert.equal(visibilityFor('x/y.bin', { id: 'synthetic', visibilityFrom: 'unknown:rule' }), 'private');
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
      // ig-rendered-image group は 2026-09-05 に Drive vault へ移り R2 config から消えたが、igPackStatus の
      // スキーマ解釈は audit-repository-assets 等が使い続けるので visibilityFrom を直接与えて固定する
      assert.equal(visibilityFor(rel, { id: 'ig-synthetic', visibilityFrom: 'igPackStatus' }), want, name);
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
      // note-cover-png は fixed:private（DN-0171）。noteFrontmatter の解釈は visibilityFrom を直接与えて固定する
      assert.equal(visibilityFor(rel, { id: 'note-synthetic', visibilityFrom: 'noteFrontmatter' }), want, name);
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
  // logicalPath は lean format（2026-08-29〜）で書かない。entries のキーと重複するため
  // sanitizeEntry の許可リストから外れ、読み出し側は loadManifest の互換層が key から補う。
  assert.deepEqual(Object.keys(e).sort(), ['bucket', 'bytes', 'r2Key', 'sha256']);
  assert.equal(e.logicalPath, undefined);
  assert.equal(e.accessKeyId, undefined);
  assert.equal(e.signedUrl, undefined);
});

test('sanitizeEntry: mime / generator / requiredBy も lean format では書かない', () => {
  const e = sanitizeEntry({
    group: 'note-cover-png', bucket: 'public', r2Key: 'k', sha256: 'x', bytes: 1,
    mime: 'image/png', generator: 'scripts/generate-note-covers.mjs', requiredBy: ['scripts/note-publish.mjs'],
  });
  assert.equal(e.mime, undefined);
  assert.equal(e.generator, undefined);
  assert.equal(e.requiredBy, undefined);
});

test('migrateManifestToLeanFormat / expandManifestFromLeanFormat: config と一致するフィールドは間引かれ、往復で元に戻る', () => {
  const g = groupById('note-cover-png');
  const original = emptyManifest();
  const key = 'content/note/x/img/cover.png';
  original.entries[key] = {
    group: 'note-cover-png', bucket: 'private',
    r2Key: 'note/covers/x/img/cover.png', sha256: 'a'.repeat(64), bytes: 100,
    logicalPath: key, mime: 'image/png',
    visibility: 'private', regenerable: false,
    generator: g.generator, requiredBy: g.requiredBy,
    verifiedAt: '2026-08-01T00:00:00.000Z', width: 10, height: 10,
  };

  const lean = migrateManifestToLeanFormat(original, CFG);
  const leanEntry = lean.entries[key];
  assert.equal(leanEntry.logicalPath, undefined, 'キーと重複する logicalPath は間引かれる');
  assert.equal(leanEntry.mime, undefined, '拡張子から導ける mime は間引かれる');
  assert.equal(leanEntry.generator, undefined, 'group 定義と一致する generator は間引かれる');
  assert.equal(leanEntry.requiredBy, undefined, 'group 定義と一致する requiredBy は間引かれる');
  // 導出できないフィールドはそのまま残る
  assert.equal(leanEntry.sha256, 'a'.repeat(64));
  assert.equal(leanEntry.r2Key, 'note/covers/x/img/cover.png');

  const restored = expandManifestFromLeanFormat(lean, CFG);
  assert.deepEqual(restored, original, '間引いたフィールドは group 定義から同じ値に復元される');
});

test('migrateManifestToLeanFormat: group 定義とずれた値（drift）は間引かずに残す', () => {
  // 実例は legacy-r2-orphan（config の requiredBy 追記より前に requiredBy: [] で書かれたエントリ。
  // 2026-09-05 に Drive vault へ移り R2 config から消えた）。同じ形を note-cover-png で再現する:
  // config の requiredBy は非空、エントリは []。間引いて config から復元すると値が変わってしまうので、
  // drift しているエントリは間引かない。
  const original = emptyManifest();
  const key = 'content/note/y/img/cover.png';
  original.entries[key] = {
    group: 'note-cover-png', bucket: 'private',
    r2Key: 'note/covers/y/img/cover.png', sha256: 'b'.repeat(64), bytes: 50,
    logicalPath: key, mime: 'image/png',
    visibility: 'private', regenerable: false,
    generator: null, requiredBy: [],
    verifiedAt: '2026-08-01T00:00:00.000Z',
  };

  const lean = migrateManifestToLeanFormat(original, CFG);
  const leanEntry = lean.entries[key];
  assert.equal(leanEntry.logicalPath, undefined, 'logicalPath は drift の対象外なので常に間引かれる');
  assert.equal(leanEntry.mime, undefined, 'mime も drift の対象外なので常に間引かれる');
  assert.deepEqual(leanEntry.requiredBy, [], 'config とずれた requiredBy は明示のまま残す');

  const restored = expandManifestFromLeanFormat(lean, CFG);
  assert.deepEqual(restored, original, 'drift エントリも往復で元の値に戻る（config 側の値で上書きしない）');
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

// --- 台帳の書き戻し（DN-0801）-------------------------------------------------
// 2026-10-20 の asset-offload --commit は台帳全体を書き直し、(1) 送った OGP の行から srcHash を落とし、
// (2) 送っていない lean な行へ logicalPath などを足して 2,695 行の差分を作った。
// 実際の台帳と同じ 3 つの形（旧形式・lean・lean＋srcHash）の行で、差分が送った行の実測の欄だけになることを固定する。
const MANIFEST_FIXTURE = {
  entries: {
    'content/site/civil-construction-1/guide-a/ogp.png': {
      bucket: 'public', bytes: 585025, generator: 'npm run ogp', group: 'site-ogp-png', height: 630,
      logicalPath: 'content/site/civil-construction-1/guide-a/ogp.png', mime: 'image/png',
      r2Key: 'posts/civil-construction-1/guide-a/ogp.png', regenerable: false, requiredBy: ['scripts/check-ogp-coverage.mjs'],
      sha256: '1'.repeat(64), srcHash: '9c8bd3ac01ed389d', verifiedAt: '2026-08-29T09:13:40.166Z', visibility: 'public', width: 1200,
    },
    'content/site/standards-articles/hokkaido/appendix/chapters/1-1/ogp.png': {
      bucket: 'public', r2Key: 'posts/standards-articles/hokkaido/appendix/chapters/1-1/ogp.png',
      sha256: '2'.repeat(64), bytes: 74175, visibility: 'public', regenerable: false, group: 'site-ogp-png',
      verifiedAt: '2026-10-19T03:23:30.339Z', width: 1200, height: 630, srcHash: 'd495abb94f48a7ab',
    },
    'content/note/2級土木/x/cover.png': {
      bucket: 'private', r2Key: 'note/covers/x/cover.png', sha256: '3'.repeat(64), bytes: 1024,
      visibility: 'private', regenerable: false, group: 'note-cover-png', verifiedAt: '2026-10-20T01:00:00.000Z',
    },
  },
  note: 'fixture',
  version: 1,
};

function withManifestFixture(fn) {
  const dir = join(ROOT, '.tmp', 'test-asset-manifest');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'manifest.json');
  writeFileSync(path, JSON.stringify(MANIFEST_FIXTURE, null, 2) + '\n');
  try { fn(path); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('台帳の書き戻し: 送り直した行は sha256・bytes・verifiedAt だけが変わり、srcHash と送っていない行が残る（DN-0801）', () => {
  withManifestFixture((path) => {
    const before = readFileSync(path, 'utf-8');
    const manifest = loadManifestRaw(path);
    const sent = ['content/site/civil-construction-1/guide-a/ogp.png', 'content/site/standards-articles/hokkaido/appendix/chapters/1-1/ogp.png'];
    for (const key of sent) {
      const prev = manifest.entries[key];
      // asset-offload の processOne が渡すのと同じ欄（置き場は変わらず、中身だけ作り直した画像）
      manifest.entries[key] = mergeOffloadedEntry(prev, {
        group: prev.group, bucket: prev.bucket, r2Key: prev.r2Key, sha256: 'f'.repeat(64), bytes: 4242,
        visibility: prev.visibility, regenerable: prev.regenerable, verifiedAt: '2026-10-21T00:00:00.000Z', width: 1200, height: 630,
      });
    }
    writeManifestAtomic(manifest, path);

    const a = before.split('\n');
    const b = readFileSync(path, 'utf-8').split('\n');
    assert.equal(b.length, a.length, '行が増減した＝送っていない行か欄が書き換わった');
    const changed = a.flatMap((line, i) => (line === b[i] ? [] : [b[i].trim()]));
    assert.equal(changed.length, sent.length * 3, '変わった行: ' + changed.join(' / '));
    for (const line of changed) assert.match(line, /^"(sha256|bytes|verifiedAt)":/);
    const after = JSON.parse(b.join('\n'));
    assert.equal(after.entries[sent[0]].srcHash, '9c8bd3ac01ed389d');
    assert.equal(after.entries[sent[1]].srcHash, 'd495abb94f48a7ab');
    assert.equal(after.entries[sent[0]].logicalPath, sent[0], '旧形式の行の欄は落とさない');
  });
});

test('台帳の書き戻し: 台帳に無い行は lean な新しい行として足す', () => {
  const e = mergeOffloadedEntry(undefined, {
    group: 'note-cover-png', bucket: 'private', r2Key: 'k', sha256: 'x', bytes: 1, mime: 'image/png', logicalPath: 'a',
  });
  assert.deepEqual(Object.keys(e), ['bucket', 'r2Key', 'sha256', 'bytes', 'group']);
});

test('台帳の書き戻し: loadManifest（lean な行を展開済み）の台帳は書き戻せない（DN-0801）', () => {
  withManifestFixture((path) => {
    const before = readFileSync(path, 'utf-8');
    const hydrated = loadManifest(path);
    assert.equal(hydrated.entries['content/note/2級土木/x/cover.png'].logicalPath, 'content/note/2級土木/x/cover.png', '読む側には展開される');
    assert.throws(() => writeManifestAtomic(hydrated, path), /loadManifestRaw/);
    assert.equal(readFileSync(path, 'utf-8'), before);
  });
});

test('台帳の書き戻し: 同じ中身なら書かない', () => {
  withManifestFixture((path) => {
    const ino = statSync(path).ino;
    writeManifestAtomic(loadManifestRaw(path), path);
    assert.equal(statSync(path).ino, ino, '同じ中身で置き換えた');
    const changed = loadManifestRaw(path);
    changed.entries['content/note/2級土木/x/cover.png'].bytes = 2048;
    writeManifestAtomic(changed, path);
    assert.notEqual(statSync(path).ino, ino, '中身が変わったのに置き換わっていない（この検査が効いていない）');
  });
});
