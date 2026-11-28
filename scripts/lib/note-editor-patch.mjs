/**
 * note-editor-patch.mjs — note のエディタで本文を消さずに、指定した箇所だけを書き換える部品。
 *
 * なぜ要るか: note-update-body は本文を全部消して貼り直すので、原稿に無い PDF 添付のカードも一緒に消える。
 * 貼り直し（--reattach-pdf）が失敗すると購入者が PDF を受け取れない（約束した添付が無い記事 63 本・2026-11-28 時点）。
 * 見出しの言い換えのような小さな修正は、変える箇所だけ書き換え、添付・画像・リンクカード・境界には触らない。
 *
 * 操作（ops）:
 *   { op: 'replace', from, to, count }       … 本文の段落・見出しの中の from を to に置き換える。count はエディタにあるべき from の数
 *   { op: 'insert-after', heading, text, headings, count } … 文字が heading と一致する見出し（エディタに headings 件あるはず）のうち、
 *                                     上から count 件の直後に段落 text を足す（ふつうは最初の 1 件だけ）
 * 判定（純関数）は planProblems / verifyProblems / invariantProblems。ブラウザの操作は readBlocks / snapshotEditor / applyOps。
 * 罠: from が太字などで複数のテキストノードにまたがると置き換えられない（applyOps が見つけられず false を返す＝保存しない）。
 */
import { sleep } from './sleep.mjs';
import { stripTags } from './strip-markup.mjs';

const BLOCK_SELECTOR = 'p, li, h2, h3, h4, blockquote';
const HEADING_TAGS = new Set(['H2', 'H3', 'H4']);

/** 文字列中の needle の出現数（重ならない数え方）。 */
export function countIn(text, needle) {
  if (!needle) return 0;
  let n = 0;
  for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + needle.length)) n++;
  return n;
}

const total = (blocks, needle) => blocks.reduce((s, b) => s + countIn(b.text, needle), 0);
const headingsEqual = (blocks, heading) => blocks.filter((b) => HEADING_TAGS.has(b.tag) && b.text.trim() === heading);
const insertedAfter = (blocks, heading, text) =>
  blocks.filter((b, i) => HEADING_TAGS.has(b.tag) && b.text.trim() === heading && blocks[i + 1]?.text.trim() === text).length;

/**
 * 置き換えの前提（書き換える前のエディタの段落の並び blocks に対して）。問題の一覧を返す（空なら進めてよい）。
 * 操作は上から順に当てるので、各操作の数は「それより前の置き換えを当てた後」で数える（原稿側も同じ数え方で count を書く）。
 */
export function planProblems(ops, blocks) {
  const problems = [];
  let cur = blocks.map((b) => ({ ...b }));
  for (const o of ops) {
    if (o.op === 'replace') {
      if (!o.from || o.to == null) { problems.push('replace に from / to が無い'); continue; }
      if (o.to.includes(o.from)) { problems.push(`置き換え後の文に元の文が含まれる（「${o.from}」）`); continue; }
      const n = total(cur, o.from);
      if (n !== o.count) problems.push(`「${o.from}」がエディタに ${n} 件（原稿の旧版では ${o.count} 件）`);
      cur = cur.map((b) => ({ ...b, text: b.text.split(o.from).join(o.to) }));
    } else if (o.op === 'insert-after') {
      const n = headingsEqual(cur, o.heading).length;
      if (n !== o.headings) problems.push(`見出し「${o.heading}」が ${n} 件（原稿では ${o.headings} 件）`);
      if (!(o.count >= 1 && o.count <= n)) problems.push(`前置きの数 ${o.count} が見出しの数 ${n} に合わない`);
      if (total(cur, o.text)) problems.push(`前置き「${o.text.slice(0, 20)}…」がすでに本文にある`);
    } else problems.push(`知らない操作: ${o.op}`);
  }
  return problems;
}

/** すでに当て終わっているか（同じ記事を 2 回流したとき、書き換えずに飛ばす）。 */
export function alreadyApplied(ops, blocks) {
  return ops.every((o) => (o.op === 'replace'
    ? total(blocks, o.from) === 0 && total(blocks, o.to) >= o.count
    : insertedAfter(blocks, o.heading, o.text) === o.count));
}

/** 書き換えた後の確認。問題の一覧を返す。 */
export function verifyProblems(ops, blocks) {
  const problems = [];
  for (const o of ops) {
    if (o.op === 'replace') {
      const left = total(blocks, o.from);
      if (left) problems.push(`「${o.from}」が ${left} 件残っている`);
      if (total(blocks, o.to) < o.count) problems.push(`「${o.to}」が ${total(blocks, o.to)} 件（${o.count} 件のはず）`);
    } else if (o.op === 'insert-after') {
      const n = insertedAfter(blocks, o.heading, o.text);
      if (n !== o.count) problems.push(`見出し「${o.heading}」の直後の前置きが ${n} 件（${o.count} 件のはず）`);
    }
  }
  return problems;
}

