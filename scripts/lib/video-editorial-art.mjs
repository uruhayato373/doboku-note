/** Large-format teaching layouts. All geometry is expressed at 1920×1080.
 * Content stays above y=930, leaving the existing subtitle band available.
 * Per-scene choices live in visual.art; this module does not choose a layout.
 */
const C={ink:'#203A32',green:'#1B503C',paper:'#FCFCF8',pale:'#EAF3EE',blue:'#3379A1',gold:'#E6B64B',brown:'#9D7139',red:'#A24B2A',muted:'#58665E'};
const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rect=(x,y,w,h,f,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"/>`;
const line=(x1,y1,x2,y2,c=C.green,width=7,dash='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const arrow=(x1,y1,x2,y2,c=C.green)=>{const a=Math.atan2(y2-y1,x2-x1),len=24;return line(x1,y1,x2,y2,c)+`<path d="M ${x2-len*Math.cos(a-.55)} ${y2-len*Math.sin(a-.55)} L ${x2} ${y2} L ${x2-len*Math.cos(a+.55)} ${y2-len*Math.sin(a+.55)}" fill="none" stroke="${c}" stroke-width="7"/>`;};
const units=s=>[...s].reduce((n,c)=>n+(/[\x20-\x7e]/.test(c)?.62:1),0);
const segmenter=new Intl.Segmenter('ja',{granularity:'word'});
function wrap(value,cap){
 const all=[];
 for(const para of String(value).split('\n')){
  let row='';
  for(const {segment} of segmenter.segment(para)){
   if(row && units(row+segment)>cap && !/^[、。，．！？：；・）］」』]/u.test(segment)){all.push(row.trim());row='';}
   row+=segment;
  }
  if(row)all.push(row.trim());
 }
 return all;
}
function label(x,y,value,size=52,color=C.ink,anchor='start'){
 return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${xml(value)}</text>`;
}
function block(x,y,w,h,value,max=66,min=48,color=C.ink,align='start'){
 for(let size=max;size>=min;size-=2){
  const rows=wrap(value,(w-size*.3)/size),lh=size*1.3;
  if(rows.some(r=>units(r)*size>w)||rows.length*lh>h)continue;
  const xx=align==='middle'?x+w/2:x;
  return rows.map((r,i)=>label(xx,y+size+i*lh,r,size,color,align)).join('');
 }
 throw new Error(`文字が枠に収まらない: ${value} (${w}×${h})`);
}
function footer(value){return value?block(96,855,1728,72,value,40,34,C.muted):'';}
const diagramNames=new Set(['volume','curve','coldjoint','foundation','piles','excavation','organization','days','network','scaffold','five-management','decision','learning-loop','influence']);
export const EDITORIAL_LAYOUTS=['chapter','focus','grid','recap','cards','mapping','compare','numbers','steps','sheet','timeline','checklist','diagram','closing'];
export function validateEditorialArt(visual){
 const a=visual.art;
 if(!a||!EDITORIAL_LAYOUTS.includes(a.type))throw new Error(`画像の構図が未対応: ${a?.type}`);
 if(a.type==='chapter'&&(!Number.isInteger(a.number)||!a.title))throw new Error('章扉には number と title が必要');
 if(a.type==='diagram'&&!diagramNames.has(a.diagram))throw new Error(`図が未対応: ${a.diagram}`);
 if(a.type==='diagram'&&!a.source)throw new Error('サイト図解の source が必要');
 if(a.type==='diagram'&&['decision','learning-loop','influence'].includes(a.diagram)&&(visual.items??[]).length!==4)throw new Error('この図には4項目が必要');
 if(a.type==='mapping'&&(visual.items??[]).some(v=>!v.includes('→')))throw new Error('対応図には → で区切った対が必要');
}
function diagram(v){
 const a=v.art;let s='';
 if(a.diagram==='five-management'){
  s+=rect(430,280,1060,118,C.green,22)+block(460,295,1000,90,'同じ業務の、目的・制約・選択肢',62,52,'white','middle');
  s+=line(960,398,960,450)+line(256,450,1664,450);
  const names=['経済性\n管理','人的資源\n管理','情報管理','安全管理','社会環境\n管理'];
  const notes=['品質・費用\n工程','人員・能力\n働き方','共有\n信頼性','危険の把握\n低減','環境負荷\n周辺影響'];
  names.forEach((t,i)=>{const x=96+i*352;s+=arrow(x+160,450,x+160,494)+rect(x,510,320,310,i%2?C.pale:'#E9F1F5',20)+block(x+24,526,272,146,t,57,48,C.ink,'middle')+block(x+24,693,272,104,notes[i],43,38,C.muted,'middle');});
  s+=footer(a.note);
 }else if(a.diagram==='decision'){
  s+=rect(470,278,980,110,C.pale,18)+block(500,290,920,84,v.items[0],58,48,C.ink,'middle');
  s+=line(960,388,960,423)+line(525,423,1395,423)+arrow(525,423,525,449)+arrow(1395,423,1395,449);
  [1,2].forEach((n,i)=>{const x=180+i*870;s+=rect(x,460,690,155,i?C.green:C.blue,18)+block(x+30,474,630,130,v.items[n],56,44,'white','middle');});
  s+=line(525,615,525,650)+line(1395,615,1395,650)+line(525,650,1395,650)+arrow(960,650,960,683);
  s+=rect(470,695,980,123,C.pale,18)+block(500,710,920,95,v.items[3],59,48,C.ink,'middle')+footer(a.note);
 }else if(a.diagram==='learning-loop'){
  const pos=[[180,295],[1120,295],[1120,665],[180,665]];
  pos.forEach(([x,y],i)=>s+=rect(x,y,620,162,i%2?C.green:C.pale,22)+block(x+35,y+20,550,120,v.items[i],57,46,i%2?'white':C.ink,'middle'));
  s+=arrow(827,376,1085,376)+arrow(1430,485,1430,637)+arrow(1090,746,830,746)+arrow(490,637,490,485);
  s+=block(580,525,760,92,a.center??'学びを、次の業務へ',65,50,C.green,'middle')+footer(a.note);
 }else if(a.diagram==='influence'){
  s+=rect(490,282,940,120,C.green,20)+block(520,295,880,90,v.items[0],62,50,'white','middle');
  s+=line(960,402,960,465)+line(374,465,1546,465);
  v.items.slice(1).forEach((t,i)=>{const x=96+i*586;s+=arrow(x+278,465,x+278,503)+rect(x,518,556,278,i%2?'#E9F1F5':C.pale,22)+block(x+34,550,488,210,t,62,46);});s+=footer(a.note);
 }else if(a.diagram==='volume'){
  s+=rect(96,267,700,76,C.pale,12)+label(122,320,'例：L = 1.20 ／ C = 0.90',44);
  s+=label(235,480,'地山',62)+rect(220,550,420,158,C.blue,8)+label(255,657,'100 m³',76,'white');
  s+=line(680,630,815,630)+line(815,436,815,775)+arrow(815,436,1080,436)+arrow(815,775,1080,775);
  s+=label(867,390,'× L',62,C.blue)+label(867,724,'× C',62);
  s+=label(1170,333,'ほぐした土',58)+rect(1140,362,504,158,C.gold,8)+label(1170,470,'120 m³',76)+label(1680,465,'運搬',46);
  s+=label(1170,670,'締め固めた土',58)+rect(1140,700,378,158,C.green,8)+label(1170,810,'90 m³',76,'white')+label(1600,803,'盛土',46);
 }else if(a.diagram==='curve'){
  s+=label(110,337,'乾燥密度',43)+line(220,770,1130,770,C.ink,4)+line(220,770,220,351,C.ink,4);
  s+=`<path d="M280 725 C410 550 530 437 660 437 C790 437 940 550 1070 725" fill="none" stroke="${C.blue}" stroke-width="13"/>`;
  s+=line(220,437,660,437,C.red,5,'12 10')+line(660,437,660,770,C.red,5,'12 10')+`<circle cx="660" cy="437" r="15" fill="${C.red}"/>`;
  s+=label(280,393,'最大乾燥密度',48,C.red)+label(660,829,'最適含水比',48,C.red,'middle')+label(1000,829,'含水比',42)+label(295,755,'乾燥側',35,C.muted)+label(902,755,'湿潤側',35,C.muted);
  s+=rect(1220,305,604,520,C.green,22)+block(1260,337,524,132,'同じ締固め条件で\n水分には適した範囲',52,48,'white');
  for(const [i,t]of v.items.entries())s+=block(1260,493+i*98,524,88,t,42,36,'white');
 }else if(a.diagram==='coldjoint'){
  for(let i=0;i<2;i++){let x=96+i*890;s+=rect(x,286,838,440,i? '#F7E9E1':C.pale,24)+label(x+38,366,i?'限度を超過':'打重ね時間内',64,i?C.red:C.green);
   s+=rect(x+50,406,738,124,'#B6C9C2')+rect(x+50,530,738,124,'#819D91');
   s+=label(x+84,486,'後から打つ層',48)+label(x+84,609,'先に打った層',48,'white');
   if(i)s+=line(x+50,530,x+788,530,C.red,13,'24 12');
   s+=label(x+420,702,i?'界面が残る':'一体化する',46,i?C.red:C.green,'middle');
  }
  s+=footer(v.items.join(' ／ '));
 }else if(a.diagram==='foundation'){
  const names=['直接基礎','杭基礎','ケーソン基礎'];
  for(let i=0;i<3;i++){const x=96+i*586;s+=label(x+275,344,names[i],58,C.ink,'middle')+rect(x,390,550,320,'#E6D7BD')+rect(x, i?659:483,550,i?51:227,'#A8BAA1');
   s+=rect(x+170,365,210,55,C.blue);if(i===0)s+=rect(x+145,420,260,63,'#6F817B');else if(i===1)s+=rect(x+184,420,36,252,'#6F817B')+rect(x+331,420,36,252,'#6F817B');else s+=rect(x+184,420,182,252,'#6F817B');
   s+=label(x+275,776,i?'深い支持層':'浅い支持層',50,C.green,'middle');
  }s+=footer('支持層の深さと構造物の条件から、基礎形式を選ぶ');
 }else if(a.diagram==='piles'){
  const rows=[['オールケーシング','ケーシングで孔壁を保護'],['アースドリル','表層はケーシング・以深は安定液'],['リバース','孔内水位を高く保つ'],['深礎','土留めをしながら掘り下げる']];
  rows.forEach(([name,detail],i)=>{const x=96+(i%2)*888,y=275+Math.floor(i/2)*263;s+=rect(x,y,840,239,C.pale,20)+block(x+190,y+27,612,73,name,52,46)+block(x+190,y+113,612,105,detail,43,38);
   s+=rect(x+34,y+32,118,168,'#DDCCAE')+rect(x+64,y+32,58,155,i===1||i===2?'#9AC4D4':'#FAFAF8');
   if(i===0)s+=line(x+60,y+32,x+60,y+190,C.ink,7)+line(x+124,y+32,x+124,y+190,C.ink,7);
   if(i===1)s+=line(x+60,y+32,x+60,y+87,C.ink,7)+line(x+124,y+32,x+124,y+87,C.ink,7);
   if(i===3)for(let z=0;z<5;z++)s+=line(x+57,y+45+z*29,x+129,y+45+z*29,C.ink,7);
  });s+=footer('支持杭は先端、摩擦杭は周面摩擦で支える（孔壁保護の分類とは別）');
 }else if(a.diagram==='excavation'){
  for(let i=0;i<2;i++){const x=96+i*888;s+=rect(x,282,840,531,i? '#E9F1F5':'#F2EAE1',20)+label(x+420,362,i?'ボイリング':'ヒービング',62,C.ink,'middle')+label(x+420,426,i?'砂質地盤＋地下水':'軟弱粘性土',48,C.muted,'middle');
   s+=rect(x+50,488,740,240,i?'#D9D1AD':'#BCA68E')+rect(x+235,460,370,178,C.paper)+line(x+231,461,x+231,720,C.ink,12)+line(x+609,461,x+609,720,C.ink,12);
   if(i){for(let k=0;k<3;k++)s+=arrow(x+312+k*105,706,x+312+k*105,585,C.blue);}else{s+=`<path d="M${x+243} 638 Q${x+420} 551 ${x+597} 638" stroke="${C.red}" fill="none" stroke-width="12"/>`+arrow(x+420,706,x+420,608,C.red);}
   s+=label(x+420,782,i?'水と砂が湧き上がる':'底面の土が盛り上がる',46,C.ink,'middle');
  }s+=footer('土質・地下水の条件に応じ、根入れ・地下水位低下などの対策を選ぶ');
 }else if(a.diagram==='organization'){
  s+=rect(96,292,1728,210,C.pale,22)+label(140,367,'技術者の配置',42,C.muted)+label(140,454,'主任技術者',66)+arrow(620,427,940,427)+block(1010,381,750,100,'要件に応じ、監理技術者',58,52);
  ['発注者','元請','下請'].forEach((t,i)=>{const x=136+i*583;s+=rect(x,610,460,140,[C.blue,C.green,C.brown][i],18)+label(x+230,702,t,65,'white','middle');if(i<2)s+=arrow(x+480,680,x+563,680);});
  s+=footer('施工体制台帳：下請を含めた施工体制を書面にする');
 }else if(a.diagram==='days'){
  s+=label(110,334,'暦日',59)+rect(110,376,1700,120,'#D6DFD9');
  s+=rect(110,376,280,120,'#9BABA1')+rect(390,376,330,120,'#C1A780')+rect(720,376,1090,120,C.green);
  s+=label(250,455,'休日',53,'white','middle')+label(555,455,'悪天候',53,'white','middle')+label(1265,455,'作業可能日数',66,'white','middle');
  s+=label(110,562,'帯は概念図。日数の割合は現場ごとに異なる',38,C.muted);
  s+=arrow(1260,520,1260,617)+rect(720,641,1090,112,C.pale,18)+label(1265,716,'必要な施工速度を求める',58,C.ink,'middle');
  s+=block(110,617,532,190,v.items[0]??'工程は作業可能日数から',50,44);
  s+=footer(v.items.slice(1).join(' ／ '));
 }else if(a.diagram==='network'){
  const pts=[[195,563],[850,340],[850,750],[1645,563]],edges=[[0,1,'A 6日',430,356,C.red],[1,3,'B 10日',1200,354,C.red],[0,2,'C 4日',430,764,C.blue],[2,3,'D 5日',1200,765,C.blue]];
  for(const [f,t,name,x,y,c] of edges){const [x1,y1]=pts[f],[x2,y2]=pts[t],ang=Math.atan2(y2-y1,x2-x1);s+=arrow(x1+60*Math.cos(ang),y1+60*Math.sin(ang),x2-60*Math.cos(ang),y2-60*Math.sin(ang),c)+label(x,y,name,53,c);}
  pts.forEach(([x,y],i)=>s+=`<circle cx="${x}" cy="${y}" r="53" fill="${C.paper}" stroke="${C.ink}" stroke-width="5"/>`+label(x,y+19,i+1,52,C.ink,'middle'));
  s+=rect(633,501,690,123,C.pale,16)+label(978,580,'例：最長経路は16日',57,C.ink,'middle');
  s+=footer('6＋10＝16日 ／ 4＋5＝9日。全体工期は、長い経路で決まる');
 }else if(a.diagram==='scaffold'){
  s+=label(110,327,'手すりの高さを測る位置',44)+rect(150,651,740,35,C.brown)+line(200,378,200,756,C.ink,15)+line(840,378,840,756,C.ink,15)+line(200,400,840,400,C.ink,14)+line(200,530,840,530,C.ink,12);
  s+=line(969,400,969,651,C.red,6)+line(942,400,996,400,C.red,6)+line(942,651,996,651,C.red,6)+label(971,363,'85cm以上',50,C.red,'middle');
  s+=label(513,461,'手すり',43,C.muted,'middle')+label(513,598,'中桟',43,C.muted,'middle')+label(513,741,'作業床面',46,C.ink,'middle');
  v.items.forEach((t,i)=>s+=rect(1110,302+i*165,714,145,C.pale,18)+block(1142,329+i*165,650,110,t,48,42));
  s+=footer(a.note);
 }
 return s;
}
/** Render a scene as deterministic SVG; caller supplies the font to resvg. */
export function buildEditorialArtwork(scene, { theme } = {}){
 const v=scene.visual;validateEditorialArt(v);const a=v.art,items=v.items??[];
 let bg=C.paper,s='',dark=a.type==='chapter'||a.type==='recap'||a.type==='closing';
 if(dark)bg=C.green;
 s+=label(96,85,a.section??theme?.label??'2級土木施工管理技士',34,dark?'#D7E9DF':C.green);
 if(a.type==='chapter'){
  s+=rect(96,241,250,80,C.gold,13)+label(124,299,`第${a.number}章`,48);
  s+=block(96,370,a.motif==='soil'?1050:1728,340,a.title,units(a.title)<=7?250:152,98,'white');
  if(a.motif==='soil'){s+=rect(1300,500,430,240,'#9D7139')+rect(1300,500,430,55,'#E6B64B')+rect(1300,650,430,90,'#735838')+label(1515,818,'土の性質をつかむ',42,'#D7E9DF','middle');}
  s+=block(104,754,1600,130,items[0]??'',55,48,'#D7E9DF');
  s+=rect(1550,264,260,12,C.gold)+rect(1680,300,130,12,C.gold);
 }else if(a.type==='closing'){
  s+=block(96,254,1728,230,v.heading,112,84,'white');
  items.forEach((t,i)=>s+=block(130,555+i*100,1650,86,t,60,50,'white'));
 }else{
  s+=block(96,119,1728,140,v.heading,89,65,dark?'white':C.ink);
  if(a.type==='diagram')s+=diagram(v);
  else if(a.type==='focus'){
   s+=rect(96,325,16,418,C.gold)+block(167,349,1600,180,items[0]??v.heading,83,60);
   if(items.length>1)s+=block(172,607,1550,185,items.slice(1).join('\n'),64,48,C.green);
  }else if(['grid','cards','recap'].includes(a.type)){
   const cols=items.length>4?3:items.length===1?1:2,rows=Math.ceil(items.length/cols),gap=30,w=(1728-gap*(cols-1))/cols,h=(555-gap*(rows-1))/rows;
   items.forEach((t,i)=>{const x=96+(i%cols)*(w+gap),y=280+Math.floor(i/cols)*(h+gap);s+=rect(x,y,w,h,dark?(i%2?'#2B654C':'#245C46'):(i%2?C.pale:'#F1EEE2'),22)+label(x+30,y+64,String(i+1).padStart(2,'0'),44,dark?C.gold:C.green)+block(x+34,y+90,w-68,h-111,t,66,46,dark?'white':C.ink);});
   if(a.note)s+=footer(a.note);
  }else if(a.type==='mapping'){
   const h=Math.min(185,560/items.length);items.forEach((t,i)=>{const [left,...r]=t.split('→'),y=300+i*h;s+=block(104,y+14,735,h-33,left,59,46)+arrow(870,y+h*.45,1030,y+h*.45)+rect(1090,y,734,h-24,i%2?C.green:C.blue,18)+block(1125,y+17,664,h-60,r.join('→'),57,44,'white');});s+=footer(a.note);
  }else if(['compare','numbers','timeline'].includes(a.type)){
   const gap=40,w=(1728-gap*(items.length-1))/items.length;
   items.forEach((t,i)=>{const x=96+i*(w+gap),parts=t.split('\n');s+=rect(x,295,w,510,i%2?C.green:C.pale,24);const color=i%2?'white':C.ink;
    s+=block(x+42,343,w-84,a.type==='numbers'?171:128,parts[0],a.type==='numbers'?105:67,52,color);
    s+=block(x+42,a.type==='numbers'?550:512,w-84,237,parts.slice(1).join('\n'),58,46,color);
   });s+=footer(a.note);
  }else if(a.type==='steps'){
   const n=items.length,gap=58,w=(1728-gap*(n-1))/n;
   items.forEach((t,i)=>{const x=96+i*(w+gap);s+=label(x+w/2,390,String(i+1).padStart(2,'0'),78,C.green,'middle')+rect(x,438,w,308,i%2?C.green:C.pale,22)+block(x+23,481,w-46,222,t,64,46,i%2?'white':C.ink,'middle');if(i<n-1)s+=arrow(x+w+10,585,x+w+gap-10,585);});s+=footer(a.note);
  }else if(['sheet','checklist'].includes(a.type)){
   s+=rect(180,282,1560,552,'#EEF3EF',20);const h=490/items.length;
   items.forEach((t,i)=>{const y=310+i*h;s+=a.type==='checklist'?`<path d="M235 ${y+42} l20 21 l40 -50" stroke="${C.green}" stroke-width="9" fill="none"/>`:label(230,y+67,String(i+1).padStart(2,'0'),43,C.green);s+=block(338,y+10,1320,h-24,t,60,46);if(i<items.length-1)s+=line(230,y+h-4,1690,y+h-4,'#C3D4C9',2);});s+=footer(a.note);
  }
 }
 // This small label is identification, not teaching content.
 s+=label(1824,1021,theme?.label??'2級土木施工管理技士',25,dark?'#C4DBCE':'#84968B','end');
 let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><style>text{font-family:'Noto Sans JP';font-weight:700}</style>${rect(0,0,1920,1080,bg)}${s}</svg>`;
 if(theme){
  const colors={ [C.green]:theme.deep, [C.blue]:theme.base, [C.pale]:theme.soft??'#EEF3F8', '#245C46':theme.base, '#2B654C':theme.base };
  svg=svg.replace(/#[0-9a-f]{6}/gi,c=>colors[c]??c);
 }
 return svg;
}
