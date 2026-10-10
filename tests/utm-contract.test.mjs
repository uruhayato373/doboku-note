// tests/utm-contract.test.mjs
//
// UTM の契約（config/utm-templates.json が唯一の定義）を、読む側が書き写さず引けることを固定する。
// 守りたい事故: source / medium をコードが書き写し、契約を直したとき生成側と検査側が別々の値で動く。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { channelFamily, channelOf } from '../scripts/lib/utm-channels.mjs';
import { setUtmParams, utmChannel, utmChannelFamily, utmEbook } from '../scripts/lib/utm-contract.mjs';
import { loadConfig } from '../scripts/lib/video-content-check.mjs';
import { loadTsModule } from './lib/load-ts.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const templates = JSON.parse(readFileSync(join(ROOT, 'config', 'utm-templates.json'), 'utf8'));

test('契約の channels から期待値を引ける（x・note・youtube）', () => {
  assert.deepEqual(utmChannel('x.post'), templates.channels['x.post']);
  assert.equal(utmChannel('note.site').source, 'note');
  const x = utmChannelFamily('x');
  assert.deepEqual([x.source, x.medium], [templates.channels['x.post'].source, templates.channels['x.post'].medium]);
  assert.deepEqual([...x.contents].sort(), ['pinned', 'post']);
  const youtube = utmChannelFamily('youtube');
  assert.deepEqual([...youtube.contents].sort(), ['longform', 'shorts']);
  assert.equal(utmEbook('kindle').source, 'kindle');
});

test('未定義のチャネル・format は黙って既定値にせず throw する', () => {
  assert.throws(() => utmChannel('tiktok.video'), /未定義/);
  assert.throws(() => utmChannelFamily('tiktok'), /無い/);
  assert.throws(() => utmEbook('epub'), /未定義/);
  assert.throws(() => channelOf({ channels: {} }, 'x.post'), /未定義/);
});

test('チャネルの format 間で source・medium が食い違ったら throw する（検査が 1 つの期待値で判定できない）', () => {
  const diverged = { channels: { 'youtube.shorts': { source: 'youtube', medium: 'video', content: 'shorts' }, 'youtube.longform': { source: 'youtube', medium: 'social', content: 'longform' } } };
  assert.throws(() => channelFamily(diverged, 'youtube'), /揃っていない/);
});

test('setUtmParams は source・medium・campaign・content の順に付け、既存の utm_* は上書きする', () => {
  const url = setUtmParams(new URL('https://example.com/a?utm_content=old&k=v'), 'youtube.shorts', { campaign: 'pack-1' });
  assert.equal(url.toString(), 'https://example.com/a?utm_content=shorts&k=v&utm_source=youtube&utm_medium=video&utm_campaign=pack-1');
  const custom = setUtmParams(new URL('https://example.com/a'), 'x.post', { campaign: 'c', content: '202610-02' });
  assert.equal(custom.search, '?utm_source=x&utm_medium=social&utm_campaign=c&utm_content=202610-02');
});

test('channels は SNS 流入の source 集合（週次の SNS 別 WoW）に使われるので、サイト内・電子書籍の導線を混ぜない', () => {
  const sources = new Set(Object.values(templates.channels).map((c) => c.source));
  assert.deepEqual([...sources].sort(), ['instagram', 'note', 'x', 'youtube']);
  assert.ok(templates.siteToNote && templates.ebook, 'サイト → note と電子書籍は channels と別のキー');
});

test('動画パックの検査が使う UTM の期待値は契約の youtube.* から作られ、video-content.json に別宣言を持たない', () => {
  assert.equal(JSON.parse(readFileSync(join(ROOT, 'config', 'video-content.json'), 'utf8')).utm, undefined);
  const { utm } = loadConfig(ROOT);
  const youtube = utmChannelFamily('youtube');
  assert.deepEqual(utm, { source: youtube.source, medium: youtube.medium, contentEnum: [...youtube.contents].sort() });
});

test('サイト → note の UTM は withNoteUtm 1 つで、契約の siteToNote の面ごとに付く（既存リンクと同じ文字列）', async () => {
  const { withNoteUtm } = await loadTsModule('src/lib/note-utm.ts');
  const note = 'https://note.com/dobokunote/n/nabc';
  assert.equal(withNoteUtm(note, 'magazine', { content: 'keyword-2026-sidebar' }), `${note}?utm_source=doboku-note&utm_medium=referral&utm_campaign=note-magazine&utm_content=keyword-2026-sidebar`);
  assert.equal(withNoteUtm(`${note}?x=1`, 'links', { content: 'note-top' }), `${note}?x=1&utm_source=links&utm_medium=referral&utm_campaign=link-hub&utm_content=note-top`);
  assert.equal(withNoteUtm(note, 'authorCard'), `${note}?utm_source=site&utm_medium=author-card&utm_campaign=author-profile`);
  assert.equal(withNoteUtm(note, 'quiz', { campaign: 'civil-1-kakomon' }), `${note}?utm_source=doboku-note&utm_medium=quiz&utm_campaign=civil-1-kakomon`);
  // content を渡したときは空文字でも付ける（従来の buildMagazineUrl と同じ）
  assert.equal(withNoteUtm(note, 'magazine', { content: '' }), `${note}?utm_source=doboku-note&utm_medium=referral&utm_campaign=note-magazine&utm_content=`);
});
