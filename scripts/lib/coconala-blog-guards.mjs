/**
 * coconala-blog-guards.mjs — ココナラブログ記事の「出してはいけない」を機械で止める
 * ---------------------------------------------------------------------------
 * なぜ例外で止めるか（戻り値にしない）:
 *   ここで検出する違反は**アカウント制限**（外部誘導）と**購入者への虚偽**（価格不一致・
 *   死んだ導線）に直結する。戻り値だと呼び出し側が握り潰せてしまうので、
 *   `scripts/lib/asp-site-guard.mjs` と同じ流儀で **throw** にする。
 *   分類だけを返す関数（coconala-guards.mjs の selectTargets 等）とは意図的に流儀が違う。
 *
 * 何を止めるか（ハードゲート・ルーブリック平均で薄めない）:
 *   G1 外部リンク  — ブログ投稿エディタが「外部サービスのリンクを記載する行為」を禁止と明示
 *                   （coconala-operations.md §9.1）。note.com / doboku-note は**テキスト言及も**拒否
 *                   （URL でなくても検索誘導になり、規約の「外部誘導」に当たりうるため安全側）
 *   G2 外部連絡先  — メール / 電話 / LINE 等。同じ規約文が名指ししている
 *   G3 導線の実在  — funnel 先の serviceId がカタログに実在し、かつ **listed**
 *                   （paused/retired のページへ送ると購入できない導線を公開することになる）
 *   G4 価格の一致  — 本文に書いた金額はカタログ priceYen と一致（価格改定の取り残しで
 *                   「ブログには¥1,500、実際は¥2,000」が起きる）
 *   G5 タイトル    — 非空。長さ上限は **実機未計測**（TITLE_MAX=null）。
 *                   計測できていないことを黙って PASS にしない＝ assertTitle は
 *                   `{ lengthChecked:false }` を返し、呼び出し側がそれを表示する義務を負う
 *
 * ここに置くもの: 入力→判定のみ。ファイル読み書き・Playwright・console 出力は呼び出し側。
 * ---------------------------------------------------------------------------
 */

/**
 * ブログタイトルの最大長 = **45（運用上限・ポリシー由来）**。
 *
 * 2026-08-12 の実機プローブでは `input[placeholder="ブログタイトル"]` に **maxlength 属性が無く、
 * 200 字を投入しても切り詰められなかった**＝プラットフォーム上限は発見できなかった。
 * したがってこの値は「ココナラが拒否する長さ」ではなく、**一覧カードでの視認性から運用で決めた上限**
 * （coconala-blog-policy.md §5）。プラットフォーム側の実上限が判明しても、この値は
 * ポリシーが変わらない限り据え置く（別物なので混同しない）。
 */
export const TITLE_MAX = 45;

/** 本文に書いてよい唯一のリンク種別（自分のココナラ出品ページ）。
 *  ※ エディタが内部リンクすら弾く可能性があり **Phase 1 プローブ未確定**。
 *     確定するまで allowServiceLinks は既定 false（リンク全面ゼロ）で運用する。 */
export const SERVICE_URL_RE = /^https:\/\/coconala\.com\/services\/\d+$/;

const URL_RE = /https?:\/\/[^\s<>"'）)」】]+/g;
/** 外部プラットフォーム名の素の言及（URL でなくても誘導になる） */
const OFFSITE_WORDS = [/note\.com/i, /doboku-note/i, /ドボクノート/];
const CONTACT_PATTERNS = [
  { re: /[\w.+-]+@[\w-]+\.[\w.-]+/, label: 'メールアドレス' },
  { re: /(?:0\d{1,4}-\d{1,4}-\d{3,4}|0\d{9,10})/, label: '電話番号' },
  { re: /\bLINE\s*(?:ID|＠|@)|ライン(?:ID|アカウント)/i, label: 'LINE' },
  { re: /\b(?:twitter|x)\.com\/|instagram\.com\/|youtube\.com\//i, label: '外部SNS' },
];

export class BlogGuardError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BlogGuardError';
    this.code = code;
  }
}
const fail = (code, msg) => { throw new BlogGuardError(code, msg); };

/**
 * G1: 本文に外部リンク・外部プラットフォーム言及が無いこと。
 * @param {string} body 記事本文（frontmatter を除いたもの）
 * @param {{allowServiceLinks?:boolean}} opts allowServiceLinks=true なら自出品URLのみ許可
 * @returns {{urlsFound:number, allowed:number}} 検査した実数（0件と未検査を区別するため）
 */
