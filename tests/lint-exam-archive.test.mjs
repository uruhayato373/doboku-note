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

test('公式問題の長文を保持し、自著の解説とガイドの長文は検出する',()=>{
 const root=mkdtempSync(join(tmpdir(),'dn-exam-prose-'));
 try{
  const long='判断に必要な施工条件を確認するための文章'.repeat(10)+'。';
  for(const category of ['pe-first-stage','pe-construction']){
   const slug=category==='pe-first-stage'?'r01-retry-basic':'r08-required';
   const dir=join(root,category,slug);mkdirSync(dir,{recursive:true});
   const file=join(dir,'article.mdx');const header='---\ntitle: 試験\ncategory: '+category+'\ngroup: primary\n---\n';
   writeFileSync(file,header+'## I-1\n\n'+long+'\n\n<details>\n<summary>解説</summary>\n短い説明。\n</details>\n');
   let r=spawnSync(process.execPath,['.claude/scripts/lint-mdx-mobile.mjs',file],{encoding:'utf8'});assert.equal(/\(15-2\)/.test(r.stdout),false,r.stdout);
   writeFileSync(file,header+'## I-1\n\n原文。\n\n<details>\n<summary>解説</summary>\n'+long+'\n</details>\n');
   r=spawnSync(process.execPath,['.claude/scripts/lint-mdx-mobile.mjs',file],{encoding:'utf8'});assert.equal(/\(15-2\)/.test(r.stdout),true,r.stdout);
   for(const body of [long+'\n\n## I-1\n\n原文。\n','## I-1\n\n原文。\n\n### 学習案内\n\n'+long+'\n']){
    writeFileSync(file,header+body);
    const result=spawnSync(process.execPath,['.claude/scripts/lint-mdx-mobile.mjs',file],{encoding:'utf8'});
    assert.equal(/\(15-2\)/.test(result.stdout),true,result.stdout);
   }
  }
  const guideDir=join(root,'pe-first-stage','guide-calculation');mkdirSync(guideDir,{recursive:true});
  const guide=join(guideDir,'article.mdx');writeFileSync(guide,'---\ntitle: ガイド\ncategory: pe-first-stage\ngroup: guide\n---\n## I-1\n\n'+long+'\n');
  const guideResult=spawnSync(process.execPath,['.claude/scripts/lint-mdx-mobile.mjs',guide],{encoding:'utf8'});
  assert.equal(/\(15-2\)/.test(guideResult.stdout),true,guideResult.stdout);
 }finally{rmSync(root,{recursive:true,force:true});}
});
