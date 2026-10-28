import './lib/isolate-git-env.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { runRecord } from '../scripts/figure-review-queue.mjs';
import { buildQaSheet } from '../scripts/figure-qa-sheet.mjs';
import { captionStatus, hasFigureCaption, verdictsFromResults } from '../scripts/lib/figure-review.mjs';

const LEDGER = '.claude/state/quality/figure-review-ledger.json';
const SOURCES = 'config/figure-sources.json';
const ART = 'civil-construction-1/primary-r99-a';
const key = (n) => `${ART}/img/${n}`;

/** 白地に黒枠の図（w×h）。sliver=true は下端に 2 行の極薄の島（隣の図の切れ端）を足す */
async function figurePng(w, h, { sliver = false } = {}) {
  const raw = Buffer.alloc(w * h * 3, 255);
  const dot = (x, y) => { const i = (y * w + x) * 3; raw[i] = raw[i + 1] = raw[i + 2] = 0; };
  for (let x = 30; x < w - 30; x++) { dot(x, 40); dot(x, h - 100); }
  for (let y = 40; y <= h - 100; y++) { dot(30, y); dot(w - 31, y); }
  for (let i = 0; i < Math.min(w, h) - 200; i++) dot(60 + i, 60 + i);
  if (sliver) for (let y = h - 2; y < h; y++) for (let x = 100; x < 106; x++) dot(x, y); // 2 行×6 画素（全インクの約 1%）
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).png();
}

function put(root, rel, content) {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

const tag = (name, w, h, caption = '') => `<ArticleImage src="/${ART}/img/${name}.webp" alt="${name}" width={${w}} height={${h}}${caption ? ` caption="${caption}"` : ''} />`;

/** 図 6 枚＋記事＋空の台帳を持つ仮のリポジトリ（git 管理・HEAD に初期画像） */
async function makeRepo({ articleExtra = '' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'figure-loop-'));
  const names = ['ok1', 'ok2', 'ns1', 'su1', 'rx1', 'rx2'];
  for (const n of names) {
    const img = await figurePng(300, 400);
    put(root, `content/site/${key(n)}.png`, await img.clone().png().toBuffer());
    put(root, `content/site/${key(n)}.webp`, await img.webp({ quality: 80 }).toBuffer());
  }
  put(root, `content/site/${ART}/article.mdx`, `---\ntitle: t\npublished: true\n---\n\n${names.map((n) => `${tag(n, 300, 400)}\n${n === 'rx2' ? articleExtra : ''}`).join('\n')}\n`);
  put(root, SOURCES, `${JSON.stringify({
    schemaVersion: 1, _comment: 'fixture', _updated: '2026-10-12', _fields: {}, _manual_needs_comment: 'fixture', manual_needs: [], provenance: {}, categories: {},
  }, null, 2)}\n`);
  const git = (...a) => execFileSync('git', ['-C', root, '-c', 'user.name=t', '-c', 'user.email=t@example.com', ...a], { stdio: 'pipe' });
  git('init', '-q');
  git('add', '-A');
  git('commit', '-q', '-m', 'init');
  return { root, git };
}

const result = (figKey, extra) => ({ figKey, action: 'ok', newWidth: 0, newHeight: 0, cropBox: '', removed: '', reason: '図本体が欠けておらず写り込みも無い', sourcePdf: '', sourcePage: 0, sourceDpi: 0, selfVerify: 'clean', ...extra });
const reextract = (name) => result(key(name), {
  action: 'reextract', reason: '上端で切れていた作図線を原典のページから戻した', removed: '上端の欠け', newWidth: 300, newHeight: 400,
  cropBox: '(100,200,400,600)', sourcePdf: 'vault:原資料PDF/書籍/x/source/001.pdf', sourcePage: 122, sourceDpi: 300, selfVerify: 'clean',
});
const sixResults = () => [
  result(key('ok1')),
  result(key('ok2')),
  result(key('ns1'), { action: 'needs-source', reason: '下端で作図線が切れている（余白なし）' }),
  result(key('su1'), { action: 'source-unavailable', reason: '原典の PDF が手元に無い' }),
  reextract('rx1'),
  reextract('rx2'),
];

