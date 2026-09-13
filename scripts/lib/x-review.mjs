import fs from 'node:fs';
import path from 'node:path';
import { stripTweetMemos } from './x-tweets-md.mjs';
import { tweetLength } from '../check-x-length.mjs';
import { cardSpecHash } from './x-character-spec.mjs';

export function readTweetBlocks(markdown) {
  return Object.fromEntries([...stripTweetMemos(markdown).matchAll(/^## Tweet (\d+):\s*([^\r\n]+)\r?\n([\s\S]*?)(?=^## Tweet |$(?![\s\S]))/gm)]
    .map(m => [String(Number(m[1])), { title: m[2].trim(), text: m[3].replace(/(?:\r?\n)?---\s*$/,'').trim() }]));
}

export function readXReview(root) {
  const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
  const config=json('.claude/config/x-review.json');
  const plans=config.plans.flatMap(p=>json(p).posts);
  const ledger=json('.claude/state/sns/x-card-render.json').entries;
  const rows=[];
  for(const draft of config.drafts){
    const rel=`content/sns/x/draft/${draft}`,dir=path.join(root,rel),statusFile=path.join(dir,'status.json');
    if(!fs.existsSync(statusFile))throw new Error(`状態台帳がありません: ${draft}`);
    const status=JSON.parse(fs.readFileSync(statusFile,'utf8'));
    const blocks=fs.existsSync(path.join(dir,'tweets.md'))?readTweetBlocks(fs.readFileSync(path.join(dir,'tweets.md'),'utf8')):{};
    const cards=fs.existsSync(path.join(dir,'cards.json'))?JSON.parse(fs.readFileSync(path.join(dir,'cards.json'),'utf8')).tweets:{};
    for(const [num,t]of Object.entries(status.tweets??{})){
      const day=t.scheduled_at?.slice(0,10);
      if(!['scheduled','queued','posted'].includes(t.status)||!day||day<config.from||day>config.to)continue;
      const plan=plans.find(p=>p.draft===draft&&p.tweet===Number(num))??plans.find(p=>`${p.date}T${p.time}`===t.scheduled_at.slice(0,16));
      const card=cards[num];
      const text=t.text??blocks[num]?.text??'';
      const imgDir=path.join(dir,'img'),prefix=`tweet-${String(num).padStart(2,'0')}-`;
      const images=fs.existsSync(imgDir)?fs.readdirSync(imgDir).filter(n=>n.startsWith(prefix)&&n.endsWith('.png')):[];
      if(images.length>1)throw new Error(`同番号の画像が複数あります: ${draft} #${num}`);
      const imagePath=images.length?`${rel}/img/${images[0]}`:null;
      const renderPath=imagePath??Object.keys(ledger).find(p=>p.startsWith(`${rel}/img/${prefix}`));
      const entry=renderPath?ledger[renderPath]:null;
      const issues=[];
      if(card&&blocks[num]?.text.replace(/\r\n/g,'\n')!==text.replace(/\r\n/g,'\n'))issues.push('原稿と予約用本文が不一致');
      if(card&&entry?.specSha256!==cardSpecHash(card))issues.push('画像の生成・更新が必要');
      if(card&&!imagePath)issues.push('この端末では画像の再生成が必要');
      if(/\{\{[^}]+\}\}/.test(text)||t.manual_only)issues.push('別企画の公開・リンク確定待ち');
      const url=text.match(/https?:\/\/[^\s]+/)?.[0]??null;
      rows.push({id:`${draft}:${num}`,draft,num:Number(num),date:day,time:t.scheduled_at.slice(11,16),status:t.status,
        title:card?.headline.join('')??blocks[num]?.title??t.title,exam:plan?.exam??'',funnel:url?.startsWith('https://note.com/')?'note':plan?.funnel??'linkless',
        text,url,weighted:tweetLength(text),imagePath,alt:card?.alt??'既存投稿の画像',newCard:Boolean(card),issues,
        magazineId:plan?.magazineId??null,character:card?.character??null,renderPath,imageSha256:entry?.sha256??null});
    }
  }
  rows.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  return {title:config.title,from:config.from,to:config.to,timezone:config.timezone,rows,
    counts:{all:rows.length,newCards:rows.filter(x=>x.newCard).length,note:rows.filter(x=>x.newCard&&x.funnel==='note').length,
      retainedQueued:rows.filter(x=>x.status==='queued').length,needsAttention:rows.filter(x=>x.issues.length).length}};
}
