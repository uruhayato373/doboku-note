/**
 * マガジン収録の三軸突合（check-magazine-membership）のテスト。
 *
 * 守りたい事故: repo に記事を足したのにライブマガジンへ収録せず、SoT の件数表記も
 *   古いまま残る（2026-08-24 ゼネコン/河川コンサル各2本・¥2,480 商品の内容欠落）。
 *   SoT↔ライブの 2 者突合では両方が同値で古びると永久に緑になるため、
 *   repo 実数という第三軸を固定する。
 *
 * 実装で 2 度踏んだ罠も固定する:
 *   - BK 系の price は「N記事セット」表記（「N本セット」だけ見ると拾えない）
 *   - description の「計N記事」は**小計**を含む（道路の「…＝計9記事）…（全24記事）」）。
 *     総数として読むと偽陽性になるので、ゲートは price のみ。
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  auditMagazine, parseSoT, readMagazineLabel, snapshotFreshness,
} from '../scripts/check-magazine-membership.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- readMagazineLabel ----

test('frontmatter から noteMagazine を読む（引用符・CRLF 両対応）', () => {
  assert.equal(readMagazineLabel('---\nnoteMagazine: BK-01\n---\n本文'), 'BK-01');
  assert.equal(readMagazineLabel('---\r\nnoteMagazine: "総監模範論文-ゼネコン"\r\n---\r\n'), '総監模範論文-ゼネコン');
});

test('noteMagazine が無ければ null（frontmatter 自体が無い場合も）', () => {
  assert.equal(readMagazineLabel('---\ntitle: x\n---\n'), null);
  assert.equal(readMagazineLabel('# 見出しだけ'), null);
});

// ---- parseSoT ----

const ENTRY = (price, desc) => `
  'x-magazine': {
    id: 'x-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mabc123def456',
    title: 'タイトル',
    description:
      '${desc}',
    price: '${price}',
    badge: 'note 限定',
  },
`;

test('price の「N本セット」を軸 B として拾う', () => {
  const e = parseSoT(ENTRY('¥2,480（11本セット、単品比63%OFF）', 'x'))['x-magazine'];
  assert.equal(e.declared.n, 11);
  assert.equal(e.key, 'mabc123def456');
});

test('BK 系の「N記事セット」表記も拾う（これを落として 11 件が偽赤になった）', () => {
  const e = parseSoT(ENTRY('¥3,480（24記事セット・単品¥780、約81%OFF）', 'x'))['x-magazine'];
  assert.equal(e.declared.n, 24);
  assert.equal(e.declared.kind, 'N記事セット');
});

test('price に件数が無ければ declared は null', () => {
  assert.equal(parseSoT(ENTRY('¥780', 'x'))['x-magazine'].declared, null);
});

test('description の小計を軸 B に混ぜない（道路の「＝計9記事」で偽陽性になった）', () => {
  const e = parseSoT(ENTRY('¥3,480（24記事セット・単品¥780、約81%OFF）',
    '4テーマ＝計9記事）を収録した試験直前対策付き（全24記事）'))['x-magazine'];
  assert.equal(e.declared.n, 24, 'ゲート値は price のみから取る');
  assert.deepEqual(e.mentions, [9, 24], 'description の言及は参考情報として両方拾う');
});

// ---- snapshotFreshness ----

const DAY = 86400000;

test('9 日以内の snapshot は使う / 超えたら使わない', () => {
  const now = Date.parse('2026-08-24T00:00:00Z');
  assert.equal(snapshotFreshness('2026-08-20T00:00:00Z', now).ok, true);
  assert.equal(snapshotFreshness('2026-08-14T00:00:00Z', now).ok, false);
});

test('fetchedAt が無い/壊れている snapshot は「鮮度不明」でなく不成立', () => {
  const now = Date.now();
  assert.equal(snapshotFreshness(null, now).ok, false);
  assert.equal(snapshotFreshness('not-a-date', now).ok, false);
});

// ---- auditMagazine ----

const sot = (n) => ({ id: 'x', key: 'mabc', declared: n == null ? null : { kind: 'N本セット', n }, mentions: [] });

test('repo 実数 = SoT 表記 = ライブ なら合格', () => {
  const r = auditMagazine({ id: 'x', labels: ['L'], repoCount: 11, extra: null, entry: sot(11), liveCount: 11 });
  assert.equal(r.ok, true);
  assert.equal(r.expected, 11);
});

test('ライブだけ足りない＝今回の事故の形（SoT は正しくても落とす）', () => {
  const r = auditMagazine({ id: 'x', labels: ['L'], repoCount: 11, extra: null, entry: sot(11), liveCount: 9 });
  assert.equal(r.ok, false);
  assert.equal(r.kind, 'live-drift');
});

test('SoT とライブが同値で古びていても repo 実数が割る（2者突合では緑になる形）', () => {
  const r = auditMagazine({ id: 'x', labels: ['L'], repoCount: 11, extra: null, entry: sot(9), liveCount: 9 });
  assert.equal(r.ok, false);
  assert.equal(r.kind, 'both-drift');
});

test('extras は期待値へ加算される（dir 外からの収録）', () => {
  const r = auditMagazine({
    id: 'x', labels: ['L'], repoCount: 11,
    extra: { count: 1, reason: 'デモ1本' }, entry: sot(12), liveCount: 12,
  });
  assert.equal(r.expected, 12);
  assert.equal(r.ok, true);
});

test('照合できる軸がゼロなら合格にしない（検査ゼロを PASS と呼ばない）', () => {
  const r = auditMagazine({ id: 'x', labels: ['L'], repoCount: 11, extra: null, entry: sot(null), liveCount: null });
  assert.equal(r.ok, false);
  assert.equal(r.kind, 'no-count');
});

test('片方の軸だけ取れるなら、その軸で判定する', () => {
  assert.equal(auditMagazine({ id: 'x', labels: ['L'], repoCount: 11, extra: null, entry: sot(null), liveCount: 11 }).ok, true);
  assert.equal(auditMagazine({ id: 'x', labels: ['L'], repoCount: 11, extra: null, entry: sot(11), liveCount: null }).ok, true);
});

// ---- 現物 ----

test('現物の config が指す id は全て note-magazines.ts に実在する（対象 0 件を PASS と呼ばない）', () => {
  const config = JSON.parse(readFileSync(join(ROOT, '.claude/config/note-magazine-membership.json'), 'utf8'));
  const sotAll = parseSoT(readFileSync(join(ROOT, 'src/lib/note-magazines.ts'), 'utf8'));
  const labels = Object.entries(config.labels ?? {});
  assert.ok(labels.length >= 20, `ゲート対象ラベルが ${labels.length} 種しか無い（config の破損を疑う）`);

  const missing = labels.filter(([, id]) => !sotAll[id]).map(([l, id]) => `${l}→${id}`);
  assert.deepEqual(missing, [], `SoT に無い id を指している: ${missing.join(', ')}`);

  for (const [id, ex] of Object.entries(config.extras ?? {})) {
    assert.ok(sotAll[id], `extras の ${id} が SoT に無い`);
    assert.ok(ex.reason && ex.reason.length >= 6, `extras の ${id} に理由が無い`);
  }
});
