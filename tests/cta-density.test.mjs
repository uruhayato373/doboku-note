import process from 'node:process';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { inspectHtml, auditDirectory, PAGE_ALLOWLIST, SURFACE_ALLOWLIST } from '../scripts/check-cta-density.mjs';

const note = (id, placement = 'article-body', label = id) => `<a data-cta-label="${label}" href="https://note.com/test/m/${id}?utm_content=${label}" data-cta-placement="${placement}" data-cta="note">教材</a>`;
const ab = n => `<div data-note-body-arm="image">${n}</div><div data-note-body-arm="text">${n}</div>`;
const article = (body, top = '', footer = '') => `<main><article>${top}<div class="prose-blog">${body}</div></article>${footer}</main>`;
const inspect = html => inspectHtml(html, 'exam/civil-construction-1/guide/test');
const rules = html => inspect(html).violations.map(v => v.rule);
const affiliate = (placement = 'article-mid', extra = '') => `<a data-cta="affiliate" rel="nofollow sponsored noopener" data-cta-placement="${placement}" ${extra}>転職</a>`;

test('3枚の異なる商品と別枠のもくじは違反なし、無料 note は数えない', () => {
  const hub = p => note('contents', p, `category-test-hub-mokuji-${p === 'article-footer' ? 'footer' : 'docs-sb'}`);
  const r = inspect(article(`<h2>本文</h2>${note('b')}${note('c')}<a data-cta="note-article">無料</a>`, note('a', 'article-top'), `${hub('article-footer')}<aside>${hub('article-sidebar')}</aside>`));
  assert.equal(r.noteCount, 5);
  assert.deepEqual(r.violations, []);
});

test('ラベル末尾によらず手書き4枚を数え、最初のh2前の2枚を検出', () => {
  const r = inspect(article(`${note('a')}${note('b')}<h2>本文</h2>${note('c')}${note('d')}`));
  assert.deepEqual(r.violations.map(v => v.rule), ['note-non-footer', 'note-before-first-h2']);
  assert.deepEqual(r.violations[0].causes, ['manual-manual']);
});

test('隣接するA/Bの2案は1枚。同じ商品を別枠で再掲すれば重複', () => {
  assert.deepEqual(rules(article(`<h2>本文</h2>${ab(note('a'))}${ab(note('b'))}${ab(note('c'))}`)), []);
  const r = inspect(article(`<h2>本文</h2>${ab(note('a', 'article-body', 'manual'))}`, note('a', 'article-top', 'auto')));
  assert.equal(r.noteCount, 2);
  assert.equal(r.violations[0].rule, 'note-product-dup');
  assert.deepEqual(r.violations[0].causes, ['auto-manual']);
});

test('同じラベルの手書き2枠もA/Bごとに保持し、手書き同士の重複を検出', () => {
  const r = inspect(article(`<h2>本文</h2>${ab(note('a'))}${ab(note('a'))}`));
  assert.equal(r.noteCount, 2);
  assert.deepEqual(r.violations[0].causes, ['manual-manual']);
});

test('手書きarticle-midを自動と誤分類せず、自動枠のラベルだけを区別する', () => {
  const end = note('a', 'article-end', 'pe1-r01-aptitude');
  const manual = inspect(article(`<h2>本文</h2>${note('a', 'article-mid', 'pe1-r01-aptitude-mid')}${end}`));
  assert.deepEqual(manual.violations[0].causes, ['manual-manual']);
  for (const label of ['a:guide-top-mid', 'a:guide-inline-0-mid']) {
    const auto = inspect(article(`<h2>本文</h2>${note('a', 'article-mid', label)}${end}`));
    assert.deepEqual(auto.violations[0].causes, ['auto-manual']);
  }
});

