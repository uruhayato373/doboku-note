import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('mobile lint accepts per-question markers in ordinary and retry exams but retains guide checks',()=>{
 const root=mkdtempSync(join(tmpdir(),'dn-exam-lint-'));
 try{
  const body='---\ntitle: 試験\ncategory: pe-first-stage\ngroup: primary\n---\n\n導入文です。\n\n'+[1,2,3].map(i=>`## 問${i}\n\n説明です。\n\n<ExamPoint summary="計算の確認" items={["条件の整理"]} />\n\n正答：①\n`).join('\n');
  for(const [slug,exam] of [['r01-basic',true],['r01-retry-aptitude',true],['guide-calculation',false]]){
   const dir=join(root,'pe-first-stage',slug);mkdirSync(dir,{recursive:true});const file=join(dir,'article.mdx');writeFileSync(file,body);
   const r=spawnSync(process.execPath,['.claude/scripts/lint-mdx-mobile.mjs',file],{encoding:'utf8'});
   assert.equal(/\(9-1\)|\(9-6\)/.test(r.stdout),!exam,r.stdout+r.stderr);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});
