/**
 * channel-registry.ts — 管理画面の「コンテンツ」ナビが読む唯一の channel 定義。
 *
 * Node API / fs を import しない純粋な data module。Client Component の Nav.tsx と
 * Server Component の /content 系ページの双方から安全に import できる（DN-0103 Phase 01）。
 *
 * `sourcePath` は表示・関連付け用の参考情報であり、fs アクセスには使わない
 * （実ファイル解決は `document-roots.ts` の allowlist と document-store.ts の
 * prefix + realpath 検査を経由する）。
 */

export type AdminChannelId =
  | 'site'
  | 'note'
  | 'x'
  | 'instagram'
  | 'youtube'
  | 'coconala'
  | 'kindle'
  | 'brain';

export type AdminChannelTab = {
  href: string;
  label: string;
  match: string;
  query?: Readonly<Record<string, string>>;
};

export type AdminChannel = {
  id: AdminChannelId;
  label: string;
  sourcePath: string | null;
  /**
   * false の間は Nav・/content 上でリンク可能な入口を作らない
   * （Phase 04 で Brain 専用画面ができるまで `enabled: false`）。
   */
  enabled: boolean;
  tabs: readonly AdminChannelTab[];
};

export const ADMIN_CHANNELS: readonly AdminChannel[] = [
  {
    id: 'site',
    label: 'サイト',
    sourcePath: 'content/site',
    enabled: true,
    tabs: [
      { href: '/content/articles', label: '記事', match: '/content/articles' },
      { href: '/gallery/ogp', label: 'OGP', match: '/gallery/ogp' },
      { href: '/gallery/figures', label: '記事図版', match: '/gallery/figures' },
    ],
  },
  {
    id: 'note',
    label: 'note',
    sourcePath: 'content/note',
    enabled: true,
    tabs: [
      { href: '/content/note', label: '記事', match: '/content/note' },
      { href: '/content/magazines', label: 'マガジン', match: '/content/magazines' },
      { href: '/content/note-status', label: '公開状態', match: '/content/note-status' },
      { href: '/gallery/note', label: '画像', match: '/gallery/note' },
    ],
  },
  {
    id: 'x',
    label: 'X',
    sourcePath: 'content/sns/x',
    enabled: true,
    tabs: [
      {
        href: '/gallery/sns?ch=x',
        label: '画像',
        match: '/gallery/sns',
        query: { ch: 'x' },
      },
      { href: '/sns#x', label: '投稿状況', match: '/sns' },
    ],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    sourcePath: 'content/sns/instagram',
    enabled: true,
    tabs: [
      {
        href: '/gallery/sns?ch=instagram',
        label: '画像・動画',
        match: '/gallery/sns',
        query: { ch: 'instagram' },
      },
      { href: '/sns#instagram', label: '投稿状況', match: '/sns' },
    ],
  },
  {
    id: 'youtube',
    label: 'YouTube',
    sourcePath: 'content/sns/youtube',
    enabled: true,
    tabs: [
      {
        href: '/content/content~sns/youtube',
        label: 'ファイル',
        match: '/content/content~sns/youtube',
      },
    ],
  },
  {
    id: 'coconala',
    label: 'ココナラ',
    sourcePath: 'content/coconala',
    enabled: true,
    tabs: [
      {
        href: '/content/content~coconala',
        label: 'ファイル',
        match: '/content/content~coconala',
      },
    ],
  },
  {
    id: 'kindle',
    label: 'Kindle',
    sourcePath: 'content/kindle',
    enabled: true,
    tabs: [
      {
        href: '/content/content~kindle',
        label: 'ファイル',
        match: '/content/content~kindle',
      },
    ],
  },
  {
    id: 'brain',
    label: 'Brain',
    // Phase 03 で content/brain へ移行するまでは実体が無いため null のまま。
    sourcePath: null,
    // Phase 04 で専用画面ができるまではリンクを作らない。
    enabled: false,
    tabs: [],
  },
] as const;

export const enabledChannels = (): readonly AdminChannel[] =>
  ADMIN_CHANNELS.filter((c) => c.enabled);

export const channelById = (id: AdminChannelId): AdminChannel | undefined =>
  ADMIN_CHANNELS.find((c) => c.id === id);

/**
 * `/content` の物理セグメント（ディレクトリ名）→ 表示ラベル。
 *
 * 物理セグメントと論理 channel は 1 対 1 ではない
 * （`sns` は x / instagram / youtube の 3 channel を束ねた物理ディレクトリ、
 *  `sources` はどの channel にも属さない原典・入力資料）。
 * まず ADMIN_CHANNELS の id と一致するものを引き、一致しない既知セグメントは
 * 個別マッピングでフォールバックする。
 */
const SEGMENT_LABEL_OVERRIDES: Readonly<Record<string, string>> = {
  sns: 'SNS',
  sources: '原典・入力資料',
  textbook: '原典・入力資料',
};

export const contentSegmentLabel = (segment: string): string =>
  channelById(segment as AdminChannelId)?.label ?? SEGMENT_LABEL_OVERRIDES[segment] ?? segment;
