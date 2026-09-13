import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const article=readFileSync(new URL('../content/site/civil-construction-1/textbook-earthwork-planning/article.mdx',import.meta.url),'utf8');
const cells=s=>s.split('|').slice(1,-1).map(x=>x.trim());
const num=s=>Number(s.replaceAll(',','').replaceAll('−','-'));
test('表1.32は断面積から計算した各区間土量・地山換算・累加に一致',()=>{
 const areas=article.split('\n').filter(l=>/^\| [ABCD]（/.test(l)).map(cells);
 assert.equal(areas.length,4);
 const rows=article.split('\n').filter(l=>/^\| [ABC]〜[BCD] \|/.test(l)).map(cells);
 assert.equal(rows.length,3); let sum=0;
 rows.forEach((row,i)=>{
  const cut=(num(areas[i][1])+num(areas[i+1][1]))/2*20;
  const fill=(num(areas[i][2])+num(areas[i+1][2]))/2*20;
  const ground=fill/0.9, diff=cut-ground; sum+=diff;
  assert.deepEqual(row.slice(1).map(num),[cut,fill,ground,diff,sum],row[0]);
 });
 assert.equal(sum,-160);
});
test('表1.39の軸は入力から出力、9係数が土量状態比と一致',()=>{
 const table=article.split('**表1.39 土量換算係数fの値**')[1].split('（注）')[0];
 assert.match(table,/元の土量（q）↓ ／ 求める土量（Q）→/);
 const factor={地山の土量:1,ほぐした土量:1.2,締め固めた土量:0.9};
 const expression={'1':1,L:1.2,C:0.9,'1/L':1/1.2,'1/C':1/0.9,'C/L':0.9/1.2,'L/C':1.2/0.9};
 const rows=table.split('\n').filter(l=>/^\| (地山|ほぐした|締め固めた)土量/.test(l.replaceAll('の土量','土量'))).map(cells);
 assert.equal(rows.length,3);
 for(const row of rows) Object.values(factor).forEach((out,i)=>assert.equal(expression[row[i+1]],out/factor[row[0]]));
});
test('1,600は同時配車台数ではなく延べ運搬回数',()=>{
 assert.equal(7800*(1.2/0.9)/6.5,1600);
 assert.match(article,/1,600回は必要な運搬の延べ回数/);
 assert.doesNotMatch(article,/所要台数|1\{,\}600\\ \\text\{台\}/);
});
