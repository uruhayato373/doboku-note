/**
 * ココナラ 出品サービス定義 (Single Source of Truth)
 *
 * 各サービスの出品状態・serviceUrl・価格・受付枠を一元管理する。
 * links/page.tsx（/links の単発サービス導線）と check-coconala-wiring.mjs から参照される。
 *
 * 運営者作業フロー (新規出品時):
 * 1. ココナラ上でサービスを出品し URL を取得（https://coconala.com/services/{id}）
 * 2. 該当エントリの `serviceUrl` を埋め `status: 'listed'` に変更
 * 3. commit → デプロイ後、/links に「単発サービス」カードが自動表示される
 *
 * 出品前は status: 'draft' にしておけば防御的に非表示（listed が 0 件なら
 * セクションごと出ない）。満枠時は 'full'、季節オフは 'paused' へ flip する。
 *
 * 戦略・出品文面の真実源: docs/note/1級・2級土木/ココナラ展開キット.md
 * 運用・スキーマの真実源: docs/reference/coconala-operations.md
 */

export type CoconalaStatus = 'draft' | 'listed' | 'paused' | 'full';

export interface CoconalaService {
  readonly id: string;
  /** listed のみサイト導線が発火する。full/paused は出品中だが導線を伏せる */
  readonly status: CoconalaStatus;
  /**
   * ココナラのサービス URL。出品後に埋める。
   * serviceUrl は照合キー（check-coconala-wiring が listed の非空を強制）のため不変。
   */
  readonly serviceUrl: string;
  readonly title: string;
  /** カード用の短縮タイトル */
  readonly shortTitle: string;
  readonly description: string;
  /** 表示用の価格文字列（例: '¥8,000（2テーマセット）'） */
  readonly price: string;
  /** 機械照合用の価格。orders-log.json / sales-log.json の実績と突合する */
  readonly priceYen: number;
  readonly examScope: readonly ('civil-1' | 'civil-2')[];
  /** 週あたりの受付枠（Red Line #1: 定員なし恒久添削の禁止を機械的に表明する） */
  readonly weeklyCapacity: number;
  /** 出品日（ISO 日付）。listed 化と同時に埋める */
  readonly listedAt?: string;
}

/**
 * 命名規約 (id):
 * - coconala-{サービス種別}: ココナラ出品サービス。sales-log.json の productId は
 *   `coconala:{id}` 形式（例: coconala:coconala-tensaku-set）で接頭辞によりチャネルを判別する。
 *
 * 新サービス追加時の配線チェックリスト（capability ドリフト防止・2026-07-16）:
 *   本エントリ追加だけでは依存する実行系に配線されない。新サービスを足したら:
 *   1. 売上記録: .claude/agents/sales-recorder.md の productId マッピング表「ココナラ」節に追加
 *      ＋ docs/reference/sales-tracking.md の命名表に追加
 *   2. 運用スキーマ: docs/reference/coconala-operations.md のサービス表を更新
 *   3. 出品文面: docs/note/1級・2級土木/ココナラ展開キット.md §出品文面に追加
 *   4. check-coconala-wiring.mjs が pre-commit で catalog↔state↔sales の整合を機械検知する
 *      （listed なのに serviceUrl 空・未知の serviceId・priceYen 不一致で落ちる）
 *   5. 変更後は /doc-sync を1回回して prose 陳腐化を点検（CLAUDE.md §8）
 */
const SERVICES_RAW = {
  // S1: レビュー獲得フロント。1テーマ分の診断のみ（書き換え文は提供しない＝S2 との線引き）。
  'coconala-shindan': {
    id: 'coconala-shindan',
    status: 'draft',
    serviceUrl: '',
    title: '土木施工管理の経験記述を採点者目線で合格診断します',
    shortTitle: '経験記述 合格診断',
    description:
      '1級・2級土木施工管理技士 第2次検定の施工経験記述（問題1）の下書き1テーマ分を、元自治体土木（発注者側）の目で診断。合格可能性の A/B/C 判定＋減点ポイント ワースト3＋字数チェックを返却する。診断のみで書き換え文は提供しない（書き換え案は添削サービスの担当）。',
    price: '¥1,500（1テーマ診断）',
    priceYen: 1500,
    examScope: ['civil-1', 'civil-2'],
    weeklyCapacity: 5,
  },

  // S2: 主力。相場（¥12,000〜24,000）の下に入って実績を貯め、評価20件で¥12,000へ引き上げる。
  // 価格改定時は priceYen と price の両方＋ココナラ展開キット.md の価格表を同時更新する。
  'coconala-tensaku-set': {
    id: 'coconala-tensaku-set',
    status: 'draft',
    serviceUrl: '',
    title: '新形式対応・土木施工管理の経験記述を発注者目線で添削します',
    shortTitle: '経験記述 添削（2テーマセット）',
    description:
      '1級・2級土木施工管理技士 第2次検定の施工経験記述（問題1）を令和6年度からの新形式（2テーマ必答）に対応して添削。2テーマ分の赤入れ（NG→OK 書き換え案）＋6観点のチェックリスト判定表＋採点者視点のコメント＋書き直し1回を含む。代筆（ゼロからの作成代行）は受験の公正のため行わない。',
    price: '¥8,000（2テーマセット・書き直し1回込み）',
    priceYen: 8000,
    examScope: ['civil-1', 'civil-2'],
    weeklyCapacity: 3,
  },
} as const satisfies Record<string, CoconalaService>;

export type CoconalaServiceId = keyof typeof SERVICES_RAW;

export const COCONALA_SERVICES: Readonly<Record<CoconalaServiceId, CoconalaService>> = SERVICES_RAW;

/**
 * 出品中（listed）のサービスのみ。サイト導線はこれを使う＝draft/full/paused は自動的に非表示。
 * COCONALA_SERVICES（widen 済み）を経由する＝note-magazines.ts と同じ流儀。
 * SERVICES_RAW を直接 filter すると `as const` のリテラル型で status 比較が型エラーになる。
 */
export function listedCoconalaServices(): CoconalaService[] {
  return Object.values(COCONALA_SERVICES).filter((s) => s.status === 'listed');
}

export function getCoconalaService(id: CoconalaServiceId): CoconalaService {
  return COCONALA_SERVICES[id];
}
