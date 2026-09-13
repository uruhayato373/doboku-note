import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { renderFigurePack, validateFigurePack, FIGURE_SLIDES } from '../scripts/render-figure-pack.mjs';
import { figurePackLabels } from '../.claude/scripts/sns/lib/figure-pack-labels.mjs';
function fixture(exam) {
  const root=mkdtempSync(join(tmpdir(),'dn-figure-pack-')),pack=`${exam}/keyword-packs/example`;
  const dir=join(root,'content/sns/instagram',pack);mkdirSync(join(dir,'carousel/img'),{recursive:true});
  const category={cem:'pe-comprehensive-management','civil-1':'civil-construction-1','pe-construction':'pe-construction'}[exam];
  const refs={};for(const key of ['article','figure']) {const path=`content/site/${category}/example/${key==='article'?'article.mdx':'img/figure-example.svg'}`;mkdirSync(join(root,`content/site/${category}/example/img`),{recursive:true});writeFileSync(join(root,path),key);refs[key]={path,sha256:createHash('sha256').update(key).digest('hex')};}
  const labels=figurePackLabels(exam);
  for(const name of FIGURE_SLIDES)writeFileSync(join(dir,'carousel/img',`${name}.svg`),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#ffffff"/><text x="20" y="30">${labels.exam} ${labels.badge} ${labels.destination}</text></svg>`);
  writeFileSync(join(dir,'source.json'),JSON.stringify({schemaVersion:1,...refs,needs:'何が違うか',nextStep:'https://doboku-note.com/links'}));
  return {root,pack,dir};
}
test('3資格で元図・元記事と4枚を検証し、1080×1350の不透明画像を再生成する',async()=>{
 for(const exam of ['cem','civil-1','pe-construction']){const f=fixture(exam);try{const images=renderFigurePack(f.pack,{root:f.root});assert.equal(images.length,4);for(const image of images){const info=await sharp(image).metadata();assert.equal(info.width,1080);assert.equal(info.height,1350);const {data}=await sharp(image).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let i=3;i<data.length;i+=4)assert.equal(data[i],255);}}finally{rmSync(f.root,{recursive:true,force:true});}}
});
test('元記事・元図の変更、資格取り違え、パストラバーサルを検出する',()=>{
 const f=fixture('civil-1');try{
  writeFileSync(join(f.root,'content/site/civil-construction-1/example/img/figure-example.svg'),'changed');assert.throws(()=>validateFigurePack(f.pack,f.root),/元figureが変更/);
  writeFileSync(join(f.root,'content/site/civil-construction-1/example/img/figure-example.svg'),'figure');
  writeFileSync(join(f.root,"content/site/civil-construction-1/example/article.mdx"),"changed");assert.throws(()=>validateFigurePack(f.pack,f.root),/元articleが変更/);
  writeFileSync(join(f.root,"content/site/civil-construction-1/example/article.mdx"),"article");
  const sourcePath=join(f.dir,'source.json'), source=JSON.parse(readFileSync(sourcePath,'utf8'));
  writeFileSync(sourcePath,JSON.stringify({...source,article:{...source.article,path:'content/site/pe-comprehensive-management/example/article.mdx'}}));
  assert.throws(()=>validateFigurePack(f.pack,f.root),/元記事とパックの資格/);
  writeFileSync(sourcePath,JSON.stringify({...source,figure:{...source.figure,path:'content/site/civil-construction-1/another/img/figure-example.svg'}}));
  assert.throws(()=>validateFigurePack(f.pack,f.root),/元図は元記事/);
  writeFileSync(sourcePath,JSON.stringify(source));
  const p=join(f.dir,'carousel/img/00-cover.svg');writeFileSync(p,readFileSync(p,'utf8').replaceAll('1級土木','技術士 総監'));assert.throws(()=>validateFigurePack(f.pack,f.root),/表紙の資格/);
  assert.throws(()=>validateFigurePack('../outside',f.root),/packは/);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
