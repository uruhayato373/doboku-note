import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { diffEntities, extractEntities } from '../scripts/lib/shadcn-parity.mjs';
import { findSizeOverrides, judge } from '../scripts/check-shadcn-parity.mjs';

const REF_BADGE = readFileSync(new URL('../.claude/config/shadcn-reference/badge.tsx', import.meta.url), 'utf8');

test('cva の base と variant、data-slot の className を部品単位のクラス集合にする', () => {
  const e = extractEntities(REF_BADGE);
  assert.ok(e['cva:badgeVariants:base'].includes('rounded-full'));
  assert.ok(e['cva:badgeVariants:variant.outline'].includes('border-border'));
  const card = extractEntities('<div data-slot="card" className={cn("flex gap-6 py-6", className)} />\n<div data-slot="card-title" className="font-semibold" />');
  assert.deepEqual(card, { 'slot:card': ['flex', 'gap-6', 'py-6'], 'slot:card-title': ['font-semibold'] });
});

test('2026-09-28 の不具合（Badge に text-[11px] leading-5）を差分として捕まえる', () => {
  const broken = REF_BADGE.replace('px-2 py-0.5 text-xs font-medium', 'px-2.5 py-0.5 text-[11px] leading-5 font-semibold');
  const d = diffEntities(extractEntities(REF_BADGE), extractEntities(broken));
  const base = d.find((x) => x.entity === 'cva:badgeVariants:base');
  assert.deepEqual(base.extra, ['font-semibold', 'leading-5', 'px-2.5', 'text-[11px]']);
  assert.deepEqual(base.missing, ['font-medium', 'px-2', 'text-xs']);
  assert.equal(judge(d, {}).violations.length, 1);
});

test('例外に登録した差は通し、登録と中身が違う差・もう無い差は落とす', () => {
  const diffs = [{ entity: 'cva:x:variant.success', kind: 'entity-extra', missing: [], extra: ['a', 'b'] }];
  assert.deepEqual(judge(diffs, { 'cva:x:variant.success': { extra: ['b', 'a'] } }), { violations: [], stale: [] });
  assert.equal(judge(diffs, { 'cva:x:variant.success': { extra: ['a'] } }).violations.length, 1);
  assert.equal(judge([], { 'cva:x:variant.success': { extra: ['a'] } }).stale.length, 1);
});

test('ページで Badge・Button・TabsTrigger の大きさを className で上書きしたら拾う（幅や折り返しは拾わない）', () => {
  const src = [
    '<Badge variant="warning" className="px-1.5 py-0 text-[10px] leading-4">x</Badge>',
    '<Badge className="whitespace-normal">y</Badge>',
    '<Button size="sm" className="md:h-12 w-full">z</Button>',
    '<Card className="py-3">w</Card>',
  ].join('\n');
  assert.deepEqual(findSizeOverrides(src).map((o) => [o.component, o.classes, o.line]), [
    ['Badge', ['px-1.5', 'py-0', 'text-[10px]', 'leading-4'], 1],
    ['Button', ['md:h-12'], 3],
  ]);
});