test('対応しない実験案や別の兄弟で隔てた枠を一緒にしない', () => {
  for (const body of [
    `<div data-note-body-arm="image">${note('a')}</div><div data-note-body-arm="text">${note('b')}</div>`,
    `<div data-note-body-arm="image">${note('a')}</div><p>区切り</p><div data-note-body-arm="text">${note('a')}</div>`,
  ]) assert.equal(inspect(article(`<h2>本文</h2>${body}`)).noteCount, 2);
});

test('h2が無い記事も冒頭の連続配置を検出', () => {
  assert.ok(rules(article(`${note('a')}${note('b')}`)).includes('note-before-first-h2'));
});

test('記事末・サイドバーの各note上限は1枚', () => {
  assert.deepEqual(rules(article('<h2>本文</h2>', '', note('a', 'article-footer') + note('b', 'article-footer'))), ['note-article-footer']);
});

test('旧ネイティブカードも数では制限しない', () => {
  assert.deepEqual(rules(article(`<h2>本文</h2>${affiliate()}`)), []);
  assert.deepEqual(rules(article(`<h2>本文</h2>${affiliate()}${affiliate()}`)), []);
  const pair = `<div class="grid grid-cols-2">${affiliate('article-mid', 'data-cta-variant="B2"')}${affiliate('article-mid', 'data-cta-variant="B2"')}</div>`;
  assert.deepEqual(rules(article(`<h2>本文</h2>${pair}`)), []);
  assert.deepEqual(rules(article(`<h2>本文</h2>${pair.repeat(20)}`)), []);
});

test('記事下とasideのsponsoredリンクはdata-ctaが無くても検出', () => {
  for (const footer of ['<a rel="sponsored">PR</a>', '<aside><a rel="noopener sponsored">PR</a></aside>']) {
    assert.deepEqual(rules(article('<h2>本文</h2>', '', footer)), ['affiliate-forbidden-surface']);
  }
  assert.ok(rules(article(`<h2>本文</h2>${affiliate('article-end')}`)).includes('affiliate-forbidden-surface'));
  assert.ok(rules(`<div>${article('<h2>本文</h2>')}<aside class="hidden zenn-desktop:block"><a rel="sponsored">PR</a></aside></div>`).includes('affiliate-forbidden-surface'));
});

test('画面幅別の旧カードは数で制限せず、PCの禁止面は検出する', () => {
  const responsive = `<div class="hidden zenn-desktop:block">${affiliate()}</div><div class="zenn-desktop:hidden">${affiliate()}</div>`;
  assert.deepEqual(rules(article(`<h2>本文</h2>${responsive}`)), []);
  const r = inspect(`<div>${article(`<h2>本文</h2>${responsive}`)}<aside class="hidden zenn-desktop:block">${affiliate('standards-sidebar')}</aside></div>`);
  assert.deepEqual(r.violations.map(v => v.rule), ['affiliate-forbidden-surface']);
});

test('非記事カテゴリの広告面は対象外。ピクセル重複ガードは維持', () => {
  assert.deepEqual(rules(`<main><aside>${affiliate()}${affiliate()}</aside></main>`), []);
  const pixel = '<img src="https://px.a8.net/0.gif?a8mat=A+B+C+D" width="1" height="1">';
  assert.deepEqual(rules(`${pixel}<script>${pixel}</script>`), []);
  assert.deepEqual(rules(pixel + '<span hidden data-a8-pixel="https://px.a8.net/0.gif?a8mat=A+B+C+D"></span>'), ['affiliate-pixel-dup']);
  const mo = '<img src="https://i.moshimo.com/af/i/impression?a_id=1&amp;p_id=2&amp;pl_id=3">';
  assert.deepEqual(rules(mo + mo), ['affiliate-pixel-dup']);
});

test('RSC・style・templateの文字列は数えない', () => {
  assert.equal(inspect(article(`<h2>本文</h2>${note('a')}<script>${note('a')}</script><template>${note('a')}</template>`)).noteCount, 1);
});

