import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const dataset=JSON.parse(readFileSync(resolve('public/quiz/pe-first-stage.json'),'utf8'));
for(const unscored of [true,false]){
 test(unscored?'採点対象外は誤答色・×・採点母数へ入れない':'通常の誤答は赤で示し採点する',async({page})=>{
  const q=dataset.questions.find((q:any)=>unscored?q.id==='r01-retry-aptitude-ⅱ-14':q.correct!=null);
  const selected=unscored?1:(q.correct===1?2:1);
  await page.route('**/quiz/pe-first-stage.json',r=>r.fulfill({json:{...dataset,questions:[q],years:[{year:q.year,yearLabel:q.yearLabel,count:1,parts:[q.part]}]}}));
  await page.goto('/tools/kakomon-quiz/pe-first-stage');
  await page.getByRole('button',{name:/ランダム20問に挑戦/}).click();
  const answer=page.getByRole('button').filter({has:page.locator('span').filter({hasText:new RegExp(`^${selected}$`)})});
  await answer.click();
  if(unscored){
   await expect(page.getByText('この問題は採点対象外です。',{exact:false})).toBeVisible();
   await expect(answer).not.toHaveClass(/color-danger/);
   await expect(page.locator('li > span').filter({hasText:/^×/})).toHaveCount(0);
   await expect(page.locator('li > span').filter({hasText:/^—/})).toHaveCount(5);
  }else{
   await expect(page.getByText(/不正解（正解は/)).toBeVisible();
   await expect(answer).toHaveClass(/color-danger/);
  }
  await page.getByRole('button',{name:'結果を見る'}).click();
  await expect(page.getByText(unscored?'/ 0 問正解':'/ 1 問正解',{exact:true})).toBeVisible();
 });
}
