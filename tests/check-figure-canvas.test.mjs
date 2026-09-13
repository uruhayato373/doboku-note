import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
// 本番CLIとGitのstageを隔離環境で動かし、0枚検査の偽成功を再発させない。
test('staged SVGを実際に検査し、不正寸法と命名を拒否する',()=>{
 const root=mkdtempSync(join(tmpdir(),'dn-canvas-gate-'));
 try{
  for(const file of ['scripts/check-figure-canvas.mjs','scripts/lib/repository-paths.mjs','.claude/config/figure-canvas.json']){
   mkdirSync(dirname(join(root,file)),{recursive:true});copyFileSync(new URL(`../${file}`,import.meta.url),join(root,file));
  }
  execFileSync('git',['init','-q'],{cwd:root});
  const path='content/site/civil-construction-1/example/img/figure-test.svg';mkdirSync(dirname(join(root,path)),{recursive:true});
  const run=()=>spawnSync(process.execPath,['scripts/check-figure-canvas.mjs','--staged'],{cwd:root,encoding:'utf8'});
  writeFileSync(join(root,path),'<svg viewBox="0 0 400 500"/>');execFileSync('git',['add','--',path],{cwd:root});
  let result=run();assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/1 枚検査/);
  writeFileSync(join(root,path),'<svg viewBox="0 0 600 500"/>');execFileSync('git',['add','--',path],{cwd:root});
  result=run();assert.equal(result.status,1);assert.match(result.stderr,/600×500/);
  writeFileSync(join(root,path),'<svg viewBox="0 0 400 500"/>');execFileSync('git',['add','--',path],{cwd:root});
  for(const dir of ['r08-secondary','r08-primary','r01-retry-basic','r01-aptitude','r01-construction','secondary-r06']){
   const exam=`content/site/pe-comprehensive-management/${dir}/img/exam-original.svg`;
   mkdirSync(dirname(join(root,exam)),{recursive:true});writeFileSync(join(root,exam),'<svg viewBox="0 0 960 510"/>');
   execFileSync('git',['add','--',exam],{cwd:root});result=run();assert.equal(result.status,0,result.stderr);
  }
  const bad=path.replace('figure-test.svg','diagram.svg');writeFileSync(join(root,bad),'<svg viewBox="0 0 400 500"/>');execFileSync('git',['add','--',bad],{cwd:root});
  result=run();assert.equal(result.status,1);assert.match(result.stderr,/命名規則違反/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
