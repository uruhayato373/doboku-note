import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expansionReport, hashFile, artifactPath } from '../scripts/lib/content-expansion.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'dn-expansion-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root,'content/site/test'), { recursive:true });
  const path = 'content/site/test/article.mdx';
  writeFileSync(join(root,path), '根拠を確かめて説明する記事');
  const unit = { id:'unit-1', need:'施工条件を比較する', reason:'本文の比較と適用条件を確認', content:'covered', evidenceLevel:'body-reviewed', locators:['source-1 / p12'], visual:{decision:'unnecessary',reason:'一条件の説明は本文で伝わる'}, derivative:{decision:'unnecessary',reason:'既存の学習記事へ集約する'}, artifacts:[{path,sha256:hashFile(join(root,path))}] };
  const data = { version:1, reviewedAt:'2026-09-13', sources:[{sourceId:'source-1',scopeNote:'所蔵版の12頁まで',units:[unit]}] };
  const registry = { sources:[{id:'source-1',title:'試験教材',class:'commercial-book'}] };
  return { root, data, registry, unit, path };
}
test('確認した成果物が変わると完了扱いを解除する', t => {
  const f=fixture(t);assert.equal(expansionReport(f.root,f.data,f.registry).productionComplete,true);
  writeFileSync(join(f.root,f.path),'説明を変更');
  const r=expansionReport(f.root,f.data,f.registry);assert.equal(r.productionComplete,false);assert.equal(r.summary.stale,1);
});
test('教材の追加は未棚卸しとして検出する', t => {
  const f=fixture(t);f.registry.sources.push({id:'new-book',title:'新しい教材',class:'operator-owned'});
  const r=expansionReport(f.root,f.data,f.registry);assert.equal(r.missingSources.length,1);assert.equal(r.productionComplete,false);
});
test('原典待ちと概念名の対応だけを充足へ変換しない', t => {
  const f=fixture(t);f.unit.content='blocked';let r=expansionReport(f.root,f.data,f.registry);assert.equal(r.summary.blocked,1);assert.equal(r.productionComplete,false);
  f.unit.content='covered';f.unit.evidenceLevel='topic-map';r=expansionReport(f.root,f.data,f.registry);assert.equal(r.summary.pending,1);assert.equal(r.productionComplete,false);
});
test('図解やSNSの実体がない作成済み判定を拒否する', t => {
  const f=fixture(t);f.unit.visual.decision='created';f.unit.derivative.decision='prepared';
  const r=expansionReport(f.root,f.data,f.registry);assert.equal(r.issues.filter(s=>s.includes('実体')).length,2);assert.equal(r.productionComplete,false);
});
test('検査ゼロ・重複教材を成功としない', t => {
  const f=fixture(t);f.data.sources=[];assert.equal(expansionReport(f.root,f.data,f.registry).productionComplete,false);
  f.data.sources=[{sourceId:'source-1',scopeNote:'範囲',units:[f.unit]}];f.data.sources.push(structuredClone(f.data.sources[0]));
  assert.ok(expansionReport(f.root,f.data,f.registry).issues.some(s=>s.includes('重複')));
});
test('成果物の欠落は元の対応表を保ったまま再確認へ出す', t => {
  const f=fixture(t);rmSync(join(f.root,f.path));const r=expansionReport(f.root,f.data,f.registry);
  assert.equal(r.stale[0].state,'missing');assert.equal(f.unit.content,'covered');assert.equal(r.productionComplete,false);
});
test('原典不足を内容対応ありに書き換えても完了にはならない', t => {
  const f=fixture(t);f.unit.evidenceLevel='source-unavailable';
  const r=expansionReport(f.root,f.data,f.registry);
  assert.equal(r.productionComplete,false);assert.ok(r.issues.some(x=>x.includes('原典不足')));
});
test('成果物参照の相対逸脱と外部symlinkを拒否する', t => {
  const f=fixture(t);assert.throws(()=>artifactPath(f.root,'content/../../outside'));assert.throws(()=>artifactPath(f.root,'/etc/passwd'));
  symlinkSync(tmpdir(),join(f.root,'content/outside'));assert.throws(()=>artifactPath(f.root,'content/outside'));
});

test('原典不足で一部対応の論点は制作待ちと分け、完了にはしない', t => {
  const f=fixture(t);f.unit.content='partial';f.unit.evidenceLevel='source-unavailable';
  const r=expansionReport(f.root,f.data,f.registry);
  assert.equal(r.summary.blocked,1);assert.equal(r.summary.pending,0);assert.equal(r.productionComplete,false);
  assert.equal(r.units[0].content,'partial');
});
