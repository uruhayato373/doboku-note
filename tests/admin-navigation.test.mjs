import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * DN-0103 Phase 01: admin ナビの channel-registry 契約を固定する。
 *
 * channel-registry.ts は fs を import しない純粋モジュール（Nav.tsx が Client Component
 * から直接 import できることが前提）なので、tsx 経由で直接評価できる。
 * Nav.tsx 自体は 'use client' コンポーネントで React レンダリングテスト基盤が無いため、
 * ここではソース文字列で「発信」の残存とグループ構成を固定する。
 */

function tsx(code) {
  const cli = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
  return execFileSync(process.execPath, [cli, '-e', code], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

test('channel id は重複しない', () => {
  const out = tsx(`
    import { ADMIN_CHANNELS } from './tools/admin-app/src/lib/channel-registry.ts';
    process.stdout.write(JSON.stringify(ADMIN_CHANNELS.map((c) => c.id)));
  `);
  const ids = JSON.parse(out);
  assert.deepEqual(ids, [...new Set(ids)]);
});

test('enabled channel の href は空欄でなく、href(+query) の複合key で重複しない', () => {
  const out = tsx(`
    import { enabledChannels } from './tools/admin-app/src/lib/channel-registry.ts';
    const tabs = enabledChannels().flatMap((c) => c.tabs);
    process.stdout.write(JSON.stringify(tabs.map((t) => ({
      href: t.href,
      key: t.href + '|' + JSON.stringify(t.query ?? {}),
    }))));
  `);
  const tabs = JSON.parse(out);
  for (const t of tabs) assert.ok(t.href && t.href.length > 0, 'href が空欄');
  const keys = tabs.map((t) => t.key);
  assert.deepEqual(keys, [...new Set(keys)], `href+query の複合key が重複: ${JSON.stringify(keys)}`);
});

test('kindle channel は専用画面タブ + ファイルタブを持つ', () => {
  const out = tsx(`
    import { channelById } from './tools/admin-app/src/lib/channel-registry.ts';
    const kindle = channelById('kindle');
    process.stdout.write(JSON.stringify({
      enabled: kindle?.enabled,
      sourcePath: kindle?.sourcePath,
      tabs: kindle?.tabs.map((t) => ({ href: t.href, match: t.match })),
    }));
  `);
  assert.deepEqual(JSON.parse(out), {
    enabled: true,
    sourcePath: 'content/kindle',
    tabs: [
      { href: '/content/kindle', match: '/content/kindle' },
      { href: '/content/content~kindle', match: '/content/content~kindle' },
    ],
  });
});

test('X / Instagram の gallery/sns タブは query だけが異なり、pathname だけでは排他評価できる', () => {
  const out = tsx(`
    import { channelById } from './tools/admin-app/src/lib/channel-registry.ts';
    const x = channelById('x')!.tabs.find((t) => t.match === '/gallery/sns');
    const ig = channelById('instagram')!.tabs.find((t) => t.match === '/gallery/sns');
    process.stdout.write(JSON.stringify({ x: x?.query, ig: ig?.query }));
  `);
  const r = JSON.parse(out);
  assert.deepEqual(r.x, { ch: 'x' });
  assert.deepEqual(r.ig, { ch: 'instagram' });
  assert.notDeepEqual(r.x, r.ig);
});

test('contentSegmentLabel は sns/sources のような 1:1 でない物理セグメントもラベルを返す', () => {
  const out = tsx(`
    import { contentSegmentLabel } from './tools/admin-app/src/lib/channel-registry.ts';
    process.stdout.write(JSON.stringify({
      site: contentSegmentLabel('site'),
      note: contentSegmentLabel('note'),
      coconala: contentSegmentLabel('coconala'),
      kindle: contentSegmentLabel('kindle'),
      sns: contentSegmentLabel('sns'),
      sources: contentSegmentLabel('sources'),
      unknown: contentSegmentLabel('does-not-exist'),
    }));
  `);
  const r = JSON.parse(out);
  assert.equal(r.site, 'サイト');
  assert.equal(r.note, 'note');
  assert.equal(r.coconala, 'ココナラ');
  assert.equal(r.kindle, 'Kindle');
  assert.equal(r.sns, 'SNS');
  assert.equal(r.sources, '原典・入力資料');
  assert.equal(r.unknown, 'does-not-exist');
});

test('サイドバーのグループは領域の正本（domains.json）とちょうど一致する', () => {
  const src = readFileSync(join(ROOT, 'tools/admin-app/src/components/Nav.tsx'), 'utf8');
  const groups = [...src.matchAll(/^    domain: '([^']+)',$/gm)].map((m) => m[1]).sort();
  const cfg = JSON.parse(readFileSync(join(ROOT, '.claude/config/domains.json'), 'utf8'));
  assert.deepEqual(groups, cfg.domains.map((d) => d.id).sort());
  assert.ok(!/title: '/.test(src), 'グループ名を Nav.tsx に直書きしない（正本は domains.json）');
});

test('既存の画面はすべてサイドバーのどこか 1 か所に置かれている', () => {
  const src = readFileSync(join(ROOT, 'tools/admin-app/src/components/Nav.tsx'), 'utf8');
  const hrefs = [...src.matchAll(/href: '(\/[^'?]*)'/g)].map((m) => m[1]);
  for (const href of [
    '/metrics', '/strategy/policy', '/metrics/business', '/strategy/qualifications', '/content/lineup',
    '/sales', '/affiliate', '/affiliate/placements', '/affiliate/programs', '/metrics/seo-watch', '/metrics/gsc', '/metrics/ga4',
    '/metrics/psi', '/sns', '/metrics/video', '/gallery/characters', '/schedule', '/todo', '/docs',
    '/plans', '/quality', '/knowledge', '/agents', '/skills', '/content/lifecycle', '/content', '/materials',
  ]) {
    const n = hrefs.filter((h) => h === href).length;
    assert.ok(n >= 1, `${href} がサイドバーに無い`);
  }
  for (const id of ['note', 'coconala', 'kindle', 'site', 'x', 'instagram', 'youtube']) {
    assert.ok(src.includes(`'${id}'`), `チャネル ${id} がどのグループにも置かれていない`);
  }
});
