/**
 * coconala-form.mjs — サービス内容編集フォーム（/mypage/services/{id}）の充填ロジック
 * ---------------------------------------------------------------------------
 * publish（新規）/ edit（既存）の両方が使う。フォームは server-rendered（CakePHP 型
 * name=data[Service][...]・id=#Service*）で selector が安定。2026-07-18 実機確定。
 *
 * フィールド対応（実機ディスカバリ）:
 *   #ServiceOverview          サービスタイトル（text・max255）        ← catalog.title
 *   #ServiceCatchphrase       キャッチコピー（text・max255）          ← listings.catchphrase
 *   #ServiceCategory          大カテゴリ（select・value）             ← listings.category.master
 *   #ServiceSubCategory       サブカテゴリ（select・value・cascading） ← listings.category.sub
 *   #ServiceMasterCategoryTypeId カテゴリタイプ（select・任意）        ← listings.category.type
 *   provision_format radio    提供形式（1=テキスト完結/2=制作物/3=PDF）← listings.provisionFormat
 *   #ServiceHead              サービス内容 本文（textarea・max1000）   ← listings.body
 *   #ServiceBody              購入にあたってのお願い（textarea・max500）← listings.purchaseNote
 *   #ServicePrice             価格（select・option text "N,NNN円"）    ← catalog.priceYen
 *   #ServiceDeliveryTime      お届け日数（text・max2）                ← listings.deliveryDays
 * 送信ボタン: 「下書きで保存」/「公開する」（ともに button.submitButton[type=submit]）
 * ---------------------------------------------------------------------------
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 促進モーダル（c-serviceDialog / tw-z-modal）が被さっていたら閉じる */
export async function dismissModal(page) {
  for (let i = 0; i < 3; i++) {
    const hasModal = await page.evaluate(() => !!document.querySelector('[class*="serviceDialog"], .tw-z-modal'));
    if (!hasModal) return;
    const close = page.getByRole('button', { name: '閉じる' });
    if (await close.count()) { try { await close.first().click({ timeout: 4000 }); } catch {} }
    await sleep(500);
    await page.keyboard.press('Escape'); await sleep(500);
  }
}

// ココナラの検証は jQuery で keyup/change/blur を監視する。Playwright の fill() は input しか
// 発火せず chkrequired の内部状態が更新されない（＝値は見えるのに「記入エラー」で保存拒否）。
// fill 後に keyup/change/blur を明示 dispatch して検証状態を確定させる。
async function fireValidation(page, sel) {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return;
    el.focus();
    for (const t of ['input', 'keyup', 'change', 'blur']) el.dispatchEvent(new Event(t, { bubbles: true }));
  }, sel);
}

async function fillIfPresent(page, sel, value, { tag, label }) {
  if (value == null || value === '') return `${label}: (空・skip)`;
  const el = page.locator(sel).first();
  if (!(await el.count())) return `${label}: selector 不在(${sel})`;
  await el.click();
  await el.fill(String(value));
  await fireValidation(page, sel);
  return `${label}: set (${String(value).length}字)`;
}

/**
 * フォームを充填する。fields のうち渡されたものだけ埋める（edit の部分更新に対応）。
 * @returns {Promise<{log:string[], warnings:string[]}>}
 */
