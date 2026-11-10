import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  checkSendAllowed,
  classifyPost,
  cleanText,
  hashUser,
  parseRealtimeHtml,
  parseXPosts,
  selectCandidates,
  toneIssues,
  topicOf,
} from '../scripts/lib/x-reply-candidates.mjs';

const config = JSON.parse(fs.readFileSync(new URL('../config/x-reply-trial.json', import.meta.url), 'utf8'));
const NOW = Date.parse('2026-11-08T03:00:00Z');
// 検索語で取った投稿と同じく、既定で話題（技術士）を付ける
const post = (over) => ({ id: '1', user: 'a', text: '', createdAt: NOW - 3600_000, inReplyTo: '', topic: 'pe', ...over });
// 話題の語（技術士）を本文の頭に付けた投稿。選ぶ処理は本文に資格の語があることを求める
const tp = (over) => post({ ...over, text: `技術士 ${over.text ?? ''}` });

test('検索ページの投稿を取り出し、強調の印を消す', () => {
  const data = { props: { pageProps: { pageData: { timeline: { entry: [{
    id: '9', screenName: 'u', displayTextBody: '\tSTART\t技術士\tEND\t 合格', createdAt: 100, replyCount: 1, likesCount: 2,
  }] } } } } };
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`;
  const [item] = parseRealtimeHtml(html);
  assert.equal(item.text, '技術士 合格');
  assert.equal(item.createdAt, 100_000);
  assert.equal(item.url, 'https://x.com/u/status/9');
});

test('構造が違うページは null を返し、空の成功にしない', () => {
  assert.equal(parseRealtimeHtml('<html></html>'), null);
  assert.equal(parseRealtimeHtml('<script id="__NEXT_DATA__">{}</script>'), null);
});

test('強調の印は単語の間に残らない', () => {
  assert.equal(cleanText('a\tSTART\tb\tEND\tc'), 'abc');
});

test('尋ねている投稿・合格・不合格を分ける', () => {
  assert.equal(classifyPost(post({ text: '口頭試験までに何をすれば' }), config), 'ask');
  assert.equal(classifyPost(post({ text: '筆記に合格しました' }), config), 'pass');
  assert.equal(classifyPost(post({ text: '技術士、不合格でした' }), config), 'fail');
  // 技術士二次の成績は A・B の並びで書く人が多い（「不合格」の語がない）
  assert.equal(classifyPost(post({ text: '成績通知届きました。BBAでした' }), config), 'fail');
  assert.equal(classifyPost(post({ text: '選択Ⅱの判定がBでした' }), config), 'fail');
  assert.equal(classifyPost(post({ text: '口頭試験の準備をしている。想定問答が少なくて不安' }), config), 'study');
  // 2026-11-08 の外した投稿の見直しで足した語と成績の規則
  assert.equal(classifyPost(post({ text: '【技術士二次試験結果】CCC' }), config), 'fail');
  assert.equal(classifyPost(post({ text: '総監の筆記一発合格できて自分が一番びっくり' }), config), 'pass');
  assert.equal(classifyPost(post({ text: '口頭試験対策 QAのアウトプット10周目が終わった' }), config), 'study');
  assert.equal(classifyPost(post({ text: '筆記はAAAでした' }), config), 'other', 'AAA は不合格にしない');
  // リンク（t.co）が付いているだけでは宣伝にしない。発信アカウントの書き方は宣伝にする
  assert.equal(classifyPost(post({ text: '技術士二次試験、筆記で不合格でした https://t.co/abc' }), config), 'fail');
  assert.equal(classifyPost(post({ text: '口頭試験の想定問答をまとめました👇 https://t.co/abc' }), config), 'supplier');
});

test('配慮が要る投稿は、ほかの語より先に判定する', () => {
  assert.equal(classifyPost(post({ text: '不合格。どうすればいいのか。もう死にたい' }), config), 'care');
  assert.equal(classifyPost(post({ text: '不合格で失格でした。講座も考える' }), config), 'care');
});

test('講座側・返信・リポストは候補にしない', () => {
  assert.equal(classifyPost(post({ text: '合格しました', user: 'pafe_purin' }), config), 'supplier');
  assert.equal(classifyPost(post({ text: '添削の受付中。どうすれば合格できるか' }), config), 'supplier');
  assert.equal(classifyPost(post({ text: '合格しました', inReplyTo: '1' }), config), 'reply');
  assert.equal(classifyPost(post({ text: 'RT @x: 合格しました' }), config), 'reply');
});

test('添削・講座の語があっても、結果を書いた受験者本人の投稿は宣伝にしない（DN-1059）', () => {
  // 2026-11-09 に取りこぼした実際の投稿
  assert.equal(classifyPost(post({ text: '技術士の試験結果を上司に提出したら、「来年は添削コースに申し込もう！」て言われたけど、予想問題と骨子だけ下さい。あとは自分でやりますので。。' }), config), 'study');
  assert.equal(classifyPost(post({ text: 'ABAで不合格。来年は添削を受けようかな' }), config), 'fail');
  // 結果を書いていなければ、これまでどおり宣伝
  assert.equal(classifyPost(post({ text: '技術士二次の論文添削をしています' }), config), 'supplier');
  assert.equal(classifyPost(post({ text: '口頭試験対策の講座を開きます' }), config), 'supplier');
  // 自分のアカウント（@doboku373）の投稿は語によらず候補にしない
  assert.equal(classifyPost(post({ text: "総監の筆記、おつかれさまでした。届かなかった人は通知で確かめるところから", user: "doboku373" }), config), "supplier");
  // 強い宣伝の語は結果の語があっても宣伝
  assert.equal(classifyPost(post({ text: '不合格だった方へ、添削の受付中です' }), config), 'supplier');
});

test('1 アカウント 1 件で、尋ねている投稿を先に出す', () => {
  const posts = [
    tp({ id: '1', user: 'a', text: '不合格でした' }),
    tp({ id: '2', user: 'a', text: '不合格でした。どうすれば' }),
    tp({ id: '3', user: 'b', text: '合格しました' }),
    tp({ id: '3', user: 'b', text: '合格しました' }),
  ];
  const { candidates, counts } = selectCandidates(posts, config, { now: NOW });
  assert.deepEqual(candidates.map((c) => c.id), ['2', '3']);
  assert.equal(counts.total, 3);
});

test('古い投稿と返信済みの相手を除き、配慮の投稿は件数だけ残す', () => {
  const posts = [
    tp({ id: '1', user: 'old', text: '合格しました', createdAt: NOW - (config.limits.lookbackHours + 1) * 3600_000 }),
    tp({ id: '2', user: 'done', text: '合格しました' }),
    tp({ id: '3', user: 'c', text: 'もう死にたい' }),
  ];
  const { candidates, counts } = selectCandidates(posts, config, { now: NOW, repliedHashes: new Set([hashUser('done')]) });
  assert.equal(candidates.length, 0);
  assert.deepEqual([counts.old, counts.replied, counts.care], [1, 1, 1]);
});

test('話題ごとの上限と全体の上限で切る', () => {
  const one = Array.from({ length: 20 }, (_, i) => tp({ id: String(i), user: `u${i}`, text: '合格しました' }));
  const r1 = selectCandidates(one, config, { now: NOW });
  assert.equal(r1.candidates.length, config.limits.perTopic, '1 つの話題からは perTopic 件まで');
  assert.equal(r1.counts.overTopicLimit, 20 - config.limits.perTopic);
  const ids = config.topics.map((t) => t.id);
  const many = Array.from({ length: 60 }, (_, i) => post({ id: String(i), user: `m${i}`, text: `${config.topics[i % ids.length].match[0]} 合格しました`, topic: ids[i % ids.length] }));
  assert.equal(selectCandidates(many, config, { now: NOW }).candidates.length, Math.min(config.limits.candidatesPerRun, config.limits.perTopic * ids.length));
});

test('試験前の勉強・直前の悩みも拾い、結果の投稿より後に並べる', () => {
  assert.equal(classifyPost(post({ text: '過去問が全然解けない' }), config), 'study');
  const { candidates } = selectCandidates([
    tp({ id: '1', user: 's', text: '試験まで2週間、過去問を回している' }),
    tp({ id: '2', user: 'p', text: '筆記に合格しました' }),
  ], config, { now: NOW });
  assert.deepEqual(candidates.map((c) => c.kind), ['pass', 'study']);
});

test('タイムラインの投稿は match の語で資格に振り分け、どれにも当たらなければ候補にしない', () => {
  assert.equal(topicOf({ text: 'コンクリート主任技士の小論文が書けない' }, config.topics).id, 'concrete');
  assert.equal(topicOf({ text: '2級土木の二次、経験記述を書き直した' }, config.topics).id, 'civil-2');
  assert.equal(topicOf({ text: '今日のラーメンうまい' }, config.topics), null);
  // 検索語の話題でも、本文にその資格の語が無ければ振り分けない（「施工管理 勉強」で拾った建築・電気の投稿）
  assert.equal(topicOf({ text: '明日は二級施工管理技士（電気工事）の試験', topic: 'civil' }, config.topics), null);
  assert.equal(topicOf({ text: '1級土木の二次、経験記述', topic: 'civil' }, config.topics).id, 'civil-1');
  const { candidates, counts } = selectCandidates([
    post({ id: '1', user: 'x1', text: 'コンクリート技士 合格しました', topic: undefined }),
    post({ id: '2', user: 'x2', text: '資格試験に合格しました', topic: undefined }),
  ], config, { now: NOW });
  assert.deepEqual(candidates.map((c) => c.topic), ['concrete']);
  assert.equal(counts.offTopic, 1);
});

test('内蔵ブラウザで取り出した X の投稿を揃え、形の合わない行は数えて捨てる', () => {
  const { posts, invalid } = parseXPosts([
    { id: '123', user: 'abc_1', text: ' 技術士 合格 ', createdAt: NOW, isReply: false },
    { id: '124', user: 'abc_2', text: '返信です', createdAt: NOW, isReply: true },
    { id: 'x', user: 'bad user', text: 1, createdAt: 'no' },
  ]);
  assert.equal(invalid, 1);
  assert.deepEqual(posts.map((p) => [p.id, p.text, p.inReplyTo, p.source]), [['123', '技術士 合格', '', 'x'], ['124', '返信です', 'x', 'x']]);
  assert.equal(parseXPosts(null).posts.length, 0);
});

test('送信の門番: 期間・間隔・同じ相手を止める', () => {
  const base = { limits: config.limits, trial: config.trial };
  const at = (min) => new Date(NOW - min * 60_000).toISOString();
  const row = (min, user = 'x') => ({ at: at(min), userHash: hashUser(user) });
  assert.match(checkSendAllowed([], { ...base, user: 'a', now: Date.parse('2026-11-06T03:00:00Z') }), /期間/);
  // 終わり（to）を決めたときだけ、その後を止める。to が無ければ続ける（2026-11-11 に試行から継続の運用へ）
  const ended = { ...base, trial: { from: '2026-11-07', to: '2026-11-21' } };
  assert.match(checkSendAllowed([], { ...ended, user: 'a', now: Date.parse('2026-12-01T03:00:00Z') }), /期間/);
  assert.equal(checkSendAllowed([], { limits: config.limits, trial: { from: '2026-11-07' }, user: 'a', now: Date.parse('2027-06-01T03:00:00Z') }), null);
  assert.equal(checkSendAllowed([], { ...base, user: 'a', now: NOW }), null);
  // 間隔の下限は設定（minIntervalMinutes）から作る（2026-11-08 に 60 分→5 分へ変えたら 10 分前の固定値で落ちた）
  assert.match(checkSendAllowed([row(config.limits.minIntervalMinutes - 1)], { ...base, user: 'a', now: NOW }), /分あけます/);
  assert.equal(checkSendAllowed([row(61), row(62), row(63), row(64)], { ...base, user: 'a', now: NOW }), null);
  assert.match(checkSendAllowed([row(90, 'a')], { ...base, user: 'A', now: NOW }), /すでに返信/);
  assert.equal(checkSendAllowed([row(90)], { ...base, user: 'a', now: NOW }), null);
  // 返信した相手からの質問への答え（--answer）は 2 回目でも通し、返信していない相手には送らない
  assert.equal(checkSendAllowed([row(90, 'a')], { ...base, user: 'a', now: NOW, answer: true }), null);
  assert.match(checkSendAllowed([row(90, 'x')], { ...base, user: 'a', now: NOW, answer: true }), /まだ返信していません/);
  assert.match(checkSendAllowed([row(config.limits.minIntervalMinutes - 1, 'a')], { ...base, user: 'a', now: NOW, answer: true }), /分あけます/);
});

test('見送った相手は候補に戻らず、送信も止まる', () => {
  const posts = [tp({ id: '1', user: 'skip', text: '合格しました' }), tp({ id: '2', user: 'ok', text: '合格しました' })];
  const { candidates, counts } = selectCandidates(posts, config, { now: NOW, skippedHashes: new Set([hashUser('SKIP')]) });
  assert.deepEqual(candidates.map((c) => c.user), ['ok']);
  assert.equal(counts.skipped, 1);
  const base = { limits: config.limits, trial: config.trial, now: NOW };
  assert.match(checkSendAllowed([], { ...base, user: 'skip', skips: [{ userHash: hashUser('skip') }] }), /見送り/);
});

test('返信の記録は送った文面を持つ（文面の無い記録は型で止まる）', async () => {
  const { XReplyLog } = await import('../scripts/lib/dataset-schemas.mjs');
  const reply = { at: '2026-11-08T21:26:11Z', kind: 'study', topic: 'pe', targetId: '1', replyId: '2', userHash: '1eed37bd8179' };
  assert.equal(XReplyLog.safeParse({ schemaVersion: 1, replies: [reply], skips: [] }).success, false);
  assert.equal(XReplyLog.safeParse({ schemaVersion: 1, replies: [{ ...reply, text: '  ' }], skips: [] }).success, false);
  assert.equal(XReplyLog.safeParse({ schemaVersion: 1, replies: [{ ...reply, text: '体調を整えて進めてください。' }], skips: [] }).success, true);
  // 資格の無い記録は止める（試行の終わりに資格ごとの反応を比べるため）
  assert.equal(XReplyLog.safeParse({ schemaVersion: 1, replies: [{ ...reply, topic: undefined, text: '体調を整えて進めてください。' }], skips: [] }).success, false);
});

test('相手を評価する・指図する言い方を下書きから拾う（2026-11-09 運営者の指摘）', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../config/x-reply-trial.json', import.meta.url), 'utf8'));
  assert.deepEqual(toneIssues('同じ自治体の土木職出身として、筆記突破を心強く思います。', config), ['心強']);
  assert.deepEqual(toneIssues('始めて10日で全体を見渡せているのは良いペースです。', config), ['良いペース']);
  assert.deepEqual(toneIssues('残り一か月、体調を整えながら進めてください。', config), ['てください']);
  assert.deepEqual(toneIssues('共働きで子育てをしながらの筆記通過、おめでとうございます。準備を進められますように。', config), []);
});