/** 書き換えの前後で変わってはいけないもの（添付・画像・埋め込み）の比較。 */
export function invariantProblems(before, after) {
  const problems = [];
  const a = [...before.attachments].sort().join('|');
  const b = [...after.attachments].sort().join('|');
  if (a !== b) problems.push(`PDF 添付が変わった（前 ${before.attachments.length} 件 → 後 ${after.attachments.length} 件）`);
  if (before.images !== after.images) problems.push(`画像の数が変わった（${before.images} → ${after.images}）`);
  if (before.embeds !== after.embeds) problems.push(`埋め込み（リンクカード・添付・目次）の数が変わった（${before.embeds} → ${after.embeds}）`);
  return problems;
}

/** 公開本文（HTML）の中の数（添付・画像・埋め込み）。著者として読んだ API の body に使う。 */
export function htmlCounts(html) {
  const c = (re) => (html.match(re) || []).length;
  return { pdf: c(/\.pdf/gi), img: c(/<img\b/g), figure: c(/<figure\b/g) };
}

/** 公開本文（HTML）で、置き換えが当たっているか。問題の一覧を返す。 */
export function liveHtmlProblems(ops, html) {
  const text = stripTags(html);
  const problems = [];
  for (const o of ops) {
    if (o.op === 'replace') {
      if (countIn(text, o.from)) problems.push(`公開本文に「${o.from}」が残っている`);
      if (countIn(text, o.to) < o.count) problems.push(`公開本文の「${o.to}」が ${countIn(text, o.to)} 件（${o.count} 件のはず）`);
    } else if (o.op === 'insert-after' && countIn(text, o.text) < o.count) problems.push('公開本文に前置きが無い');
  }
  return problems;
}

/** エディタの段落・見出しを上から順に。埋め込み（figure・リンクカード）の中は除く。 */
export async function readBlocks(page) {
  return page.evaluate((sel) => {
    const ed = document.querySelector('[contenteditable=true]');
    if (!ed) return [];
    return [...ed.querySelectorAll(sel)]
      .filter((el) => !el.closest('figure, [embedded-service]') && !el.parentElement.closest('li, blockquote'))
      .map((el) => ({ tag: el.tagName, text: el.innerText || '' }));
  }, BLOCK_SELECTOR);
}

/** 変わってはいけないものの数。 */
export async function snapshotEditor(page) {
  return page.evaluate(() => {
    const ed = document.querySelector('[contenteditable=true]');
    const text = ed?.innerText || '';
    return {
      attachments: (text.match(/\S+\.pdf/gi) || []).filter((n) => !/https?:\/\//i.test(n)),
      images: ed ? ed.querySelectorAll('img').length : 0,
      embeds: ed ? ed.querySelectorAll('figure, [embedded-service], [data-name]').length : 0,
    };
  });
}

/** from の最初の出現を選択する（1 つのテキストノードの中にあるものだけ）。見つかれば true。 */
async function selectFirst(page, from) {
  return page.evaluate(({ from, sel }) => {
    const ed = document.querySelector('[contenteditable=true]');
    if (!ed) return false;
    for (const block of ed.querySelectorAll(sel)) {
      if (block.closest('figure, [embedded-service]')) continue;
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const i = n.data.indexOf(from);
        if (i < 0) continue;
        block.scrollIntoView({ block: 'center' });
        const r = document.createRange();
        r.setStart(n, i); r.setEnd(n, i + from.length);
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        return true;
      }
    }
    return false;
  }, { from, sel: BLOCK_SELECTOR });
}

/** 見出しの直後にまだ前置きが無いものを 1 つ選び、末尾へカーソルを置く。置けたら true。 */
async function caretAfterHeading(page, heading, text) {
  return page.evaluate(({ heading, text }) => {
    const ed = document.querySelector('[contenteditable=true]');
    if (!ed) return false;
    for (const h of ed.querySelectorAll('h2, h3, h4')) {
      if ((h.innerText || '').trim() !== heading) continue;
      if ((h.nextElementSibling?.innerText || '').trim() === text) continue;
      h.scrollIntoView({ block: 'center' });
      const r = document.createRange();
      r.selectNodeContents(h); r.collapse(false);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      return true;
    }
    return false;
  }, { heading, text });
}

/**
 * 操作を順に当てる。途中で見つからなければ { ok: false, reason } を返す（呼び出し側は保存しない）。
 * 置き換えは選択してから文字を打つ（エディタの内部状態を通すため。DOM を直接書き換えない）。
 */
export async function applyOps(page, ops, { tag = '[patch]' } = {}) {
  for (const o of ops) {
    if (o.op === 'replace') {
      for (let k = 0; k < o.count; k++) {
        if (!(await selectFirst(page, o.from))) return { ok: false, reason: `「${o.from}」の ${k + 1} 件目を選択できない（太字などをまたいでいる）` };
        await sleep(250);
        await page.keyboard.insertText(o.to);
        await sleep(350);
      }
      console.log(`${tag} 置き換え ${o.count} 件: 「${o.from}」→「${o.to}」`);
    } else if (o.op === 'insert-after') {
      for (let k = 0; k < o.count; k++) {
        if (!(await caretAfterHeading(page, o.heading, o.text))) return { ok: false, reason: `見出し「${o.heading}」の ${k + 1} 件目にカーソルを置けない` };
        await sleep(250);
        await page.keyboard.press('Enter');
        await sleep(400);
        await page.keyboard.insertText(o.text);
        await sleep(350);
      }
      console.log(`${tag} 前置き ${o.count} 件: 見出し「${o.heading}」の直後`);
    }
  }
  return { ok: true };
}