export async function fillServiceForm(page, fields, { tag = '[form]' } = {}) {
  const log = [];
  const warn = [];
  await dismissModal(page);

  // タイトル: ココナラのサービスタイトル欄は末尾「ます」が固定サフィックスで自動付与される
  // （「※『ます』は必須のため削除できません」）。カタログの「〜します」をそのまま入れると
  // 公開表示が「〜しますます」と二重になるため、末尾の「ます」を1つ剥がして入れる。
  if (fields.title !== undefined) {
    const titleForForm = String(fields.title).replace(/ます$/, '');
    log.push(await fillIfPresent(page, '#ServiceOverview', titleForForm, { tag, label: 'title(末尾ます剥がし)' }));
  }
  if (fields.catchphrase !== undefined) {
    const clen = [...String(fields.catchphrase || '')].length;
    if (fields.catchphrase && (clen < 15 || clen > 30)) warn.push(`catchphrase が15〜30字の範囲外（${clen}字）＝公開時に記入エラーになる`);
    log.push(await fillIfPresent(page, '#ServiceCatchphrase', fields.catchphrase, { tag, label: 'catchphrase' }));
  }

  // カテゴリ（cascading）: master → sub → type
  if (fields.category) {
    const { master, sub, type } = fields.category;
    try {
      if (master) { await page.selectOption('#ServiceCategory', String(master)); await fireValidation(page, '#ServiceCategory'); await sleep(2500); log.push(`category.master=${master}`); }
      if (sub) { await page.selectOption('#ServiceSubCategory', String(sub)); await fireValidation(page, '#ServiceSubCategory'); await sleep(2000); log.push(`category.sub=${sub}`); }
      if (type) {
        const hasType = await page.evaluate(() => {
          const el = document.querySelector('#ServiceMasterCategoryTypeId');
          return el ? Array.from(el.options).some((o) => o.value) : false;
        });
        if (hasType) { await page.selectOption('#ServiceMasterCategoryTypeId', String(type)); await fireValidation(page, '#ServiceMasterCategoryTypeId'); await sleep(1200); log.push(`category.type=${type}`); }
        else warn.push('category.type の選択肢が populate されていない（sub 選択後の AJAX 待ち不足？）');
      }
    } catch (e) { warn.push(`category select 失敗: ${e.message.split('\n')[0]}`); }
  }

  // ジャンル（facet チェックボックス・※必須）: data[facets][NN][] の value を1つ以上チェック
  if (fields.genreFacets && fields.genreFacets.length) {
    const checked = await page.evaluate((vals) => {
      const boxes = Array.from(document.querySelectorAll('input[type=checkbox][name^="data[facets]"]'));
      let n = 0;
      for (const b of boxes) {
        if (vals.map(String).includes(String(b.value))) {
          if (!b.checked) {
            const lbl = b.closest('label') || document.querySelector(`label[for="${b.id}"]`);
            (lbl || b).click();
            if (!b.checked) { b.checked = true; }
          }
          for (const t of ['input', 'change', 'blur']) b.dispatchEvent(new Event(t, { bubbles: true }));
          n++;
        }
      }
      return n;
    }, fields.genreFacets);
    log.push(`genreFacets: ${checked}/${fields.genreFacets.length} チェック`);
    if (!checked) warn.push('ジャンル facet の該当 value が見つからない（categoryType 依存で option が変わる）');
    await sleep(500);
  }

  // 提供形式ラジオ
  if (fields.provisionFormat) {
    const ok = await page.evaluate((v) => {
      const r = document.querySelector(`#ServiceProvisionFormat${v}`) ||
        document.querySelector(`input[name="data[Service][provision_format]"][value="${v}"]`);
      if (!r) return false;
      const lbl = r.closest('label') || document.querySelector(`label[for="${r.id}"]`);
      (lbl || r).click();
      if (!r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
      return true;
    }, fields.provisionFormat);
    log.push(ok ? `provisionFormat=${fields.provisionFormat}` : `provisionFormat 未検出`);
    if (!ok) warn.push('provision_format radio 未検出');
    await sleep(600);
  }

  if (fields.body !== undefined) {
    if (fields.body && [...String(fields.body)].length > 1000) warn.push(`body が1000字超（${[...String(fields.body)].length}）→ 末尾が切れる可能性`);
    log.push(await fillIfPresent(page, '#ServiceHead', fields.body, { tag, label: 'body(内容)' }));
  }
  if (fields.purchaseNote !== undefined) {
    if (fields.purchaseNote && [...String(fields.purchaseNote)].length > 500) warn.push(`purchaseNote が500字超（${[...String(fields.purchaseNote)].length}）`);
    log.push(await fillIfPresent(page, '#ServiceBody', fields.purchaseNote, { tag, label: 'お願い' }));
  }

  // 価格 select（option の表示テキスト "N,NNN円" で一致）
  if (fields.priceYen) {
    const priceText = `${Number(fields.priceYen).toLocaleString('en-US')}円`;
    try {
      await page.selectOption('#ServicePrice', { label: priceText });
      await fireValidation(page, '#ServicePrice');
      const got = await page.evaluate(() => {
        const el = document.querySelector('#ServicePrice');
        return el ? (el.options[el.selectedIndex]?.textContent || '').trim() : '';
      });
      log.push(`price: "${priceText}" → selected "${got}"`);
      if (got !== priceText) warn.push(`価格 option 不一致（期待 "${priceText}" / 実 "${got}"）`);
    } catch (e) { warn.push(`価格 select 失敗（"${priceText}" が選択肢に無い？）: ${e.message.split('\n')[0]}`); }
  }

  if (fields.deliveryDays !== undefined) log.push(await fillIfPresent(page, '#ServiceDeliveryTime', fields.deliveryDays, { tag, label: '納期(日)' }));

  return { log, warnings: warn };
}

/**
 * 商品画像をアップロードする（トリミングモーダルなし＝直接スロットに入る・2026-07-18 実機確定）。
 * 「画像を追加」リンク（javascript:;）をクリックすると隠し file input が出現するので setInputFiles。
 * @param {object} opts.force 既に画像がある場合も追加する（既定は skip）
 * @returns {Promise<{ok:boolean, added:boolean, before:number, after:number, reason?:string}>}
 */
export async function uploadImage(page, imgPath, { tag = '[img]', force = false } = {}) {
  await dismissModal(page);
  // アップロード済み画像枚数。プレビューは <img> でなく、populated スロットに
  // 削除× `a.js_delete-button`（.delete-button）が付く（2026-07-18 実機確定）。これを数える。
  const countImgs = () => page.evaluate(() => document.querySelectorAll('a.js_delete-button, .delete-button').length);
  const before = await countImgs();
  if (before > 0 && !force) {
    return { ok: true, added: false, before, after: before, reason: `既に画像 ${before} 枚あり（追加は --force-image）` };
  }
  const addLink = page.getByText('画像を追加', { exact: false });
  if (!(await addLink.count())) return { ok: false, added: false, before, after: before, reason: '「画像を追加」未検出' };
  await addLink.first().click().catch(() => {});
  await sleep(1200);
  const input = page.locator('input[type=file][accept*="image"]').first();
  if (!(await input.count())) return { ok: false, added: false, before, after: before, reason: 'file input が出現しない' };
  await input.setInputFiles(imgPath);
  // アップロード（AJAX）完了待ち: 画像枚数が増えるまで poll
  let after = before;
  for (let i = 0; i < 12; i++) { await sleep(1500); after = await countImgs(); if (after > before) break; }
  return { ok: after > before, added: after > before, before, after, reason: after > before ? undefined : 'アップロード後も画像枚数が増えない' };
}

/**
 * 商品画像を「差し替える」（既存スロットを上書き）。2026-08-05 新設。
 *
 * 実機構造（2026-08-05 確定）: populated スロットは
 *   div.js_thumbnail-wrapper.-image-exists > div.thumbnail.js_image-thumbnail[data-id][style=background-image:url(...)]
 *     ├ a.delete-button.js_delete-button   ← **width/height が 0（hover 依存）でクリックできない**
 *     └ input[type=file][name="data[UploadedFile][{id}][image_files]"][data-service-image-id]
 * つまり **各スロットが自分の file input を持つ**ので、削除せずそこへ setInputFiles すれば
 * その場で差し替わる。削除ボタンを押す方式は 0×0 要素のため機能しない（初回実装の失敗）。
 *
 * 検証は「background-image の URL が変わったか」で行う（枚数は変わらないので数では測れない）。
 * @returns {Promise<{ok:boolean, before:number, after:number, changed:boolean, reason?:string}>}
 */
export async function replaceImage(page, imgPath, { tag = '[img]' } = {}) {
  await dismissModal(page);
  const slots = () => page.evaluate(() =>
    [...document.querySelectorAll('.js_thumbnail-wrapper.-image-exists .thumbnail.js_image-thumbnail')]
      .map((d) => ({ id: d.getAttribute('data-id'), bg: d.getAttribute('style') || '' }))
  );
  const before = await slots();
  if (before.length === 0) {
    // まだ画像が無いなら通常アップロードと同義
    const up = await uploadImage(page, imgPath, { tag, force: true });
    return { ok: up.ok, before: 0, after: up.after, changed: up.added, reason: up.reason };
  }

  // 既存スロットを削除 → 新規アップロード。
  // 削除ボタンは 0×0（hover 依存）で通常クリックできないため dispatchEvent で発火させる
  // （Playwright の actionability チェックを迂回する。2026-08-05 実機で確定）。
  for (let i = 0; i < before.length + 2; i++) {
    const del = page.locator('a.js_delete-button');
    if ((await del.count()) === 0) break;
    await del.first().dispatchEvent('click').catch(() => {});
    await sleep(1500);
    for (const label of ['OK', 'はい', '削除する']) {
      const b = page.getByRole('button', { name: label, exact: true }).filter({ visible: true });
      if ((await b.count()) > 0) { await b.first().click({ timeout: 5000 }).catch(() => {}); await sleep(1500); break; }
    }
    if ((await slots()).length === 0) break;
  }
  const remaining = await slots();
  if (remaining.length > 0) {
    return { ok: false, before: before.length, after: remaining.length, changed: false, reason: `既存画像を削除しきれない（残り ${remaining.length} 枚）` };
  }

  const up = await uploadImage(page, imgPath, { tag, force: true });
  return {
    ok: up.ok,
    before: before.length,
    after: up.after,
    changed: up.added,
    reason: up.reason,
  };
}

/**
 * 送信。commit=false → 「下書きで保存」、commit=true → 「公開する」。
 * ボタンはともに button.submitButton[type=submit]。テキストで判別する。
 * @returns {Promise<{ok:boolean, action:string, url:string, reason?:string}>}
 */
export async function submitForm(page, { commit = false, tag = '[form]' } = {}) {
  // 新規下書き→公開は「公開する」、既に公開中サービスの更新は「更新する/サービスを更新」。
  const candidates = commit ? ['公開する', '更新する', 'サービスを更新', '変更を保存'] : ['下書きで保存'];
  let name = null, btn = null;
  for (const c of candidates) {
    const b = page.getByRole('button', { name: c, exact: true });
    if (await b.count()) { name = c; btn = b; break; }
  }
  if (!btn) {
    const allButtons = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
    return { ok: false, action: candidates[0], url: page.url(), reason: `送信ボタン未検出（候補: ${candidates.join('/')}）。画面上のbutton: ${JSON.stringify(allButtons.slice(0, 30))}` };
  }
  await btn.first().click();
  await sleep(4000);
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
  await sleep(1500);
  // バリデーションエラーの検出（chkrequired 未入力等）
  const err = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('.error, .errPos, [class*="errorText"], [class*="c-error"]'));
    return nodes.map((n) => (n.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6);
  });
  return { ok: err.length === 0, action: name, url: page.url(), errors: err };
}