const quiet = async (fn) => {
  const err = console.error;
  const log = console.log;
  const lines = [];
  console.error = (...a) => lines.push(a.join(' '));
  console.log = (...a) => lines.push(a.join(' '));
  try { return { code: await fn(), lines }; } finally { console.error = err; console.log = log; }
};

test('1 周: 判定 4 枚と切り出し直し 2 枚を、手で JSON を書かず record --from-results だけで記録できる', async () => {
  const { root } = await makeRepo();
  const resultsFile = join(root, '.tmp/figure-loop/results-test.json');
  const rs = sixResults();
  rs[4] = { ...rs[4], rotate: 180, postColors: 16, postDespeckle: 6 }; // 逆さページを 180° 回し、減色と点の除去をした切り出し直し
  put(root, '.tmp/figure-loop/results-test.json', JSON.stringify(rs));
  const { code } = await quiet(() => runRecord(null, { fromResults: resultsFile, pass: [key('rx1'), key('rx2')], root }));
  assert.equal(code, 0);
  const ledger = JSON.parse(readFileSync(join(root, LEDGER), 'utf8')).figures;
  assert.deepEqual(Object.keys(ledger).sort(), ['ns1', 'ok1', 'ok2', 'rx1', 'rx2', 'su1'].map(key).sort());
  assert.deepEqual([ledger[key('ok1')].verdict, ledger[key('ok1')].action], ['ok', 'none']);
  assert.deepEqual([ledger[key('ns1')].verdict, ledger[key('ns1')].action], ['needs-source', 'none']);
  assert.equal(ledger[key('su1')].verdict, 'source-unavailable');
  assert.deepEqual([ledger[key('rx1')].verdict, ledger[key('rx1')].action], ['ok', 'reextract']);
  assert.match(ledger[key('rx1')].reason, /上端の欠け/);
  assert.deepEqual(ledger[key('rx1')].px, [300, 400]);
  // 出典は provenance へ（判定台帳には持たない）
  const prov = JSON.parse(readFileSync(join(root, SOURCES), 'utf8')).provenance;
  assert.deepEqual(Object.keys(prov).sort(), [key('rx1'), key('rx2')]);
  assert.equal(prov[key('rx1')].pdf, 'vault:原資料PDF/書籍/x/source/001.pdf');
  assert.equal(prov[key('rx1')].page, 122);
  // 切り出し枠・回転・後処理（DN-0570）が結果から provenance に入る。回転 0・後処理なしは省く
  assert.deepEqual(prov[key('rx1')].cropBox, [100, 200, 400, 600]);
  assert.equal(prov[key('rx1')].rotate, 180);
  assert.deepEqual(prov[key('rx1')].post, { despeckle: 6, colors: 16 });
  assert.deepEqual(prov[key('rx2')].cropBox, [100, 200, 400, 600]);
  assert.equal('rotate' in prov[key('rx2')] || 'post' in prov[key('rx2')], false);
  assert.equal(prov[key('ok1')], undefined);
});

test('record --from-results: 書き換えた図と suspect は --pass が無ければ記録せず、error も記録しない', async () => {
  const { root } = await makeRepo();
  const results = [
    ...sixResults().slice(0, 4),
    reextract('rx1'),
    result(key('rx2'), { action: 'ok', selfVerify: 'suspect' }),
    { figKey: key('nope'), action: 'error', reason: 'agent returned null（未処理）', selfVerify: 'suspect' },
  ];
  put(root, 'r.json', JSON.stringify(results));
  const { code, lines } = await quiet(() => runRecord(null, { fromResults: join(root, 'r.json'), pass: [], root }));
  assert.equal(code, 0);
  const ledger = JSON.parse(readFileSync(join(root, LEDGER), 'utf8')).figures;
  assert.deepEqual(Object.keys(ledger).sort(), ['ns1', 'ok1', 'ok2', 'su1'].map(key).sort(), '書き換え・suspect・error は台帳に入らない');
  assert.ok(lines.some((l) => l.includes(key('rx1')) && l.includes('QA')));
  assert.ok(lines.some((l) => l.includes(key('nope'))));
  // --pass に結果に無い図を渡すと拒む
  const bad = await quiet(() => runRecord(null, { fromResults: join(root, 'r.json'), pass: [key('missing')], root }));
  assert.equal(bad.code, 1);
});