test('非記事のnote総数30の上限を維持し、無料noteは上限に含めない', () => {
  assert.deepEqual(rules(Array.from({ length: 30 }, (_, i) => note(`p${i}`)).join('')), []);
  assert.deepEqual(rules(Array.from({ length: 31 }, (_, i) => note(`p${i}`)).join('')), ['note-total']);
  assert.deepEqual(rules('<a data-cta="note-article">無料</a>'.repeat(31)), []);
});

test('CLIは検査0件でexit 1、違反ありで1、違反なしで0。集計に実検査数を残す', () => {
  const tempRoot = join(REPO_ROOT, '.tmp');
  mkdirSync(tempRoot, { recursive: true });
  const dir = mkdtempSync(join(tempRoot, 'cta-density-'));
  const cli = () => spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/check-cta-density.mjs'), '--out', dir, '--json'], { encoding: 'utf8' });
  try {
    let r = cli();
    assert.equal(r.status, 1);
    assert.equal(JSON.parse(r.stdout).checkedPages, 0);
    writeFileSync(join(dir, 'ok.html'), article(`<h2>本文</h2>${ab(note('a'))}`));
    mkdirSync(join(dir, 'pagefind'));
    writeFileSync(join(dir, 'pagefind', 'ignored.html'), note('a'));
    r = cli();
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).files, 1);
    writeFileSync(join(dir, 'bad.html'), article(`<h2>本文</h2>${note('a')}${note('a')}`));
    r = cli();
    assert.equal(r.status, 1);
    const report = auditDirectory(dir);
    assert.equal(report.checkedPages, 2);
    assert.equal(report.violationCount, 1);
    assert.equal(report.byPageTypeAndCause[0].cause, 'manual-manual');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


test('冒頭＋本文直後の2枚だけを許可し、本文中間や手書きの再掲を許さない', () => {
  const top = note('a', 'article-top', 'a:guide-top');
  for (const label of ['a:guide-top-end', 'a:guide-end']) {
    const end = note('a', 'article-end', label);
    const html = article('<h2>本文</h2>', top).replace('</article>', `${end}</article>`);
    assert.deepEqual(rules(html), []);
    assert.ok(rules(article(`<h2>本文</h2>${end}`, top)).includes('note-product-dup'), '手書きendは許可しない');
    assert.ok(rules(html.replace('</div>', `${note('a', 'article-mid')}</div>`)).includes('note-product-dup'), '3回は不可');
  }
  assert.ok(rules(article(`<h2>本文</h2>${note('a', 'article-mid')}`, top)).includes('note-product-dup'));
});

test('季節商品のもくじタイルもfooter・docs-sbは商品重複から除外する', () => {
  const top = note('a', 'article-top');
  const tiles = note('a', 'article-footer', 'seasonal-footer') + note('a', 'article-sidebar', 'seasonal-docs-sb');
  assert.deepEqual(rules(article('<h2>本文</h2>', top, tiles)), []);
  assert.ok(rules(article(`<h2>本文</h2>${note('a', 'article-body', 'fake-footer')}`, top)).includes('note-product-dup'));
});

test('理由つき許可リストは指定したページ・ルール・面だけを除外する', () => {
  assert.ok(PAGE_ALLOWLIST.every(e => e.reason));
  assert.ok(Object.values(SURFACE_ALLOWLIST).every(Boolean));
  const listing = article(`<h2>本文</h2>${['a', 'b', 'c', 'd'].map(id => note(id)).join('')}`);
  for (const entry of PAGE_ALLOWLIST.filter(e => e.rules.includes('note-non-footer') && e.page)) {
    assert.deepEqual(inspectHtml(listing, entry.page).violations, []);
    const dup = listing.replace('</article>', `${note('a', 'article-end')}</article>`);
    assert.ok(inspectHtml(dup, entry.page).violations.some(v => v.rule === 'note-product-dup'));
    assert.ok(inspectHtml(listing, `${entry.page}-other`).violations.length);
  }
  const many = Array.from({length:31}, (_,i) => note(`p${i}`)).join('');
  assert.deepEqual(inspectHtml(many, 'links').violations, []);
  assert.equal(inspectHtml(many, 'links-other').violations.length, 1);
  const standards = article('<h2>本文</h2>', '', `<aside>${affiliate('standards-sidebar')}${affiliate('standards-footer')}</aside>`);
  const r = inspectHtml(standards, 'standards/kinki/common');
  assert.deepEqual(r.violations, []);
  assert.ok(r.exclusions.every(e => e.reason));
  assert.ok(inspect(standards).violations.length);
  // 広告の総数の上限は廃止（2026-11-15）。基準書のスマホ 5 枠（本文中 3＋本文末 1＋追加 1）でも総数では落ちない
  const standardsFive = article(`<h2>本文</h2>${['standards-inline','standards-inline-2','standards-inline-3','standards-end','standards-rail'].map(p => affiliate(p)).join('<p>本文</p>')}`);
  assert.deepEqual(inspectHtml(standardsFive, 'standards/tohoku/reference/chapters/2-1').violations, []);
  assert.deepEqual(rules(standardsFive), ['affiliate-forbidden-surface']);
  for (const placement of Object.keys(SURFACE_ALLOWLIST)) {
    assert.deepEqual(rules(article('<h2>本文</h2>', '', affiliate(placement) + affiliate(placement))), []);
  }
});

const imageAd = (slot, kind) => `<div data-article-affiliate="${kind}">${affiliate(slot)}</div>`;
test('画像面は数で制限せずDOM位置・重複を検査し、noteの違反を免除しない', () => {
 const body = [1,2,3].map(n=>imageAd(n===1?'article-banner':`article-banner-${n}`,'inline')).join('<p>学習本文</p>');
 const rail = `<aside class="hidden zenn-desktop:block"><div data-article-sidebar-cards="6">${Array.from({length:6},(_,i)=>`${imageAd(i?`article-rail-${i+1}`:'article-rail','rail')}<div data-article-sidebar-card>ナビ</div>`).join('')}</div></aside>`;
 const html = `<div>${article(`<h2>本文</h2><p>学習本文</p>${body}`,'',imageAd('article-banner-end','end'))}${rail}</div>`;
 assert.deepEqual(rules(html),[]);
 assert.ok(rules(html.replace('</article>',`${imageAd('article-banner-end','end')}</article>`)).includes('affiliate-image-position'));
 assert.ok(rules(html.replace('</article>',`${note('a')}${note('b')}${note('c')}${note('d')}</article>`)).includes('note-non-footer'));
 assert.deepEqual(rules(article(`${body}<p>本文</p>${imageAd('article-banner-3','inline')}`)), ['affiliate-image-duplicate', 'affiliate-image-duplicate']);
 assert.deepEqual(rules(article(body,'',imageAd('article-banner-end','end').repeat(2))), ['affiliate-image-duplicate', 'affiliate-image-duplicate']);
 const extraRail = html.replace('</aside>', imageAd('article-rail-6','rail') + '</aside>');
 assert.deepEqual(rules(extraRail), ['affiliate-image-duplicate']);
 assert.ok(rules(article('<details>' + body + '</details>')).includes('affiliate-image-position'));
 assert.ok(rules(article('<h2>本文</h2>', body)).includes('affiliate-image-position'));
 assert.ok(rules(html.replace('<aside ', '<section ').replace('</aside>', '</section>')).includes('affiliate-image-position'));
 assert.ok(rules(html.replace('class="hidden zenn-desktop:block"','')).includes('affiliate-image-position'));
 assert.ok(rules(html.replace('data-article-sidebar-card>', 'data-not-card>')).includes('affiliate-rail-adjacent'));
 // 右の欄で同じ案件（同じリンク先）を 2 回出さない。案件が尽きて枠がカード数より少ないのは違反にしない
 const railWith = (hrefs) => `<div>${article(`<h2>本文</h2><p>学習本文</p>${body}`,'',imageAd('article-banner-end','end'))}<aside class="hidden zenn-desktop:block"><div data-article-sidebar-cards="3">${hrefs.map((h,i)=>`<div data-article-affiliate="rail">${affiliate(i?`article-rail-${i+1}`:'article-rail',`href="${h}"`)}</div><div data-article-sidebar-card>ナビ</div>`).join('')}<div data-article-sidebar-card>ナビ</div></div></aside></div>`;
 assert.deepEqual(rules(railWith(['https://a.example/1','https://a.example/2'])), []);
 assert.ok(rules(railWith(['https://a.example/1','https://a.example/1'])).includes('affiliate-rail-duplicate'));
 assert.ok(rules(article(imageAd('article-banner','inline')+imageAd('article-banner-2','inline'))).includes('affiliate-image-adjacent'));
});

test('同案件の異なる素材でもピクセル二重送信を検出する',()=>{
 const pixels=['mat1','mat2'].map(mat=>`<img data-article-pixel-program="buildjob" src="https://example.com/${mat}" width="1" height="1">`).join('');
 assert.ok(rules(article('<h2>本文</h2>','',pixels)).includes('affiliate-program-pixel-dup'));
});


test('下に続く組でもバナー直後の実カードと案件重複を検査し、明示した広告単独だけ許す', () => {
 const wrap = groups => `<main><article><div class="prose-blog"><h2>本文</h2></div></article></main><aside class="hidden zenn-desktop:flex"><div data-article-sidebar-cards="2"><div>${imageAd('article-rail','rail')}<div data-article-sidebar-card>上のナビ</div></div><div data-article-sidebar-continuation>${groups}</div></div></aside>`;
 const group = `<div data-article-sidebar-group>${imageAd('article-rail-2','rail')}<div data-article-sidebar-card>関連記事</div></div>`;
 assert.deepEqual(rules(wrap(group)), []);
 assert.ok(rules(wrap(group.replace('data-article-sidebar-card', 'data-not-card'))).includes('affiliate-rail-adjacent'));
 const adOnly = `<div data-article-sidebar-group data-article-sidebar-ad-only="true">${imageAd('article-rail-2','rail')}</div>`;
 assert.deepEqual(rules(wrap(adOnly)), []);
 assert.ok(rules(wrap(adOnly.replace('data-article-sidebar-ad-only="true"', ''))).includes('affiliate-rail-adjacent'));
 assert.ok(rules(wrap(adOnly.replace(/<\/div>$/, '<p>空のカードではない</p></div>'))).includes('affiliate-rail-adjacent'));
 // RailStack の形（1 つ 1 つを data-rail-kind の div で包む）でも、包みを 1 単位として同じ決まりを当てる
 const kind = (k, inner, card) => `<div data-rail-kind="${k}"${card ? ' data-article-sidebar-card' : ''}>${inner}</div>`;
 const stacked = groups => `<main><article><div class="prose-blog"><h2>本文</h2></div></article></main><aside class="hidden zenn-desktop:flex"><div data-article-sidebar-cards="2"><div data-rail-stack>${kind('career', imageAd('article-rail','rail'))}${kind('nav','上のナビ',true)}</div><div data-article-sidebar-continuation>${groups}</div></div></aside>`;
 const wrapped = `<div data-article-sidebar-group>${kind('career', imageAd('article-rail-2','rail'))}${kind('thumbs','関連記事',true)}</div>`;
 assert.deepEqual(rules(stacked(wrapped)), []);
 assert.ok(rules(stacked(wrapped.replace('data-rail-kind="thumbs" data-article-sidebar-card', 'data-rail-kind="thumbs"'))).includes('affiliate-rail-adjacent'));
 assert.ok(rules(stacked(wrapped).replace(' data-article-sidebar-card>上のナビ', '>上のナビ')).includes('affiliate-rail-adjacent'));
 assert.deepEqual(rules(stacked(`<div data-article-sidebar-group data-article-sidebar-ad-only="true">${kind('career', imageAd('article-rail-2','rail'))}</div>`)), []);
});

test('過去問の右の欄だけ、組の間を埋める article-rail-fill の同じ案件の繰り返しと、バナーだけの組を許す', () => {
 const fill = href => `<div data-article-sidebar-group data-article-sidebar-fill="true"><div data-article-affiliate="rail">${affiliate('article-rail-fill', `href="${href}"`)}</div></div>`;
 const wrap = (groups, questionSeries) => `<main><article><div class="prose-blog"><h2>本文</h2></div></article></main><aside class="hidden zenn-desktop:block"><div data-article-sidebar-cards="2"${questionSeries ? ' data-article-question-series="true"' : ''}><div data-article-affiliate="rail">${affiliate('article-rail', 'href="https://a.example/1"')}</div><div data-article-sidebar-card>上のナビ</div><div data-article-sidebar-continuation>${groups}</div></div></aside>`;
 const groups = fill('https://a.example/1') + fill('https://a.example/1') + fill('https://a.example/2');
 // 上の束の案件と同じリンク先・fill 同士の同じリンク先・面の重複・バナーだけの組は、過去問なら違反にならない
 assert.deepEqual(rules(wrap(groups, true)), []);
 // ほかの記事では規則を変えない: 同じリンク先の重複・面の重複・バナー直後の実カード
 const others = rules(wrap(groups, false));
 assert.ok(others.includes('affiliate-rail-duplicate'));
 assert.ok(others.includes('affiliate-image-duplicate'));
 assert.ok(others.includes('affiliate-rail-adjacent'));
 // 過去問でも、上の束・回遊の組のバナー同士の重複は違反のまま
 const dup = `<div data-article-sidebar-group><div data-article-affiliate="rail">${affiliate('article-rail-2', 'href="https://a.example/1"')}</div><div data-article-sidebar-card>関連記事</div></div>`;
 assert.ok(rules(wrap(dup, true)).includes('affiliate-rail-duplicate'));
 // 過去問でも、回遊の組のバナー直後は実カード
 const noCard = `<div data-article-sidebar-group><div data-article-affiliate="rail">${affiliate('article-rail-2', 'href="https://a.example/2"')}</div></div>`;
 assert.ok(rules(wrap(noCard, true)).includes('affiliate-rail-adjacent'));
});

test('インフィード広告: 1 ページ 3 枠まで・前後が一覧の項目でなければ違反', async () => {
  const { inspectHtml } = await import('../scripts/check-cta-density.mjs');
  const row = (i) => `<li><a href="/exam/x/${i}">記事${i}</a></li>`;
  const ad = '<li data-adsense="inFeedThumb"><ins class="adsbygoogle"></ins></li>';
  const ok = `<html><body><main><ul>${row(1)}${ad}${row(2)}</ul></main></body></html>`;
  assert.deepEqual(inspectHtml(ok, 'exam/civil-construction-1').violations.filter(v => v.rule.startsWith('feed-ad')), []);
  const edge = `<html><body><main><ul>${ad}${row(1)}</ul></main></body></html>`;
  assert.deepEqual(inspectHtml(edge, 'exam/civil-construction-1').violations.map(v => v.rule), ['feed-ad-adjacent'], '先頭は違反');
  const near = `<html><body><main><ul>${row(1)}${ad}<li><a data-cta="note" href="https://note.com/x">note</a></li></ul></main></body></html>`;
  assert.deepEqual(inspectHtml(near, 'exam/civil-construction-1').violations.map(v => v.rule), ['feed-ad-adjacent'], 'note の導線の隣は違反');
  const many = `<html><body><main><ul>${[1, 2, 3, 4, 5].map(i => row(i) + ad).join('')}${row(9)}</ul></main></body></html>`;
  assert.ok(inspectHtml(many, 'exam/civil-construction-1').violations.some(v => v.rule === 'feed-ad-total'), '4 枠以上は違反');
});
