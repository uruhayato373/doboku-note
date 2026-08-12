#!/usr/bin/env node
/**
 * coconala-rate-buyer.mjs
 * ---------------------------------------------------------------------------
 * ココナラの**購入者評価**（出品者→購入者）を入力・送信するブラウザ CLI。
 *
 * 実機仕様（2026-08-11 確定）:
 *   - フォームは `/ratings/provider_add/{talkroomId}`。トークルームの「評価を入力する」は
 *     この URL への `<a>`（DOM の .click() では開かないことがあるので URL 直打ちが確実）。
 *   - 必須は4項目: 総合評価（**公開**・コメント400字）／要望のわかりやすさ／
 *     コミュニケーション／納期・スケジュール（後ろ3つは非公開・平均値だけ出る）。
 *   - 星は radio ではなく `span.rating-star-input.js_rating-*` 配下の `img[alt="1..5"]`。
 *     クリックで hidden の `input[name=score]` に値が入る。
 *   - 「確認する」→ 確認画面（`修正する` / `送信する`）→ 送信、の二段構え。
 *   - 評価期限内は双方の評価が揃うまで相手に公開されない。期限超過で入力側のみ公開。
 *
 * 安全設計（公開・取消不可の投稿のため）:
 *   - 既定は **入力までで停止**（draft-first）。送信は `--submit` 必須。
 *   - 星の読み戻しが全て 5 でない／コメントが空なら中断。400字超も事前に中断。
 *   - 確認画面の送信ボタンは**既知の名前だけ**を押す（盲目クリックしない）。
 *   - 送信後にトークルームを再取得し「評価未入力」「評価を入力する」が消えたことを検証。
 *   - 文面は**やり取りの実体に基づくこと**（捏造禁止）。星は現状 5 固定なので、
 *     5 をつけたくない取引では使わない（人が UI で入力する）。
 *
 * 使い方:
 *   node scripts/coconala-rate-buyer.mjs <talkroomId> <コメントtxtパス>            # 入力のみ
 *   node scripts/coconala-rate-buyer.mjs <talkroomId> <コメントtxtパス> --submit   # 送信
 *
 * 真実源: .claude/knowledge/reference/coconala-operations.md
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const ROOT='/Users/minamidaisuke/doboku-note';
const PROXY=process.env.HTTPS_PROXY||process.env.HTTP_PROXY||'';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const ROOM=process.argv[2];
const COMMENT=readFileSync(process.argv[3],'utf8').trim();
const SUBMIT=process.argv.includes('--submit');
const ctx=await chromium.launchPersistentContext(join(ROOT,'.local/playwright-coconala-profile'),{
  channel:'chrome',headless:false,ignoreHTTPSErrors:true,viewport:{width:1400,height:1050},
  args:['--disable-blink-features=AutomationControlled'],...(PROXY?{proxy:{server:PROXY}}:{})});
try{
  const page=ctx.pages()[0]||await ctx.newPage();
  await page.goto(`https://coconala.com/ratings/provider_add/${ROOM}`,{waitUntil:'domcontentloaded',timeout:90000});
  try{await page.waitForLoadState('networkidle',{timeout:25000});}catch{}
  await sleep(6000);
  if([...COMMENT].length>400){ console.error('ABORT: 400字超過'); await ctx.close(); process.exit(1); }
  console.log(`[1] room=${ROOM} コメント ${[...COMMENT].length} 字`);

  for(const w of ['js_rating-overall','js_rating-demand','js_rating-communication','js_rating-schedule']){
    const star=page.locator(`span.rating-star-input.${w} img[alt="5"]`).first();
    if(!(await star.count())){ console.error(`ABORT: ${w} の星が見つからない`); await ctx.close(); process.exit(2); }
    await star.click({timeout:15000}); await sleep(700);
  }
  await page.locator('textarea[name="data[overall_comment]"]').first().fill(COMMENT);
  await sleep(900);
  const st=await page.evaluate(()=>{
    const o={};
    for(const w of document.querySelectorAll('span.rating-star-input')) o[String(w.className).replace(/.*js_rating-/,'')]=w.querySelector('input[name=score]')?.value||'';
    return { scores:o, len:(document.querySelector('textarea[name="data[overall_comment]"]')?.value||'').length };
  });
  console.log('[2] 読み戻し:', JSON.stringify(st));
  if(!Object.values(st.scores).every(v=>v==='5')){ console.error('ABORT: 星が5に揃っていない'); await ctx.close(); process.exit(3); }
  if(st.len===0){ console.error('ABORT: コメントが空'); await ctx.close(); process.exit(4); }
  await page.screenshot({path:join(ROOT,`.tmp/rating-filled-${ROOM}.png`),fullPage:true});
  if(!SUBMIT){ console.log('>>> 入力のみ（--submit なし）。送信していません。'); await ctx.close(); process.exit(0); }

  const conf=page.getByRole('button',{name:'確認する'}).or(page.getByText('確認する',{exact:true})).first();
  await conf.click({timeout:20000});
  await sleep(6000);
  const c=await page.evaluate(()=>{
    const norm=s=>(s||'').replace(/\s+/g,' ').trim();
    return { url:location.href, text:norm(document.body.innerText).slice(0,700),
      buttons:[...document.querySelectorAll('button,input[type=submit],a.d-button')].map(b=>norm(b.innerText||b.value)).filter(Boolean).slice(-10) };
  });
  console.log('[3] 確認画面:', c.url, '\n    buttons=', JSON.stringify(c.buttons), '\n    text=', c.text.slice(0,300));
  await page.screenshot({path:join(ROOT,`.tmp/rating-confirm-${ROOM}.png`),fullPage:true});

  const NAMES=['評価を送信する','評価する','送信する','確定する','評価を確定する','この内容で送信する'];
  const hit=NAMES.find(n=>c.buttons.includes(n));
  if(!hit){ console.error('ABORT: 送信ボタンを特定できず（盲目クリックしない）'); await ctx.close(); process.exit(5); }
  await page.getByText(hit,{exact:true}).first().click({timeout:20000});
  await sleep(8000);
  await page.screenshot({path:join(ROOT,`.tmp/rating-done-${ROOM}.png`),fullPage:true});
  console.log(`[4] 「${hit}」を押下 → ${page.url()}`);

  // 検証: トークルームで「評価未入力」が消えたか
  await page.goto(`https://coconala.com/talkrooms/${ROOM}`,{waitUntil:'domcontentloaded',timeout:90000});
  await sleep(6000);
  const v=await page.evaluate(()=>{
    const t=(document.body.innerText||'').replace(/\s+/g,' ');
    return { 未入力:/評価未入力/.test(t), 評価を入力する:/評価を入力する/.test(t), 評価完了:/評価完了/.test(t) };
  });
  console.log('[5] 検証:', JSON.stringify(v));
  if(v.未入力||v.評価を入力する){ console.error('FAIL: まだ未入力の表示が残っている'); process.exitCode=6; }
  else console.log('[done] 評価を送信しました');
}finally{await ctx.close();}
