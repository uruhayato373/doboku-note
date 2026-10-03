/**
 * identity-literals.mjs — サイトとアカウントの識別子を、コードが定数として再宣言している行の検出。
 *
 * サイトの origin・note のクリエイター・Search Console のプロパティ・R2 の公開ホストは src/config/site-identity.mjs が、
 * X・Instagram のハンドルは config/x-account.json・config/ig-account.json が唯一の定義で、スクリプトは
 * scripts/lib/site-identity.mjs から受け取る。コードが `const X = 'https://doboku-note.com'` や `account: 'doboku373'` と
 * 書き写すと、値が動いたとき直し漏れた側が古い識別子のまま動き続ける
 * （2026-08-13: 旧 note URL が YouTube 概要欄 32 本に出た・x-repost の ownHandle が凍結アカウントのままだった）。
 * check-dead-handles.mjs（CI・pre-commit）がこの関数で再宣言を止める。
 *
 * 止めるのは「識別子そのもの」を値として代入・宣言する行だけ（`= '…'`・`: '…'` の右辺が識別子に完全一致）。
 * 記事 1 本分の URL（`'https://doboku-note.com/about'`・note-magazines.ts の各マガジン URL）はデータであり止めない。
 * 説明（コメント）の中の記述も止めない。意図して書く行は行末に `// identity-literal-ok: 理由`。
 */

/** 右辺が完全一致で識別子になるもの（値の形: 代入・プロパティ・既定引数のどれでも止める） */
const VALUE_LITERALS = [
  { use: 'SITE_ORIGIN（src/config/site-identity.mjs）', literal: String.raw`https?:\/\/(?:www\.)?doboku-note\.com\/?` },
  { use: 'SITE_HOST（src/config/site-identity.mjs）', literal: String.raw`doboku-note\.com` },
  { use: 'GSC_PROPERTY（src/config/site-identity.mjs）', literal: String.raw`sc-domain:doboku-note\.com` },
  { use: 'R2_PUBLIC_ORIGIN（src/config/site-identity.mjs）', literal: String.raw`https?:\/\/storage\.doboku-note\.com\/?` },
  { use: 'R2_PUBLIC_HOST（src/config/site-identity.mjs）', literal: String.raw`storage\.doboku-note\.com` },
  { use: 'NOTE_BASE（src/config/site-identity.mjs）', literal: String.raw`https?:\/\/note\.com\/dobokunote\/?` },
  { use: 'X_HANDLE（scripts/lib/site-identity.mjs・正本 台帳 config.x-account）', literal: 'doboku373' },
  { use: 'IG_HANDLE（scripts/lib/site-identity.mjs・正本 台帳 config.ig-account）', literal: 'dobokunotecom' },
];

/**
 * 宣言（const/let/var）の右辺だけ止めるもの。`dobokunote` はココナラの出品者名（config/coconala-account.json）も同じ綴りなので、
 * 既定引数やプロパティ（`self = 'dobokunote'`）までは止めない。
 */
const DECLARATION_LITERALS = [
  { use: 'NOTE_CREATOR（src/config/site-identity.mjs）', literal: 'dobokunote' },
];

const QUOTE = String.raw`(['"\x60])`;
const VALUE_RE = (literal) => new RegExp(String.raw`(?:=|:)\s*${QUOTE}${literal}\1(?![\w./-])`);
const DECLARATION_RE = (literal) =>
  new RegExp(String.raw`(?:^|[\s;(])(?:export\s+)?(?:const|let|var)\s+[\w$]+(?:\s*:\s*[\w<>[\]| ]+)?\s*=\s*${QUOTE}${literal}\1(?![\w./-])`);

const RULES = [
  ...VALUE_LITERALS.map((r) => ({ use: r.use, re: VALUE_RE(r.literal) })),
  ...DECLARATION_LITERALS.map((r) => ({ use: r.use, re: DECLARATION_RE(r.literal) })),
];

/** 定義そのもの（ここでだけ識別子の値を書いてよい） */
export const IDENTITY_DEFINITION_FILES = ['src/config/site-identity.mjs', 'scripts/lib/site-identity.mjs', 'scripts/lib/identity-literals.mjs'];

/** 走査するのはコードだけ。fixture・期待値を書くテスト（tests/・e2e/）は対象にしない */
export function isIdentityScanTarget(file) {
  if (!/\.(?:mjs|cjs|js|mts|ts|tsx|jsx)$/.test(file)) return false;
  if (IDENTITY_DEFINITION_FILES.includes(file)) return false;
  if (/(?:^|\/)node_modules\//.test(file)) return false;
  return /^(?:src|scripts|tools|\.claude\/(?:scripts|skills))\//.test(file);
}

/**
 * 1 行ずつ識別子の再宣言を返す。行頭がコメント（// ・ * ・ /*）の行と、行末の ` // ` 以降は読まない。
 * @returns {{ line: number, text: string, use: string }[]}
 */
export function findIdentityLiterals(source) {
  const hits = [];
  source.split('\n').forEach((raw, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(raw) || /identity-literal-ok:\s*\S/.test(raw)) return;
    const line = raw.replace(/\s\/\/\s.*$/, '');
    for (const rule of RULES) {
      const m = rule.re.exec(line);
      if (m) {
        hits.push({ line: i + 1, text: line.trim().slice(0, 100), use: rule.use });
        break;
      }
    }
  });
  return hits;
}
