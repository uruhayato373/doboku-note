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

  if (fields.title !== undefined) log.push(await fillIfPresent(page, '#ServiceOverview', fields.title, { tag, label: 'title' }));
  if (fields.catchphrase !== undefined) log.push(await fillIfPresent(page, '#ServiceCatchphrase', fields.catchphrase, { tag, label: 'catchphrase' }));

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
 * 送信。commit=false → 「下書きで保存」、commit=true → 「公開する」。
 * ボタンはともに button.submitButton[type=submit]。テキストで判別する。
 * @returns {Promise<{ok:boolean, action:string, url:string, reason?:string}>}
 */
export async function submitForm(page, { commit = false, tag = '[form]' } = {}) {
  const name = commit ? '公開する' : '下書きで保存';
  const btn = page.getByRole('button', { name, exact: true });
  if (!(await btn.count())) {
    return { ok: false, action: name, url: page.url(), reason: `送信ボタン「${name}」未検出` };
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