export function assertNoExternalLinks(body, { allowServiceLinks = false } = {}) {
  const text = String(body ?? '');
  const urls = text.match(URL_RE) ?? [];
  let allowed = 0;
  for (const raw of urls) {
    const u = raw.replace(/[.,、。]+$/, '');
    if (allowServiceLinks && SERVICE_URL_RE.test(u)) { allowed++; continue; }
    fail('EXTERNAL_LINK',
      `本文にリンクがあります: ${u}\n` +
      'ココナラはブログ本文での外部サービスリンクを禁止しています（アカウント制限のリスク）。' +
      '導線は「出品サービス名をテキストで案内」に置き換えてください。');
  }
  for (const re of OFFSITE_WORDS) {
    const m = text.match(re);
    if (m) fail('OFFSITE_MENTION',
      `本文に外部プラットフォームの言及があります: "${m[0]}"\n` +
      'URL でなくても外部誘導と見なされうるため、ココナラブログでは書きません。');
  }
  return { urlsFound: urls.length, allowed };
}

/**
 * G2: 外部連絡先が無いこと（規約が名指ししている項目）。
 * @returns {{patternsChecked:number}}
 */
export function assertNoContactInfo(body) {
  const text = String(body ?? '');
  for (const { re, label } of CONTACT_PATTERNS) {
    const m = text.match(re);
    if (m) fail('CONTACT_INFO',
      `本文に${label}らしき記載があります: "${m[0]}"\n` +
      'ココナラは外部連絡先の記載を禁止しています（規約・アカウント制限のリスク）。');
  }
  return { patternsChecked: CONTACT_PATTERNS.length };
}

/**
 * G3: funnel 先が実在し、いま販売中（listed）であること。
 * @param {string[]} funnel frontmatter の funnel（serviceId の配列）
 * @param {Record<string,{id,status,title,priceYen,serviceUrl}>} catalog readCatalog() の戻り
 * @returns {{targets:Array}}
 */
export function assertFunnelTargets(funnel, catalog) {
  const ids = Array.isArray(funnel) ? funnel : [];
  if (ids.length === 0) {
    fail('FUNNEL_EMPTY', 'funnel が空です。ココナラブログは自出品への送客が唯一の目的なので、必ず1つ以上指定します。');
  }
  const targets = [];
  for (const id of ids) {
    const svc = catalog?.[id];
    if (!svc) fail('FUNNEL_UNKNOWN', `funnel の serviceId がカタログにありません: "${id}"（src/lib/coconala-services.ts）`);
    if (svc.status !== 'listed') {
      fail('FUNNEL_NOT_LISTED',
        `funnel 先 "${id}" は status:'${svc.status}' です。` +
        '販売していないページへ送る記事は公開できません（購入できない導線になる）。');
    }
    targets.push(svc);
  }
  return { targets };
}

/**
 * G4: 本文に書いた金額が、funnel 先カタログ価格のいずれかと一致すること。
 * 「¥1,500」「1,500円」「1500円」を拾う。価格に触れていない記事は 0 件で通す（検査数を返す）。
 * @returns {{amountsFound:number, prices:number[]}}
 */
export function assertPriceClaims(body, funnel, catalog) {
  const text = String(body ?? '');
  const prices = (Array.isArray(funnel) ? funnel : [])
    .map((id) => catalog?.[id]?.priceYen)
    .filter((n) => Number.isFinite(n));
  const found = [];
  const re = /(?:[¥￥]\s*([0-9][0-9,]*)|([0-9][0-9,]*)\s*円)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const n = Number(String(m[1] ?? m[2]).replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    found.push(n);
    if (!prices.includes(n)) {
      fail('PRICE_MISMATCH',
        `本文の金額 ${n.toLocaleString()}円 が funnel 先の価格と一致しません` +
        `（カタログ: ${prices.map((p) => p.toLocaleString() + '円').join(' / ') || 'なし'}）。` +
        '価格の真実源は src/lib/coconala-services.ts です。');
    }
  }
  return { amountsFound: found.length, prices };
}

/**
 * G5: タイトル。非空は必須。長さ上限は **未計測なら検査しない**（黙って PASS にしない）。
 * @returns {{length:number, lengthChecked:boolean, max:number|null}}
 */
export function assertTitle(title, { max = TITLE_MAX } = {}) {
  const t = String(title ?? '').trim();
  if (!t) fail('TITLE_EMPTY', 'title が空です。');
  if (Number.isFinite(max) && t.length > max) {
    fail('TITLE_TOO_LONG', `title が ${t.length} 字で上限 ${max} 字を超えています: "${t}"`);
  }
  return { length: t.length, lengthChecked: Number.isFinite(max), max: Number.isFinite(max) ? max : null };
}

/**
 * 全ハードゲートをまとめて実行する。**検査した実数を返す**ので、
 * 呼び出し側は「0件だった」と「検査していない」を区別して表示できる。
 * @returns {{links, contact, funnel, price, title}}
 */
export function assertBlogPost({ title, body, funnel }, catalog, { allowServiceLinks = false } = {}) {
  return {
    title: assertTitle(title),
    links: assertNoExternalLinks(body, { allowServiceLinks }),
    contact: assertNoContactInfo(body),
    funnel: assertFunnelTargets(funnel, catalog),
    price: assertPriceClaims(body, funnel, catalog),
  };
}
