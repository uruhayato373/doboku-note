import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const script=fileURLToPath(new URL('../scripts/check-essay-heading-structure.mjs',import.meta.url));
const valid=['## 試験問題','## A 案','## B 案','## 採点者視点',...['A','B'].flatMap(a=>['１','２','３'].map(q=>`## ${a} 案 設問（${q}）`))].join('\n');
function fixture(t,{pastOnly=true,omit=[],forecast=[]}={}){
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'essay-headings-'));
  t.after(()=>fs.rmSync(cwd,{recursive:true,force:true}));
  fs.mkdirSync(path.join(cwd,'.claude/config'),{recursive:true});
  fs.writeFileSync(path.join(cwd,'.claude/config/cem-essay-structure.json'),JSON.stringify({pastExamOnlyPersonas:pastOnly?{'総監模範論文-検査用':'試験後の過去問5年分商品'}:{}}));
  for(const slug of [...['R03','R04','R05','R06','R07'].filter(s=>!omit.includes(s)),...forecast]){
    const d=path.join(cwd,'content/note/技術士総監/magazines/総監模範論文-検査用',slug);fs.mkdirSync(d,{recursive:true});fs.writeFileSync(path.join(d,'article.md'),valid);
  }
  return spawnSync(process.execPath,[script,'検査用','--strict'],{cwd,encoding:'utf8'});
}
test('declared past-exam product inspects all five years without requiring obsolete forecasts',t=>{
 const r=fixture(t);assert.equal(r.status,0,r.stderr+r.stdout);assert.match(r.stdout,/予定 5 記事 \/ 実検査 5 記事/);
});
test('past-exam product still fails when a required year is absent',t=>{
 const r=fixture(t,{omit:['R04']});assert.equal(r.status,1);assert.match(r.stdout,/R04: 記事欠落/);
});
test('legacy product still requires both forecast articles',t=>{
 const r=fixture(t,{pastOnly:false});assert.equal(r.status,1);assert.match(r.stdout,/R08予想: 記事欠落/);
});
test('partial forecast addition cannot silently pass for a past-exam product',t=>{
 const r=fixture(t,{forecast:['R08-yosou-1']});assert.equal(r.status,1);assert.match(r.stdout,/予定 7 記事 \/ 実検査 6 記事/);
});
test('legacy product passes only with five years and both forecasts',t=>{
 const r=fixture(t,{pastOnly:false,forecast:['R08-yosou-1','R08-yosou-2']});assert.equal(r.status,0,r.stdout);assert.match(r.stdout,/予定 7 記事 \/ 実検査 7 記事/);
});