test('record は png に切れ端（STRAY_SLIVER）が残る図を拒み、台帳を書かない（webp が綺麗でも）', async () => {
  const { root } = await makeRepo();
  const bad = await figurePng(300, 400, { sliver: true });
  put(root, `content/site/${key('ok1')}.png`, await bad.png().toBuffer()); // webp は綺麗なまま
  put(root, 'r.json', JSON.stringify([result(key('ok1'))]));
  const { code, lines } = await quiet(() => runRecord(null, { fromResults: join(root, 'r.json'), pass: [], root }));
  assert.equal(code, 1);
  assert.ok(lines.some((l) => l.includes('STRAY_SLIVER') && l.includes('.png')), lines.join('\n'));
  assert.equal(existsSync(join(root, LEDGER)), false, '拒んだら台帳は書かれない');
  // 切れ端のある webp も同じ
  const w = await figurePng(300, 400, { sliver: true });
  put(root, `content/site/${key('ok2')}.webp`, await w.webp({ lossless: true }).toBuffer());
  put(root, 'v.json', JSON.stringify([{ figKey: key('ok2'), verdict: 'ok', action: 'none', reason: '問題なし' }]));
  assert.equal((await quiet(() => runRecord('v.json'.replace(/^/, root + '/'), { root }))).code, 1);
  // 切れ端のある図でも needs-source（切り直さず原典から切り出し直す判定）なら記録できる
  put(root, 'n.json', JSON.stringify([{ figKey: key('ok1'), verdict: 'needs-source', action: 'none', reason: '下端で図が切れている' }]));
  assert.equal((await quiet(() => runRecord(join(root, 'n.json'), { root }))).code, 0);
});

test('結果 → 判定の変換: action ごとに verdict・action・source が決まる', () => {
  const { verdicts, skipped, errors } = verdictsFromResults([...sixResults(), result(key('c1'), { action: 'crop', removed: '図番号のキャプション' })], { pass: [key('rx1'), key('rx2'), key('c1')] });
  assert.deepEqual(errors, []);
  assert.deepEqual(skipped, []);
  const by = Object.fromEntries(verdicts.map((v) => [v.figKey.split('/').pop(), v]));
  assert.equal(by.c1.action, 'recrop');
  assert.equal(by.c1.source, undefined, '切り直し（recrop）は出典を持たない');
  assert.deepEqual(by.rx1.source, { pdf: 'vault:原資料PDF/書籍/x/source/001.pdf', page: 122, dpi: 300, cropBox: [100, 200, 400, 600] });
  const withPost = verdictsFromResults([{ ...reextract('rx1'), rotate: 180, postColors: 16, postDespeckle: 0, postWidth: 1200 }], { pass: [key('rx1')] });
  assert.equal(withPost.verdicts[0].source.rotate, 180);
  assert.deepEqual(withPost.verdicts[0].source.post, { width: 1200, colors: 16 });
});

