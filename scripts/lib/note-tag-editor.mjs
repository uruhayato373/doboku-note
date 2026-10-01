// note-tag-editor.mjs — note の公開設定画面でハッシュタグを外す・足す手順（保存はしない）と、ログイン済みでのタグ読み取り。
//
// note-sync-tags（タグだけの修復）と note-update-body（記事単位の更新）が共用する。
// 呼ぶのは「公開に進む」で設定画面に着いた直後。「更新する」は呼び出し側が押す。
import { isUnmeasurable } from './note-live-check.mjs';
import { tagChipPattern } from './note-tag-plan.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const tagsOfNote = (d) => (d?.hashtag_notes || []).map((h) => (h?.hashtag?.name || '').replace(/^#/, '')).filter(Boolean);

/** ログイン済みブラウザの API で記事を読む（著者本人には会員限定記事のタグ・カバーも返る）。 */
export async function readNoteAsAuthor(ctx, noteId) {
  try {
    const r = await ctx.request.get(`https://note.com/api/v3/notes/${noteId}`, { timeout: 30000 });
    if (!r.ok()) return null;
    const d = (await r.json())?.data;
    return d ? { tags: tagsOfNote(d), eyecatch: d.eyecatch || null, name: d.name ?? null, unmeasurable: isUnmeasurable(d) } : null;
  } catch { return null; }
}

/**
 * 公開設定画面でタグを外してから足す。
 * @param {import('playwright').Page} page
 * @param {{ add: string[], remove: string[] }} change
 * @returns {Promise<{ ok: boolean, committed: number, rejected: string[], reason?: string }>}
 */
export async function applyTagsOnSettings(page, { add, remove }) {
  const tagInput = page.locator('input[placeholder*="ハッシュタグ"]');
  if (!(await tagInput.count())) return { ok: false, committed: 0, rejected: [], reason: 'ハッシュタグ入力が無い' };
  const chipCount = () => page.evaluate(() => (document.body.innerText.match(/#[^\s#]+/g) || []).length);

  // 外す: 公開設定のタグ chip は <button>#タグ<span role="img" aria-label="削除"></button>（2026-09-23 実測）。
  // おすすめタグ等の同名ボタンと取り違えないよう「文字が #タグ と完全一致し、削除アイコンを持つ button」だけを対象にし、
  // 1 個に定まらなければ保存させない。
  if (remove.length) {
    const chipFor = (t) => page.locator('button').filter({ hasText: tagChipPattern(t) }).filter({ has: page.locator('[aria-label="削除"]') });
    const notRemoved = [];
    for (const t of remove) {
      const chip = chipFor(t);
      if ((await chip.count()) !== 1) { notRemoved.push(t); continue; }
      await chip.first().locator('[aria-label="削除"]').click();
      await sleep(300);
      if (await chipFor(t).count()) notRemoved.push(t);
    }
    console.log(`[tags] 削除=${remove.length - notRemoved.length}/${remove.length}`);
    if (notRemoved.length) return { ok: false, committed: 0, rejected: [], reason: `外せないタグ ${notRemoved.join(' ')}` };
  }

  // 足す: 「type→Enter で入力欄が空になる＝chip 化成功」。autocomplete が初回 Enter を飲むことがあるので
  // 未確定なら Escape→Enter を再試行し、それでも残れば入力をクリアして次のタグと連結させない（2026-07-23 実測）。
  const before = await chipCount();
  await tagInput.first().scrollIntoViewIfNeeded();
  await tagInput.first().click();
  await sleep(400);
  const inputVal = async () => (await tagInput.first().inputValue().catch(() => '')) || '';
  let committed = 0;
  const rejected = [];
  for (const t of add) {
    await tagInput.first().click();
    if ((await inputVal()).length) await tagInput.first().fill('');
    await tagInput.first().type(t);
    await sleep(260);
    await page.keyboard.press('Enter');
    await sleep(320);
    if ((await inputVal()).length) { await page.keyboard.press('Escape'); await sleep(150); await page.keyboard.press('Enter'); await sleep(300); }
    if ((await inputVal()).length) { await tagInput.first().fill(''); await sleep(120); rejected.push(t); } else committed++;
  }
  await sleep(800);
  const after = await chipCount();
  console.log(`[tags] 追加 確定=${committed}/${add.length}（chip ${before}→${after}）`);
  // 確定 0 かつ chip も増えない＝入力が一度も反映されていない。メンバーシップ記事は chip 数を拾えないことがあるので
  // これだけを中断条件にし、実体は保存後の API で確かめる。
  if (add.length && committed === 0 && after <= before) return { ok: false, committed, rejected, reason: 'タグが 1 つも確定できない' };
  return { ok: true, committed, rejected };
}
