import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const article=readFileSync(new URL('../content/site/civil-construction-1/secondary-concrete-past-problems/article.mdx',import.meta.url),'utf8');
const section=(heading)=>article.split(`## ${heading}`)[1]?.split('\n## ')[0];
// DN-0214: 原問題の冊子3ページを視覚照合。別問題の解答の再混入を止める。
test('R1 問題3は打継目・かぶり・防錆・側圧・養生の5空欄',()=>{
 const s=section('令和元年度 選択問題〔1〕〔問題3〕');
 assert.ok(s);
 assert.match(s,/\(イ\) 小さい \/ \(ロ\) スペーサ \/ \(ハ\) 防錆 \/ \(ニ\) 大きく \/ \(ホ\) 湿潤/);
 for(const i of ['イ','ロ','ハ','ニ','ホ']) assert.equal((s.match(new RegExp(`【\\(${i}\\)】`,'g'))??[]).length,1);
 assert.match(s,/せん断力の \*\*【\(イ\)】/);
 assert.match(s,/打上がり速度が速いほど、コンクリート温度が低いほど \*\*【\(ニ\)】/);
});
test('H30 問題3の養生5空欄へ側圧や仕上げの解答を混ぜない',()=>{
 const s=section('平成30年度 選択問題〔1〕〔問題3〕');
 assert.ok(s);
 assert.match(s,/\(イ\) 水和 \/ \(ロ\) 湿潤 \/ \(ハ\) 養生用マット \/ \(ニ\) 長く \/ \(ホ\) 膜養生/);
 assert.doesNotMatch(s,/側圧|タンピング|ブリーディング/);
});
test('訂正記事に既知の側圧逆転を戻さない',()=>{
 assert.doesNotMatch(article,/スランプが小さ[^。\n|]*速度が遅い[^。\n|]*側圧は大き/);
 assert.match(article,/スランプが大きいほど側圧も大きく/);
});

// DN-0221: 10年度の原PDFの該当ページを視覚照合した設問配置。
// 問題番号・空欄の意味を別年度の文章へ戻す事故を検出する。
const sourceCases = [
 ['令和2年度 選択問題〔1〕〔問題3〕',['フライアッシュ','ひび割れ','高炉スラグ','スランプ','AE減水剤']],
 ['令和2年度 選択問題〔1〕〔問題4〕',['2.5','ブリーディング','沈下','50','湿潤']],
 ['平成30年度 選択問題〔1〕〔問題4〕',['自重','施工中','重要度','3.5','作用']],
 ['平成29年度 選択問題〔1〕〔問題3〕',['水セメント比','大きい','吐出量','材料分離','打込み速度']],
 ['平成28年度 選択問題〔1〕〔問題3〕',['スペーサ','材料分離','ブリーディング','再振動','付着']],
 ['平成27年度 選択問題〔1〕〔問題3〕',['レイタンス','吸水','塩化物イオン','防錆','ポリマー']],
 ['平成26年度 選択問題〔問題3〕',['ひび割れ','湿潤','水和','凍結','保温']],
 ['平成24年度 〔問題3〕',['レイタンス','凝結','粗骨材','粗','吸水']],
];
test('原典照合済みの8問で5空欄の記号と解答順が一致する',()=>{
 for(const [heading,answers] of sourceCases){
  const s=section(heading); assert.ok(s,heading);
  const prompt=s.split('<details>')[0];
  for(const i of 'イロハニホ') assert.equal((prompt.match(new RegExp(`【\\(${i}\\)】`,'g'))??[]).length,1,heading+i);
  assert.ok(s.includes(answers.map((a,i)=>`(${'イロハニホ'[i]}) ${a}`).join(' / ')),heading);
  assert.match(s,/原問題PDF[^\n]+#page=\d+/);
 }
});
test('掲載16問に架空のH26問題8やH23・H24問題5を混入させない',()=>{
 const hs=[...article.matchAll(/^## ((?:令和|平成).+)$/gm)].map(x=>x[1]);
 assert.equal(hs.length,16);
 assert.equal(new Set(hs).size,16);
 assert.ok(hs.includes('平成23年度 〔問題3〕'));
 assert.ok(hs.includes('平成24年度 〔問題3〕'));
 assert.ok(!hs.some(h=>/平成26年度.*問題8|平成2[34]年度.*問題5/.test(h)));
 for(const h of hs) assert.match(section(h),/https:\/\/dobokujira\.com\/wp-content\/uploads\/2021\/05\/[a-z0-9]+_1doboku_jitti_doboku\.pdf#page=\d+/);
});
test('H27の除外条件とH25の指定個数を答案へ反映する',()=>{
 const h27=section('平成27年度 選択問題〔2〕〔問題8〕');
 const answer=h27.split('<summary>解答例・解説</summary>')[1].split('設問が除外')[0];
 assert.doesNotMatch(answer,/養生|配合/);
 assert.equal((answer.match(/^\d+\. /gm)||[]).length,2);
 const h25=section('平成25年度 〔問題3〕');
 assert.match(h25,/三つ/); assert.match(h25,/各一つ/);
 assert.doesNotMatch(h25,/混和剤|JIS A 6204/);
});
