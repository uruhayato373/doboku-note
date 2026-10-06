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
test('2級土木の過去問（primary-*/secondary-*）も過去問として扱い、ガイドは検査を残す（2026-10-02）',()=>{
 // 以前は civil-construction-1 だけが対象で、2級の過去問ページに 9-6（正答記号）の誤検知 HIGH が数百件出ていた
 const root=mkdtempSync(join(tmpdir(),'dn-exam-lint-c2-'));
 try{
  const body='---\ntitle: 試験\ncategory: civil-construction-2\ngroup: primary\n---\n\n導入文です。\n\n'+[1,2,3].map(i=>`## 問題 No.${i}\n\n説明です。\n\n<ExamPoint summary="計算の確認" items={["条件の整理"]} />\n\n正答：①\n`).join('\n');
  for(const [slug,exam] of [['primary-r04-zenki',true],['secondary-r07',true],['guide-overview',false]]){
   const dir=join(root,'civil-construction-2',slug);mkdirSync(dir,{recursive:true});const file=join(dir,'article.mdx');writeFileSync(file,body);
   const r=spawnSync(process.execPath,['.claude/scripts/lint-mdx-mobile.mjs',file],{encoding:'utf8'});
   assert.equal(/\(9-1\)|\(9-6\)/.test(r.stdout),!exam,`${slug}\n${r.stdout}${r.stderr}`);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('1級・2級土木の二次過去問は「問題 N」の設問文を 15-x から外し、解説とガイドは検査を残す（2026-10-06）',()=>{
 // 1級 secondary-r03 の法令条文の穴埋め（公式の設問文）に 15-2 が 3 件出ていた
 const root=mkdtempSync(join(tmpdir(),'dn-exam-prose-civil-'));
 try{
  const long='判断に必要な施工条件を確認するための文章'.repeat(10)+'。';
  for(const category of ['civil-construction-1','civil-construction-2']){
   const header='---\ntitle: 試験\ncategory: '+category+'\ngroup: secondary\n---\n';
   const dir=join(root,category,'secondary-r03');mkdirSync(dir,{recursive:true});const file=join(dir,'article.mdx');
   writeFileSync(file,header+'## 問題 6\n\n'+long+'\n\n<details>\n<summary>解説</summary>\n短い説明。\n</details>\n');
   let r=spawnSync(process.execPath,['.claude/scripts/lint-mdx-mobile.mjs',file],{encoding:'utf8'});assert.equal(/\(15-2\)/.test(r.stdout),false,r.stdout);
   for(const body of ['## 問題 6\n\n原文。\n\n<details>\n<summary>解説</summary>\n'+long+'\n</details>\n','## 学習のポイント\n\n'+long+'\n']){
    writeFileSync(file,header+body);
    r=spawnSync(process.execPath,['.claude/scripts/lint-mdx-mobile.mjs',file],{encoding:'utf8'});assert.equal(/\(15-2\)/.test(r.stdout),true,r.stdout);
   }
   const guideDir=join(root,category,'guide-secondary');mkdirSync(guideDir,{recursive:true});const guide=join(guideDir,'article.mdx');
   writeFileSync(guide,header+'## 問題 6\n\n'+long+'\n');
   r=spawnSync(process.execPath,['.claude/scripts/lint-mdx-mobile.mjs',guide],{encoding:'utf8'});assert.equal(/\(15-2\)/.test(r.stdout),true,r.stdout);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('DN-0549: 公式問題の中の表は 1-3 の対象外、解説の表とガイドの表は検査する／測量士の過去問の正答記号は 9-6 にしない', () => {
  const root = mkdtempSync(join(tmpdir(), 'dn-official-table-'));
  const run = (file) => spawnSync(process.execPath, ['.claude/scripts/lint-mdx-mobile.mjs', file], { encoding: 'utf8' }).stdout;
  try {
    const table = '| 作業 | 所要日数 | 先行作業 | 備考 |\n|---|---|---|---|\n| A | 5 | なし | - |\n| B | 2 | A | - |\n';
    const write = (category, slug, body) => {
      const dir = join(root, category, slug);
      mkdirSync(dir, { recursive: true });
      const file = join(dir, 'article.mdx');
      writeFileSync(file, '---\ntitle: 試験\ncategory: ' + category + '\ngroup: primary\n---\n\n導入文です。\n\n' + body);
      return file;
    };
    // 総監の択一: 問題の中の表は対象外、<details> の解説の表は検査する
    let out = run(write('pe-comprehensive-management', 'r05-primary', '## Ⅰ-1-1\n\n次の表について答えよ。\n\n' + table + '\n<details>\n<summary>解説</summary>\n\n**正答：1**\n\n</details>\n'));
    assert.equal(/\(1-3\)/.test(out), false, out);
    out = run(write('pe-comprehensive-management', 'r06-primary', '## Ⅰ-1-1\n\n設問。\n\n<details>\n<summary>解説</summary>\n\n解説の表は次のとおり。\n\n' + table + '\n</details>\n'));
    assert.equal(/\(1-3\)/.test(out), true, out);
    // 測量士の過去問: 問題の表は対象外・正答記号は 9-6 にしない
    out = run(write('surveyor', 'primary-r07', '## No.1\n\n次の表について答えよ。\n\n' + table + '\n<details>\n<summary>解答・解説</summary>\n\n**正答：2**\n\n</details>\n'));
    assert.equal(/\(1-3\)|\(9-6\)/.test(out), false, out);
    // ガイドは表も正答記号も検査を残す（インラインコードの書式説明だけは 9-6 にしない）
    out = run(write('surveyor', 'guide-overview', '## 表\n\n次の表のとおり。\n\n' + table + '\n正答：2 のように書く。\n\n書式は `**正答：N**` とする。\n'));
    assert.equal(/\(1-3\)/.test(out), true, out);
    assert.equal((out.match(/\(9-6\)/g) || []).length, 1, out);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('15-1 の文末の連続は見出しで区切る', () => {
  const root = mkdtempSync(join(tmpdir(), 'dn-prose-heading-'));
  try {
    const dir = join(root, 'civil-construction-1', 'guide-x');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'article.mdx');
    const head = '---\ntitle: ガイド\ncategory: civil-construction-1\ngroup: guide\n---\n\n';
    writeFileSync(file, head + '## 前半\n\n一つ目です。二つ目です。\n\n## 後半\n\n三つ目です。四つ目です。\n');
    let out = spawnSync(process.execPath, ['.claude/scripts/lint-mdx-mobile.mjs', file], { encoding: 'utf8' }).stdout;
    assert.equal(/\(15-1\)/.test(out), false, out);
    writeFileSync(file, head + '## 前半\n\n一つ目です。二つ目です。三つ目です。\n');
    out = spawnSync(process.execPath, ['.claude/scripts/lint-mdx-mobile.mjs', file], { encoding: 'utf8' }).stdout;
    assert.equal(/\(15-1\)/.test(out), true, out);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
