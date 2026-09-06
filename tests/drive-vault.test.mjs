/**
 * Drive vault 系（drive-vault.mjs）のテスト。実際のマウントも R2 も触らない（純関数と注入だけ）。
 *
 * 守りたい事故:
 *   A. **マウント先の誤解決** — 別端末（Windows）で候補パスが違う／env で上書きしたのに候補へ落ちる。
 *   B. **絶対パスの台帳混入** — vault の場所は端末ごとに違うので、台帳には vault 相対だけを書く。
 *   C. **誤 tier** — 同じパスが R2 系と Drive 系の両方に一致する／audience と bucket の食い違い。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  loadDriveConfig, resolveVaultRoot, driveGroupFor, vaultRelFor, sanitizeDriveEntry, routingFor, toVaultRel, emptyDriveManifest,
  hydrateDriveEntry, expandDriveManifest, toLeanDriveManifest, serializeDriveManifest,
} from '../scripts/lib/drive-vault.mjs';
import { isDeepStrictEqual } from 'node:util';
import { loadConfig as loadR2Config, findSecrets, AUDIENCE_RULES } from '../scripts/lib/asset-storage.mjs';

const DCFG = loadDriveConfig();
const R2CFG = loadR2Config();
const dgroup = (id) => DCFG.groups.find((g) => g.id === id);

test('config: 全 Drive group が human で reason を持ち、status が pending|active', () => {
  assert.ok(DCFG.groups.length > 0, 'group 0 件＝検査不成立');
  for (const g of DCFG.groups) {
    assert.equal(g.audience, 'human', g.id);
    assert.ok(['pending', 'active'].includes(g.status), g.id + ' の status');
    assert.ok(g.reason.length >= 20, g.id + ' の reason');
    assert.ok(!g.vaultDir.startsWith('/') && !/^[A-Za-z]:/.test(g.vaultDir), g.id + ' の vaultDir は相対');
  }
});

test('resolveVaultRoot: env が最優先で、marker が無ければ候補へ落ちずに null', () => {
  const exists = (p) => p === '/mnt/vault/README.md';
  const r = resolveVaultRoot({ cfg: DCFG, platform: 'linux', env: { DOBOKU_DRIVE_VAULT: '/mnt/vault' }, homeDir: '/home/x', exists, listDir: () => [] });
  assert.equal(r.root, '/mnt/vault');
  assert.match(r.source, /^env:/);
  const bad = resolveVaultRoot({ cfg: DCFG, platform: 'darwin', env: { DOBOKU_DRIVE_VAULT: '/nowhere' }, homeDir: '/Users/x', exists: () => false, listDir: () => ['GoogleDrive-a@b.c'] });
  assert.equal(bad.root, null);
  assert.match(bad.reason, /DOBOKU_DRIVE_VAULT/);
});

test('resolveVaultRoot: darwin は CloudStorage の GoogleDrive-* を glob で見つける', () => {
  const home = '/Users/tester';
  const found = home + '/Library/CloudStorage/GoogleDrive-me@example.com/マイドライブ/doboku-note';
  const r = resolveVaultRoot({
    cfg: DCFG, platform: 'darwin', env: {}, homeDir: home,
    exists: (p) => p === found + '/README.md',
    listDir: (d) => (d === home + '/Library/CloudStorage' ? ['GoogleDrive-me@example.com', 'OneDrive-個人用'] : []),
  });
  assert.equal(r.root, found);
  assert.match(r.source, /^candidate:/);
});

test('resolveVaultRoot: win32 は G: と %USERPROFILE% の候補を試し、無ければ理由付きで null', () => {
  const r1 = resolveVaultRoot({ cfg: DCFG, platform: 'win32', env: { USERPROFILE: 'C:/Users/t' }, homeDir: 'C:/Users/t', exists: (p) => p.startsWith('G:/マイドライブ/doboku-note'), listDir: () => [] });
  assert.equal(r1.root, 'G:/マイドライブ/doboku-note');
  const r2 = resolveVaultRoot({ cfg: DCFG, platform: 'win32', env: { USERPROFILE: 'C:/Users/t' }, homeDir: 'C:/Users/t', exists: (p) => p.startsWith('C:/Users/t/Google Drive/マイドライブ/doboku-note'), listDir: () => [] });
  assert.equal(r2.root, 'C:/Users/t/Google Drive/マイドライブ/doboku-note');
  const none = resolveVaultRoot({ cfg: DCFG, platform: 'win32', env: {}, homeDir: 'C:/Users/t', exists: () => false, listDir: () => [] });
  assert.equal(none.root, null);
  assert.match(none.reason, /マウントが見つからない/);
  assert.match(none.reason, /G:\/マイドライブ/);
});

test('vaultRelFor: stripPrefix / repoRelative は vaultDir の下に落ち、\\ を残さず NFC になる', () => {
  assert.equal(vaultRelFor('content/note/技術士総監/x/pdf/a.pdf', dgroup('note-delivery-pdf')), '制作物/note配布PDF/技術士総監/x/pdf/a.pdf');
  assert.equal(vaultRelFor('.tmp/video-render/pack1/video.mp4', dgroup('video-render-artifact')), '制作物/動画レンダー/pack1/video.mp4');
  assert.equal(vaultRelFor('.claude/state/ocr-audit/x.json', dgroup('repo-archive')), 'アーカイブ/repo/.claude/state/ocr-audit/x.json');
  const nfd = 'content/sources/textbook/\u30d8\u309a\u30fc\u30b7\u3099/a.pdf'; // ページ（NFD）
  const out = vaultRelFor(nfd, dgroup('textbook-source-pdf'));
  assert.equal(out, toVaultRel(out));
  assert.equal(out.normalize('NFC'), out);
  assert.ok(!out.includes('\\'));
  assert.throws(() => vaultRelFor('content/site/x/a.pdf', dgroup('note-delivery-pdf')), /stripPrefix/);
});

test('vaultRelFor: standards-beside-pdf は原本 PDF と同名のフォルダを PDF の隣に作る', () => {
  const readManifest = (a, d) => (a === 'tohoku' && d === 'common' ? { sourceFile: '東北地方整備局/common__土木工事共通仕様書_令和8年度版.pdf' } : null);
  const g = dgroup('standards-page-image');
  assert.equal(
    vaultRelFor('content/sources/standards/tohoku/common/pages/p0120.jpg', g, { readManifest }),
    '原資料PDF/共通仕様書/東北地方整備局/common__土木工事共通仕様書_令和8年度版/pages/p0120.jpg',
  );
  assert.equal(
    vaultRelFor('content/sources/standards/tohoku/common/text/p0120.txt', g, { readManifest }),
    '原資料PDF/共通仕様書/東北地方整備局/common__土木工事共通仕様書_令和8年度版/text/p0120.txt',
  );
  // alias 文書（sourceFile 無し）や形が違うパスは黙って通さない
  assert.throws(() => vaultRelFor('content/sources/standards/okinawa/common/pages/p0001.jpg', g, { readManifest }), /sourceFile/);
  assert.throws(() => vaultRelFor('content/sources/standards/tohoku/common/manifest.json', g, { readManifest }), /standards-beside-pdf/);
});

test('driveGroupFor: 台帳・原稿・サイト図版を巻き込まない', () => {
  assert.equal(driveGroupFor('content/sources/standards/tohoku/common/pages/p0001.jpg', DCFG).id, 'standards-page-image');
  assert.equal(driveGroupFor('content/sources/textbook/x/a.pdf', DCFG).id, 'textbook-source-pdf');
  assert.equal(driveGroupFor('content/sources/textbook/x/img/p1.png', DCFG).id, 'textbook-page-image');
  assert.equal(driveGroupFor('content/sources/standards/tohoku/common/manifest.json', DCFG), null);
  assert.equal(driveGroupFor('content/sources/textbook/x/README.md', DCFG), null);
  assert.equal(driveGroupFor('content/sources/textbook/x/第1章.md', DCFG), null);
  assert.equal(driveGroupFor('content/site/civil-construction-1/guide-x/img/fig.png', DCFG), null);
  assert.equal(driveGroupFor('content/note/技術士総監/x/img/cover.png', DCFG), null, 'note カバーは CI が書く R2 側');
  assert.equal(driveGroupFor('content/sns/instagram/x/reels/a.png', DCFG), null, 'reels の中間 PNG はどの group にも属さない（再生成）');
  assert.equal(driveGroupFor('content/sns/instagram/x/reels/wav/a.wav', DCFG).id, 'sns-archived-media');
  assert.equal(driveGroupFor('content/sns/instagram/x/reels/video.mp4', DCFG).id, 'sns-archived-media');
  assert.equal(driveGroupFor('content/sns/youtube/2026-06-08-x/video.mp4', DCFG).id, 'sns-archived-media');
});

test('sanitizeDriveEntry: 許可キー以外を落とし、vaultPath を NFC・/ 区切りに寄せる', () => {
  const e = sanitizeDriveEntry({ group: 'g', vaultPath: '制作物\\x\\a.pdf', sha256: 'x', bytes: 1, absPath: '/Users/me/x', token: 'AKIAIOSFODNN7EXAMPLE' });
  assert.deepEqual(Object.keys(e).sort(), ['bytes', 'group', 'sha256', 'vaultPath']);
  assert.equal(e.vaultPath, '制作物/x/a.pdf');
});

test('findSecrets: 台帳に絶対パスを書くと検出される（vault の場所は端末ごとに違う）', () => {
  const m = emptyDriveManifest();
  m.entries['a'] = { group: 'x', vaultPath: '/Users/me/Library/CloudStorage/GoogleDrive-x/マイドライブ/doboku-note/a' };
  m.entries['b'] = { group: 'x', vaultPath: 'C:\\Users\\me\\a' };
  m.entries['ok'] = { group: 'x', vaultPath: '制作物/a.pdf', sha256: 'a'.repeat(64), bytes: 1 };
  const keys = [...new Set(findSecrets(m).map((h) => h.key))].sort();
  assert.deepEqual(keys, ['a', 'b']);
});

test('routingFor: active な Drive group と R2 group が同じパスに重ならない（pending は別枠）', () => {
  const samples = [
    'content/sources/standards/tohoku/common/pages/p0001.jpg',
    'content/sources/textbook/x/a.pdf', 'content/sources/textbook/x/img/p1.png',
    'content/note/a/pdf/x.pdf', 'content/note/a/magazines/m/_cover.png', 'content/note/a/img/cover.png',
    'content/sns/instagram/x/img/01.png', 'content/sns/instagram/x/reels/wav/a.wav',
    '.tmp/video-render/p/video.mp4', 'scripts/kindle-dist/a.epub', '.claude/config/coconala/assets/a.png',
    '.claude/state/ocr-audit/a.json', '.local/archive/legacy-r2/sns/a.mp4', '.local/archive/legacy-r2/content/a.png',
    'content/site/x/ogp.png', '.local/archive/git-history/a.bundle',
  ];
  for (const p of samples) {
    const r = routingFor(p, R2CFG, DCFG);
    assert.ok(r.r2.length + r.driveActive.length <= 1, p + ' が複数 group に一致: ' + JSON.stringify(r));
    assert.ok(r.r2.length <= 1, p + ' が R2 の複数 group に一致（groupFor は先勝ちで黙る）');
  }
});

test('audience: asset-storage.json の全 group が audience を持ち、site⇒public / ci⇒private|byVisibility / human は例外理由つき', () => {
  for (const g of R2CFG.groups) {
    assert.ok(['site', 'ci', 'human'].includes(g.audience), g.id);
    if (g.audience === 'human') assert.ok(g.audienceException?.length >= 20, g.id + ' は human なので R2 に残す理由が要る');
    else assert.ok(AUDIENCE_RULES[g.audience].includes(g.bucket), g.id + ': ' + g.audience + ' × ' + g.bucket);
  }
  // 「サイトが配信する」ものが 1 つは存在し、それが public であること（規則が空回りしていない）
  assert.ok(R2CFG.groups.some((g) => g.audience === 'site' && g.bucket === 'public'));
});

test('lean format: 導出できる vaultPath / regenerable だけを省き、補完で元に戻る（DN-0172）', () => {
  const g = dgroup('note-delivery-pdf');
  const rel = 'content/note/技術士総監/x/pdf/a.pdf';
  const full = emptyDriveManifest();
  full.entries[rel] = {
    group: g.id, vaultPath: vaultRelFor(rel, g), sha256: 'a'.repeat(64), md5: 'b'.repeat(32), bytes: 10,
    regenerable: g.regenerable, syncedAt: '2026-09-05T00:00:00.000Z', verifiedAt: '2026-09-05T00:00:01.000Z',
  };
  // 導出値とずれた vaultPath（手で置いた原本を adopt）は明示のまま残る
  const adoptedRel = 'content/sources/textbook/本A/a.pdf';
  full.entries[adoptedRel] = { group: 'textbook-source-pdf', vaultPath: '原資料PDF/書籍/別名.pdf', sha256: 'c'.repeat(64), bytes: 5, adopted: true };
  // regenerable が group 定義とずれているエントリも残る
  const driftRel = 'content/note/技術士総監/y/pdf/b.pdf';
  full.entries[driftRel] = { group: g.id, vaultPath: vaultRelFor(driftRel, g), sha256: 'd'.repeat(64), bytes: 7, regenerable: !g.regenerable };

  const lean = toLeanDriveManifest(full, DCFG);
  assert.equal(lean.entries[rel].vaultPath, undefined, '導出できる vaultPath は省かれる');
  assert.equal(lean.entries[rel].regenerable, undefined, 'group と同じ regenerable は省かれる');
  assert.equal(lean.entries[adoptedRel].vaultPath, '原資料PDF/書籍/別名.pdf', 'adopted の vaultPath は残る');
  assert.equal(lean.entries[driftRel].regenerable, !g.regenerable, 'ずれた regenerable は残る');
  assert.equal(lean.entries[rel].sha256, 'a'.repeat(64));
  assert.equal(lean.entries[rel].md5, 'b'.repeat(32));

  // lean 化は「regenerable 無し」と「group 既定と同じ regenerable」を区別しない（読み時に既定で埋まる）。
  // 比較の基準は補完後の形。writeDriveManifestAtomic も同じ基準で往復を検証する
  const restored = expandDriveManifest(lean, DCFG);
  assert.ok(isDeepStrictEqual(restored.entries, expandDriveManifest(full, DCFG).entries), '補完で元のエントリへ戻る');
  assert.equal(restored.entries[adoptedRel].vaultPath, '原資料PDF/書籍/別名.pdf');
  // 単体の補完も同じ
  assert.deepEqual(hydrateDriveEntry(rel, lean.entries[rel], DCFG), full.entries[rel]);
});

test('lean format: 未知の group のエントリは触らずに通す（黙って捏造しない）', () => {
  const e = { group: 'no-such-group', sha256: 'a'.repeat(64), bytes: 1 };
  assert.deepEqual(hydrateDriveEntry('x/y', e, DCFG), e);
  const lean = toLeanDriveManifest({ entries: { 'x/y': { ...e, vaultPath: 'p/q' } } }, DCFG);
  assert.equal(lean.entries['x/y'].vaultPath, 'p/q');
});

test('serializeDriveManifest: 妥当な JSON で、entries は 1 件 1 行', () => {
  const m = emptyDriveManifest();
  m.entries['a/b.png'] = { group: 'g', sha256: 'a'.repeat(64), bytes: 1 };
  m.entries['c/d.png'] = { group: 'g', sha256: 'b'.repeat(64), bytes: 2, adopted: true };
  const text = serializeDriveManifest(m);
  assert.deepEqual(JSON.parse(text), m, '往復で同じ');
  const entryLines = text.split('\n').filter((l) => l.startsWith('    "'));
  assert.equal(entryLines.length, 2, '1 エントリ 1 行');
  assert.ok(text.endsWith('}\n'));
  // entries が空でも妥当
  assert.deepEqual(JSON.parse(serializeDriveManifest(emptyDriveManifest())), emptyDriveManifest());
});
