import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {resolveFigureInput,buildFigureFrame,renderFigureSns} from '../.claude/scripts/sns/render-figure-sns.mjs';
const fixture='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" aria-label="図の説明"><rect width="400" height="500" fill="white"/></svg>';
for(const [category,label] of [['civil-construction-1','1級土木施工管理技士'],['pe-first-stage','技術士 第一次試験'],['civil-practice','土木施工の実務'],['pe-construction','技術士第二次試験（建設部門）'],['pe-comprehensive-management','技術士（総合技術監理部門）']]) {
 test(`${category}: 全形式へ資格名を供給し、PNGは指定先に再生成できる`,()=>{
  const root=mkdtempSync(join(tmpdir(),'figure-sns-'));
  try {
   const dir=join(root,'content/site',category,'test','img');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'figure-1.svg'),fixture);
   const args={slug:`${category}/test`,format:'all',concept:'状態の違い','out-dir':'preview'};
   const input=resolveFigureInput(args,root);assert.equal(input.qualification,label);
   for(const format of input.formats){const frame=buildFigureFrame(input,format,{uri:'data:image/png;base64,AA==',width:400,height:500});assert.ok(frame.svg.includes(label));if(category!=='pe-comprehensive-management') assert.ok(!frame.svg.includes('総合技術監理'));}
   const files=renderFigureSns(args,root);assert.equal(files.length,3);assert.ok(files.every(f=>existsSync(f.file)));assert.ok(!existsSync(join(root,'content/sns')));
   if(category==='pe-comprehensive-management') assert.equal(resolveFigureInput({...args,slug:'test'},root).svgPath,input.svgPath);
  }finally{rmSync(root,{recursive:true,force:true});}
 });
}
test('未知カテゴリ・形式・パストラバーサル・過長タイトルは書込み前に拒否する',()=>{
 const root=mkdtempSync(join(tmpdir(),'figure-sns-invalid-'));
 try{
  const d=join(root,'content/site/civil-construction-1/test/img');mkdirSync(d,{recursive:true});writeFileSync(join(d,'figure-1.svg'),fixture);
  for(const bad of [{slug:'other/test'},{slug:'../test'},{figure:'../../figure-1.svg'},{format:'invalid'},{concept:'あ'.repeat(45)}]) assert.throws(()=>renderFigureSns({slug:'civil-construction-1/test','out-dir':'preview',...bad},root));
  assert.ok(!existsSync(join(root,'preview')));
 }finally{rmSync(root,{recursive:true,force:true});}
});