test('MDX の caption 判定: caption 属性か直後の <p> があれば画面に図名・出典が残る', () => {
  assert.deepEqual(captionStatus(`${tag('a', 1, 1, '出典')}\n`, 'a'), { found: true, caption: true, nextP: false });
  assert.deepEqual(captionStatus(`${tag('a', 1, 1)}\n\n<p>図2.41 押え盛土</p>\n`, 'a'), { found: true, caption: false, nextP: true });
  assert.deepEqual(captionStatus(`${tag('a', 1, 1)}\n\n本文\n`, 'a'), { found: true, caption: false, nextP: false });
  assert.equal(captionStatus('本文', 'a').found, false);
  assert.equal(hasFigureCaption('軸\n 図2.41 押え盛土工法'), true);
  assert.equal(hasFigureCaption('図の説明は本文にある'), false);
});

test('qa-sheet: png・webp 両方の検査、新旧の並べ画像、図番号のキャプションが消えて MDX にも無い図を 1 回で出す', async () => {
  const { root } = await makeRepo();
  // rx1 を切り直す（幅 300→250。旧にだけ図番号のキャプションがある想定）。png に切れ端が残る
  const narrow = await figurePng(250, 400, { sliver: true });
  put(root, `content/site/${key('rx1')}.png`, await narrow.clone().png().toBuffer());
  put(root, `content/site/${key('rx1')}.webp`, await (await figurePng(250, 400)).webp({ quality: 80 }).toBuffer()); // 配信中の webp は綺麗
  // rx2 も切り直すが caption 属性を MDX に足してある
  const narrow2 = await figurePng(250, 400);
  put(root, `content/site/${key('rx2')}.png`, await narrow2.clone().png().toBuffer());
  put(root, `content/site/${key('rx2')}.webp`, await narrow2.webp({ quality: 80 }).toBuffer());
  const mdxPath = join(root, `content/site/${ART}/article.mdx`);
  writeFileSync(mdxPath, readFileSync(mdxPath, 'utf8').replace(tag('rx2', 300, 400), tag('rx2', 250, 400, '図2.41 押え盛土工法')));
  const stubOcr = (buf) => (buf.readUInt32BE(16) === 300 ? '図2.41 押え盛土工法\n本文' : '本文'); // PNG の IHDR の幅
  const outDir = join(root, '.tmp/figure-loop');
  const rs = await buildQaSheet([key('rx1'), key('rx2'), key('ok1')], { root, outDir, ocr: stubOcr });
  const by = Object.fromEntries(rs.map((r) => [r.figKey.split('/').pop(), r]));
  // rx1: png に切れ端 → 不合格。キャプションも消えて MDX に無い
  assert.equal(by.rx1.status, 'fail');
  assert.ok(by.rx1.files.find((f) => f.ext === 'png').sliver);
  assert.ok(!by.rx1.files.find((f) => f.ext === 'webp').sliver, 'webp だけ見れば素通りしていた');
  assert.equal(by.rx1.caption.status, 'lost');
  assert.ok(by.rx1.problems.some((p) => p.includes('STRAY_SLIVER')) && by.rx1.problems.some((p) => p.includes('caption')));
  assert.ok(existsSync(by.rx1.sheet.path), '新旧の並べ画像が出る');
  const sheet = await sharp(by.rx1.sheet.path).metadata();
  assert.equal(sheet.width, 300 + 24 + 250);
  // rx2: キャプションが画像から消えたが MDX の caption がある → 合格
  assert.equal(by.rx2.status, 'ok');
  assert.equal(by.rx2.caption.status, 'kept');
  // ok1: 変わっていない
  assert.equal(by.ok1.status, 'ok');
  assert.equal(by.ok1.sheet.path, null);
  assert.equal(by.ok1.caption.status, 'unchanged');
});

test('qa-sheet: OCR が使えなければキャプションを判定できないので検査不成立（緑にしない）', async () => {
  const { root } = await makeRepo();
  const narrow = await figurePng(250, 400);
  put(root, `content/site/${key('rx1')}.webp`, await narrow.webp({ quality: 80 }).toBuffer());
  const [r] = await buildQaSheet([key('rx1')], { root, ocr: () => null });
  assert.equal(r.status, 'inconclusive');
  const [none] = await buildQaSheet([key('absent')], { root });
  assert.equal(none.status, 'inconclusive');
});
