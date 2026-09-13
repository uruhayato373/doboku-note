import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {checkImages} from '../scripts/lib/check-mdx-images.mjs';
test('posts URLをcontent/site実体で調べ、欠落とHTML偽装を区別する',()=>{
 const root=mkdtempSync(join(tmpdir(),'dn-mdx-images-'));
 try{
  mkdirSync(join(root,'content/site/exam/topic/img'),{recursive:true});
  writeFileSync(join(root,'content/site/exam/topic/img/figure-test.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"/>');
  assert.deepEqual(checkImages('article.mdx','<ArticleImage src="/posts/exam/topic/img/figure-test.svg" />',root),[]);
  const missing=checkImages('article.mdx','<img src="/posts/exam/topic/img/missing.png" />',root);assert.equal(missing.length,1);assert.match(missing[0].error,/content\/site/);
  writeFileSync(join(root,'content/site/exam/topic/img/fake.png'),'<!DOCTYPE html><html>error</html>');
  const fake=checkImages('article.mdx','<img src="/posts/exam/topic/img/fake.png" />',root);assert.equal(fake.length,1);assert.match(fake[0].error,/HTML/);
  const escape=checkImages('article.mdx','<img src="/posts/../../private.svg" />',root);assert.equal(escape.length,1);assert.match(escape[0].error,/escapes/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
