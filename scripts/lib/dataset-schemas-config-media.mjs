/**
 * dataset-schemas-config-media.mjs — 設定（config/）の型（zod）。dataset-schemas.mjs が export * で束ね、台帳（datasets.mjs）の schema が名前で引く。
 * 型を足す約束は dataset-schemas.mjs の先頭。部品は dataset-schema-parts.mjs。
 */
import { z } from 'zod';
import { jstDate, offsetTime, count, sha256, flag, uniqueBy } from './dataset-schema-parts.mjs';

// ---- 共通の小さな部品 --------------------------------------------------------------------------

/** 説明用の欄（_doc・_comment・_note・description）。人が読む文で、読み手は使わない */
const doc = (what = '説明（読み手は使わない）') => z.string().describe(what);
/** 正規表現として組み立てられる文字列 */
const regexString = (what) =>
  z
    .string()
    .refine((s) => {
      try {
        new RegExp(s);
        return true;
      } catch {
        return false;
      }
    }, '正規表現として読めない')
    .describe(what);
const schemaVersion1 = z.literal(1).describe('設定の版（整数）。形を変えるときに上げる');
const repoPath = (what) => z.string().min(1).describe(`${what}（リポジトリ相対のパス）`);
const pixels = (what) => z.number().int().positive().describe(`${what}（px）`);

// ---- 図版 SVG の固定キャンバス（config/figure-canvas.json） ---------------------------------------------

const FigureCanvas = z
  .object({
    role: z.enum(['master', 'variant']).describe('正本のキャンバスか、そこから派生する別画角か'),
    use: z.array(z.string().min(1)).min(1).describe('このキャンバスを使う場所（site-article・youtube-video など）'),
    viewBox: z.tuple([pixels('viewBox の幅'), pixels('viewBox の高さ')]).describe('SVG の viewBox の幅と高さ'),
    ratio: z.string().regex(/^\d+:\d+$/, 'W:H').describe('縦横比（4:5 など）'),
    render: z.tuple([pixels('PNG の幅'), pixels('PNG の高さ')]).describe('PNG にするときの出力サイズ'),
    embeddable: z.boolean().describe('記事に ArticleImage で埋め込んでよいか'),
    filename: z
      .object({
        match: z.string().min(1).describe('対象のファイル名の glob'),
        excludeSuffix: z.string().optional().describe('この接尾辞を持つファイルは除く'),
        requireSuffix: z.string().optional().describe('この接尾辞を持つファイルだけ対象'),
      })
      .strict(),
    minFontViewBox: z.number().positive().describe('文字の最小サイズ（viewBox 単位）'),
    style: z.string().optional(),
    note: doc().optional(),
  })
  .strict();

export const ConfigFigureCanvas = z
  .object({
    $schema: z.string().optional(),
    schemaVersion: schemaVersion1,
    description: doc(),
    updated: jstDate('最終更新日'),
    canvases: z.object({ feed: FigureCanvas, landscape: FigureCanvas }).strict().describe('キャンバスの種類。feed（4:5・記事とフィード）と landscape（16:9・動画と X）'),
    derived: z
      .record(
        z.string().min(1),
        z
          .object({
            from: z.string().min(1).describe('元にするキャンバス名'),
            render: z.tuple([pixels('幅'), pixels('高さ')]),
            method: z.string(),
            authored: z.boolean().describe('人が描くか（false は自動生成）'),
            use: z.array(z.string().min(1)).min(1),
          })
          .strict(),
      )
      .describe('キャンバスから自動で作る派生の画角'),
    guard: z
      .object({
        script: repoPath('検査スクリプト'),
        scope: z.string().min(1).describe('検査する SVG の glob'),
        rule: z.string().min(1),
        migrationAllowlist: z.array(z.string().min(1)).describe('移行待ちで寸法の検査を免除する SVG のパス。check-figure-canvas が書き換える'),
      })
      .strict(),
    references: z.record(z.string().min(1), z.string().min(1)).describe('関連する文書・スクリプト・状態ファイルの所在'),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (const [name, d] of Object.entries(v.derived)) {
      if (!(d.from in v.canvases)) flag(ctx, ['derived', name, 'from'], `元のキャンバス「${d.from}」が canvases に無い`);
    }
    const dup = v.guard.migrationAllowlist.find((p, i) => v.guard.migrationAllowlist.indexOf(p) !== i);
    if (dup) flag(ctx, ['guard', 'migrationAllowlist'], `「${dup}」が重複`);
  })
  .meta({ title: '図版 SVG の固定キャンバス' });

// ---- 記事図の元素材（config/figure-sources.json） ------------------------------------------------------

const FIGURE_NEEDS = ['ok', 'rescan', 'rescan-need-source', 'rescan-or-svg', 'recrop-urgent', 'recrop', 'recrop-review'];

const FigureSourceCategory = z
  .object({
    source_dir: z.string().min(1).describe('元素材のディレクトリ（content/sources/textbook 配下）'),
    source_kind: z.enum(['pdf-vector', 'pdf-textonly', 'scan-image', 'mixed']).describe('元素材の種類'),
    figure_origin: z.enum(['question-pdf', 'answer-booklet', 'textbook-scan', 'ai-generated', 'unknown']).describe('図クロップの実際の出所'),
    quality: z.enum(['print-clean', 'scan-low', 'mixed']).describe('元素材の品質'),
    rescannable: z.enum(['true', 'needs-source', 'na']).describe('高解像度の再スキャンで改善できるか（文字列の true / needs-source / na）'),
    scanReferences: z
      .array(z.string().regex(/^[a-z0-9][a-z0-9-]*$/))
      .min(1)
      .optional()
      .describe('試験ページの図を切り出す媒体の参考文献 id（公式 PDF に図が無い年度の問題解説集など）。figure-review-queue が原典候補に足す'),
    note: doc('運用メモ'),
  })
  .strict();

export const ConfigFigureSources = z
  .object({
    schemaVersion: schemaVersion1,
    _comment: doc(),
    _updated: jstDate('最終更新日'),
    _fields: z.record(z.string(), z.string()).describe('categories の各欄の意味（人が読む）'),
    _manual_needs_comment: doc(),
    manual_needs: z
      .array(
        z
          .object({
            figure: z.string().min(1).describe('図の識別子（記事の slug/img/名前。拡張子なし）'),
            needs: z.enum(FIGURE_NEEDS).describe('機械監査の判定を上書きする次の作業'),
            reason: z.string().min(1),
            verified: jstDate('目視確認日'),
          })
          .strict(),
      )
      .superRefine(uniqueBy('figure', '図'))
      .describe('機械監査で見つけられない図の欠陥の図ごとの上書き'),
    provenance: z
      .record(
        z.string().regex(/^[a-z0-9-]+\/[^/]+\/img\/[^/]+$/, '資格/記事/img/名前（拡張子なし）'),
        z
          .object({
            pdf: z.string().regex(/^(?:vault:原資料PDF\/.+|https:\/\/.+)$/, 'vault:原資料PDF/… か https の URL').describe('図を切り出した原典'),
            page: z.number().int().min(1).optional().describe('PDF のページ（特定していなければ書かない）'),
            dpi: z.number().int().min(0).optional().describe('切り出しの解像度（0 は PDF でなく画像から切り出した）'),
          })
          .strict(),
      )
      .describe('図ごとの出典の正本（図を切り出した原典 PDF・ページ）。figure-review-queue record が書き、切り出し直しと参考文献の結線検査が読む'),
    categories: z
      .record(
        z.string().min(1),
        z.union([FigureSourceCategory, z.object({ _alias: z.string().min(1).describe('別の資格の台帳をそのまま使う') }).strict()]),
      )
      .describe('資格（category slug）ごとの元素材の台帳'),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (const [name, c] of Object.entries(v.categories)) {
      if ('_alias' in c && !(c._alias in v.categories && !('_alias' in v.categories[c._alias]))) flag(ctx, ['categories', name, '_alias'], `別名の先「${c._alias}」が実体のある資格として無い`);
    }
  })
  .meta({ title: '記事図の元素材の台帳' });

// ---- 画像アセットの品質ガード（config/image-limits.json） ---------------------------------------------------

export const ConfigImageLimits = z
  .object({
    schemaVersion: schemaVersion1,
    _doc: doc(),
    roots: z
      .array(z.object({ dir: repoPath('検査するディレクトリ'), match: z.string().min(1).optional().describe('この名前のサブディレクトリの中だけ見る') }).strict())
      .min(1)
      .describe('画像を検査する場所'),
    maxBytes: z
      .record(z.string().regex(/^[a-z0-9]+$/, '小文字の拡張子'), z.number().int().positive())
      .describe('拡張子ごとの最大バイト数。超えると警告（既存の超過は baseline で許す）'),
    filenamePattern: regexString('許すファイル名の正規表現'),
    examDirPattern: regexString('試験の過去問ディレクトリを見分ける正規表現'),
    unreferencedExcludeBasenames: z.array(z.string().min(1)).describe('どの記事からも参照されなくても検査から除くファイル名'),
    unreferencedExcludePattern: regexString('参照されなくても除くファイル名の正規表現'),
  })
  .strict()
  .meta({ title: '画像アセットの品質ガード' });

// ---- 公開ページの見え方検査の画面幅（config/public-view-breakpoints.json） ---------------------------------------

const PublicViewport = z
  .object({
    name: z.string().min(1).describe('画面幅の名前（sp・tab・pc など）'),
    width: pixels('画面の幅'),
    height: pixels('画面の高さ'),
    device: z.enum(['phone', 'tablet', 'desktop']).describe('端末の種類。UA・タッチ・倍率を決める'),
    _band: z.string().min(1).describe('この画面幅が代表する帯（人が読む）'),
  })
  .strict();

const publicServiceShape = {
  measuredAt: jstDate('CSS を数えた日'),
  measuredOn: z.string().min(1).describe('数えたページ'),
  breakpoints: z.array(pixels('切り替わる幅')).min(1).describe('レイアウトが切り替わる幅（下の帯の最大幅）'),
  _breakpointsNote: doc(),
  viewports: z.array(PublicViewport).min(1).describe('各帯から 1 つずつ選んだ撮影用の画面幅'),
};

export const ConfigPublicViewBreakpoints = z
  .object({
    schemaVersion: schemaVersion1,
    _doc: doc(),
    significantRuleCount: count('主要な切り替わり幅とみなす media query の規則数'),
    note: z.object({ ...publicServiceShape, allPagesViewport: z.string().min(1).describe('全ページの検査に使う画面幅の名前（viewports の name）') }).strict().describe('note の画面幅'),
    youtube: z.object(publicServiceShape).strict().describe('YouTube の画面幅'),
    userAgents: z.object({ phone: z.string().min(1), tablet: z.string().min(1), desktop: z.string().min(1) }).strict().describe('端末の種類ごとの User-Agent'),
    minDeviceWidth: pixels('実機の最小幅'),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (const svc of ['note', 'youtube']) {
      const names = v[svc].viewports.map((p) => p.name);
      const dup = names.find((n, i) => names.indexOf(n) !== i);
      if (dup) flag(ctx, [svc, 'viewports'], `画面幅の名前「${dup}」が重複`);
      const sorted = [...v[svc].breakpoints].sort((a, b) => a - b);
      if (sorted.some((b, i) => b !== v[svc].breakpoints[i])) flag(ctx, [svc, 'breakpoints'], '切り替わる幅が昇順でない');
    }
    if (!v.note.viewports.some((p) => p.name === v.note.allPagesViewport)) flag(ctx, ['note', 'allPagesViewport'], 'note の viewports に無い名前');
  })
  .meta({ title: '公開ページの見え方検査の画面幅' });

// ---- 土木工事共通仕様書の構造化（config/standards-structure.json） ------------------------------------------------

const AGENCY_DOC = /^[a-z0-9-]+\/[a-z0-9-]+$/;
const agencyDoc = z.string().regex(AGENCY_DOC, '機関/文書（kinki/common など）');

export const ConfigStandardsStructure = z
  .object({
    schemaVersion: schemaVersion1,
    _comment: doc(),
    canonical: z.object({ _comment: doc().optional(), commonAgencyId: z.string().min(1).describe('共通仕様書のうち検索インデックス対象にする機関の id') }).strict(),
    build: z.object({ _comment: doc().optional(), documents: z.array(agencyDoc).min(1).superRefine(uniqueBy((d) => d, '文書')).describe('構造化して章記事を作る文書') }).strict(),
    skipped: z
      .object({
        _comment: doc().optional(),
        reasons: z
          .record(
            z.string().min(1),
            z.object({ label: z.string().min(1), documents: z.union([z.literal('*').describe('残りの全文書'), z.array(agencyDoc).min(1)]) }).strict(),
          )
          .describe('構造化しない理由ごとの文書（被覆の検査は check-standard-articles）'),
      })
      .strict(),
    documents: z
      .record(agencyDoc, z.object({ _comment: doc().optional(), bodyStartPage: z.number().int().positive().optional().describe('本文の開始ページ（自動検出を上書きする）') }).strict())
      .describe('文書ごとの例外補正'),
  })
  .strict()
  .superRefine((v, ctx) => {
    const built = new Set(v.build.documents);
    for (const [reason, r] of Object.entries(v.skipped.reasons)) {
      if (r.documents === '*') continue;
      for (const d of r.documents) if (built.has(d)) flag(ctx, ['skipped', 'reasons', reason, 'documents'], `「${d}」は build.documents にも入っている`);
    }
    if (Object.values(v.skipped.reasons).filter((r) => r.documents === '*').length > 1) flag(ctx, ['skipped', 'reasons'], '残りの全文書（*）を理由にできるのは 1 つだけ');
  })
  .meta({ title: '土木工事共通仕様書の構造化の設定' });

// ---- OGP の設定（config/ogp/settings.json） -----------------------------------------------------------------

export const ConfigOgpSettings = z
  .object({
    schemaVersion: schemaVersion1,
    _note: doc(),
    rules: z
      .object({
        version: z.number().int().describe('rules 部分の版（ogp-create 内部の履歴。ファイル全体の版は schemaVersion）'),
        description: doc(),
        default: z.string().min(1).describe('どの規則にも当たらないときのテンプレート id（templates.templates のキー）'),
        rules: z
          .array(
            z
              .object({
                match: z
                  .object({
                    category: z.string().min(1).optional().describe('記事の category（資格の slug）'),
                    tags_any: z.array(z.string().min(1)).optional().describe('どれか 1 つのタグを持つ'),
                    tags_all: z.array(z.string().min(1)).optional().describe('全てのタグを持つ'),
                  })
                  .strict(),
                template: z.string().min(1).describe('当たったときのテンプレート id'),
              })
              .strict(),
          )
          .describe('上から順に評価する規則。空なら default だけ'),
      })
      .strict(),
    templates: z
      .object({
        version: z.number().int().describe('templates 部分の版（ogp-create 内部の履歴）'),
        description: doc(),
        templates: z
          .record(
            z.string().min(1),
            z
              .object({
                name: z.string().min(1),
                category: z.string().min(1),
                backgroundImage: z.string().min(1).nullable().describe('テンプレート固有の背景画像（リポジトリ相対）。無ければ null'),
                promptSource: z.string().min(1),
                notes: doc(),
              })
              .strict(),
          )
          .describe('テンプレートの定義。描画の実装は ogp-templates.mjs'),
      })
      .strict(),
    text: z
      .object({
        version: z.number().int().describe('text 部分の版（ogp-text 内部の履歴）'),
        description: doc(),
        safetyWidth: pixels('タイトルを収める幅'),
        safetyHeightForTitle: pixels('タイトルを収める高さ'),
        maxLines: z.number().int().positive().describe('タイトルの最大行数'),
        fontSizeTable: z.array(pixels('文字の大きさ')).min(1).describe('試す文字の大きさ（大きい順）。最長行が safetyWidth に収まる最大を選ぶ'),
        _fontSizeTable_note: doc().optional(),
        breakBefore: z.array(z.string().min(1)).describe('この文字の直前で改行する（文字は次の行に残す）'),
        breakAt: z.array(z.string().min(1)).describe('この文字の位置で改行する（文字は捨てる）'),
        _breakAt_note: doc().optional(),
        charCountFallback: z.number().int().positive().describe('1 行の文字数の目安（BudouX が使えないときの折り返し）'),
        _charCountFallback_note: doc().optional(),
        budouX: z.object({ enabled: z.boolean().describe('BudouX で意味の切れ目に改行するか'), _comment: doc().optional() }).strict(),
      })
      .strict()
      .superRefine((t, ctx) => {
        if (t.fontSizeTable.some((n, i) => i > 0 && n >= t.fontSizeTable[i - 1])) flag(ctx, ['fontSizeTable'], '文字の大きさが大きい順（重複なし）でない');
      }),
  })
  .strict()
  .superRefine((v, ctx) => {
    const ids = Object.keys(v.templates.templates);
    if (!ids.includes(v.rules.default)) flag(ctx, ['rules', 'default'], `テンプレート「${v.rules.default}」が templates に無い`);
    v.rules.rules.forEach((r, i) => {
      if (!ids.includes(r.template)) flag(ctx, ['rules', 'rules', i, 'template'], `テンプレート「${r.template}」が templates に無い`);
    });
  })
  .meta({ title: 'OGP の設定' });

// ---- X・Instagram のアカウント（config/x-account.json・config/ig-account.json） ---------------------------------

const accountRefs = z.record(z.string().min(1), z.string().min(1)).describe('関連する正本・文書の所在（リポジトリ相対）');
const lengthLimits = z.object({ displayName: z.number().int().positive().describe('表示名の最大字数'), bio: z.number().int().positive().describe('自己紹介の最大字数') }).strict();
const checkProfileLengths = (v, ctx) => {
  if ([...v.profile.displayName].length > v.limits.displayName) flag(ctx, ['profile', 'displayName'], `表示名が ${v.limits.displayName} 字を超える`);
  if ([...v.profile.bio].length > v.limits.bio) flag(ctx, ['profile', 'bio'], `自己紹介が ${v.limits.bio} 字を超える`);
};

export const ConfigXAccount = z
  .object({
    schemaVersion: schemaVersion1,
    platform: z.literal('x'),
    handle: z.string().regex(/^[A-Za-z0-9_]{1,15}$/, '@ 抜きの X のハンドル').describe('運用アカウントのハンドル（@ なし）'),
    profileUrl: z.url().describe('プロフィールの URL'),
    authService: z.literal('x').describe('Playwright の認証プロファイルの名前'),
    profile: z
      .object({
        displayName: z.string().min(1).describe('表示名'),
        bio: z.string().min(1).describe('自己紹介（正本。x-profile-sync が実アカウントへ反映する）'),
        websiteUrl: z.url().describe('プロフィールのリンク先'),
        headerCopy: z.string().min(1).describe('ヘッダー画像のコピー'),
        pinnedPost: z
          .object({
            status: z.string().min(1).describe('固定ポストの状態（pinned など）'),
            campaign: z.string().min(1).describe('utm_campaign に使うキャンペーン名'),
            source: z.string().min(1).describe('固定ポストの出どころ（人が読む）'),
            postUrl: z.url(),
            postedAt: offsetTime('投稿した時刻（手で書く台帳のため +09:00 を含む）'),
            reviewAfter: jstDate('差し替えを見直す日'),
            _note: doc().optional(),
          })
          .strict(),
        location: z.string().min(1).describe('所在地の表示'),
      })
      .strict(),
    limits: lengthLimits,
    references: accountRefs,
    _note: doc(),
  })
  .strict()
  .superRefine(checkProfileLengths)
  .meta({ title: 'X のアカウントとプロフィール' });

export const ConfigIgAccount = z
  .object({
    schemaVersion: schemaVersion1,
    platform: z.literal('instagram'),
    handle: z.string().regex(/^[A-Za-z0-9._]{1,30}$/, '@ 抜きの Instagram のハンドル').describe('運用アカウントのハンドル（@ なし）'),
    fbPageName: z.string().min(1).describe('Meta Business Suite のページ名'),
    profileUrl: z.url(),
    plannerUrl: z.url().describe('Meta Business Suite のコンテンツカレンダー'),
    authService: z.literal('instagram').describe('Playwright の認証プロファイルの名前'),
    graph: z
      .object({
        apiVersion: z.string().regex(/^v\d+\.\d+$/, 'v23.0 の形'),
        businessAccountId: z.string().min(1).nullable().describe('Instagram のビジネスアカウント id。未設定は null（Secrets の IG_BUSINESS_ACCOUNT_ID が優先）'),
        _note: doc().optional(),
      })
      .strict(),
    profile: z
      .object({
        displayName: z.string().min(1),
        bio: z.string().min(1).describe('自己紹介（正本）'),
        websiteUrl: z.url(),
        pinnedPosts: z
          .array(
            z
              .object({
                order: z.number().int().positive().describe('固定の順番（1 から）'),
                key: z.string().min(1),
                title: z.string().min(1),
                status: z.string().min(1).describe('固定投稿の状態（planned など）'),
              })
              .strict(),
          )
          .superRefine(uniqueBy('order', '順番'))
          .describe('プロフィールに固定する投稿'),
        highlights: z.array(z.string().min(1)).describe('ハイライトの名前（表示順）'),
      })
      .strict(),
    limits: lengthLimits,
    references: accountRefs,
    _note: doc(),
    businessSuite: z.object({ assetId: z.string().regex(/^\d+$/, '数字だけ').describe('プランナーの URL に付く asset_id（公開 id・秘密ではない）。ログイン済み判定に使う'), _note: doc().optional() }).strict(),
  })
  .strict()
  .superRefine(checkProfileLengths)
  .meta({ title: 'Instagram のアカウントとプロフィール' });

// ---- X の引用リポスト（config/x-repost.json） ----------------------------------------------------------------

const hashtag = z.string().regex(/^#\S+$/, '# で始まる 1 語');

export const ConfigXRepost = z
  .object({
    schemaVersion: schemaVersion1,
    _comment: doc(),
    maxPerRun: z.number().int().positive().describe('1 回の実行で引用リポストする最大件数'),
    _maxPerRun_note: doc().optional(),
    minDelaySec: z.number().int().min(0).describe('引用リポストの間のランダム待機の下限（秒）'),
    maxDelaySec: z.number().int().min(0).describe('同上限（秒）'),
    _delay_note: doc().optional(),
    maxCandidates: z.number().int().positive().describe('discover が集める候補の最大数'),
    _maxCandidates_note: doc().optional(),
    handleCooldownDays: z.number().int().min(0).describe('同じハンドルをリポストする間隔（日）'),
    _handleCooldownDays_note: doc().optional(),
    queries: z
      .array(
        z
          .object({
            exam: z.string().min(1).describe('試験の区分（baseTags のキー）'),
            q: z.string().min(1).describe('X の検索語'),
            minFaves: z.number().int().min(0).describe('最低のいいね数'),
          })
          .strict(),
      )
      .min(1)
      .describe('候補を探す検索'),
    _query_note: doc().optional(),
    blocklist: z
      .object({
        handles: z.array(z.string().min(1)).describe('リポストしない相手のハンドル（@ なし）'),
        _handles_note: doc().optional(),
        bannedKeywords: z.array(z.string().min(1)).describe('本文に含まれたら候補から除くキーワード'),
        _bannedKeywords_note: doc().optional(),
      })
      .strict(),
    baseTags: z.record(z.string().min(1), z.array(hashtag).min(1)).describe('試験の区分ごとのハッシュタグ'),
    _baseTags_note: doc().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.minDelaySec > v.maxDelaySec) flag(ctx, ['minDelaySec'], '待機の下限が上限を超えている');
  })
  .meta({ title: 'X の引用リポストの設定' });

// ---- キャラクター素材（config/character-poses.json） -----------------------------------------------------------

const vocabulary = z.record(z.string().regex(/^[a-z0-9-]+$/), z.string().min(1));
const box = z
  .tuple([z.number(), z.number(), z.number(), z.number()])
  .describe('原画像に対する切り取り範囲 [x, y, 幅, 高さ]（0〜1 の割合）');
const frameVariant = z.object({ box: box.nullable().describe('切り取り範囲。full 以外は切り取らない（null）こともある'), note: z.string().min(1) }).strict();
const poseSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'kebab-case');
const reviewedAt = jstDate('確認日');

const CharacterPose = z
  .object({
    slug: poseSlug.describe('ポーズの id（ポーズ内容の kebab-case）'),
    file: z.string().regex(/^[a-z0-9-]+\.png$/, '小文字・数字・ハイフンの .png').describe('素材の画像ファイル名'),
    framing: z
      .object({
        source: z.object({ width: pixels('原画像の幅'), height: pixels('原画像の高さ'), sha256 }).strict().describe('切り取りの元にした原画像'),
        reviewedAt,
        variants: z.object({ full: frameVariant, waist: frameVariant, bust: frameVariant }).strict().describe('全身・腰上・胸上の切り取り'),
      })
      .strict()
      .optional(),
    label: z.string().min(1).describe('管理画面に出る名前'),
    category: z.string().min(1).describe('分類（categories のどれか）'),
    beats: z.array(z.string().min(1)).min(1).describe('台本の流れのどこで使うか（beats のどれか）'),
    verified: z.boolean().describe('実画像を目視確認済みか'),
    siteCta: z.boolean().optional().describe('サイトの note ヒーロー CTA で使うポーズか（配信するポーズの正本）'),
    composition: z
      .object({
        uses: z.array(z.string().min(1)).min(1).describe('用途（catalog.uses のキー）'),
        facing: z.string().min(1).describe('体の向き（catalog.facings のキー）'),
        gestureDirection: z.string().min(1).describe('ジェスチャーの向き（catalog.gestures のキー）'),
        placements: z.array(z.string().min(1)).min(1).describe('画面での置き場所（catalog.placements のキー）'),
        crops: z.array(z.string().min(1)).min(1).describe('使える切り取り（catalog.crops のキー）'),
        note: z.string().min(1),
        reviewedAt,
      })
      .strict()
      .optional(),
    quality: z.object({ status: z.string().min(1).describe('画像品質の状態（catalog.qualities のキー）'), note: z.string().min(1), reviewedAt }).strict().optional(),
  })
  .strict();

export const ConfigCharacterPoses = z
  .object({
    schemaVersion: schemaVersion1,
    character: z.string().min(1).describe('キャラクターの id'),
    spec: repoPath('キャラクター仕様'),
    policy: repoPath('素材の運用方針'),
    assetsDir: repoPath('素材ディレクトリ'),
    identity: z
      .object({
        name: z.string().min(1),
        age: z.string().min(1),
        helmetText: z.string().min(1),
        voicevoxSpeaker: z.number().int().min(0).describe('VOICEVOX の話者 id'),
        brandColors: z.object({ main: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).min(1), sub: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).min(1) }).strict().describe('ブランド色（16 進）。main[0] が紺背景・sub[0] が紙の背景'),
      })
      .strict(),
    naming: doc(),
    categories: z.array(z.string().min(1)).min(1).describe('ポーズの分類'),
    beats: z.array(z.string().min(1)).min(1).describe('台本の流れ'),
    siteCta: doc(),
    poses: z.array(CharacterPose).min(1).superRefine(uniqueBy('slug', 'ポーズ')),
    sourceGrids: z.array(z.string().min(1)).describe('ポーズを切り出した元のグリッド画像'),
    catalog: z
      .object({
        uses: vocabulary.describe('用途の語彙（キー → 表示名）'),
        facings: vocabulary.describe('体の向きの語彙'),
        gestures: vocabulary.describe('ジェスチャーの向きの語彙'),
        placements: vocabulary.describe('置き場所の語彙'),
        crops: vocabulary.describe('切り取りの語彙'),
        qualities: vocabulary.describe('画像品質の語彙'),
      })
      .strict(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const has = (vocab, key) => Object.hasOwn(vocab, key);
    v.poses.forEach((p, i) => {
      const at = (...path) => ['poses', i, ...path];
      if (!v.categories.includes(p.category)) flag(ctx, at('category'), `分類「${p.category}」が categories に無い`);
      p.beats.forEach((b, j) => !v.beats.includes(b) && flag(ctx, at('beats', j), `「${b}」が beats に無い`));
      const q = p.quality;
      if (q && !has(v.catalog.qualities, q.status)) flag(ctx, at('quality', 'status'), `「${q.status}」が catalog.qualities に無い`);
      const c = p.composition;
      if (c) {
        for (const [field, vocab] of [['uses', 'uses'], ['placements', 'placements'], ['crops', 'crops']]) {
          c[field].forEach((k, j) => !has(v.catalog[vocab], k) && flag(ctx, at('composition', field, j), `「${k}」が catalog.${vocab} に無い`));
        }
        if (!has(v.catalog.facings, c.facing)) flag(ctx, at('composition', 'facing'), `「${c.facing}」が catalog.facings に無い`);
        if (!has(v.catalog.gestures, c.gestureDirection)) flag(ctx, at('composition', 'gestureDirection'), `「${c.gestureDirection}」が catalog.gestures に無い`);
      }
      for (const [kind, variant] of Object.entries(p.framing?.variants ?? {})) {
        const b = variant.box;
        if (!b) {
          if (kind === 'full') flag(ctx, at('framing', 'variants', kind, 'box'), 'full は切り取らない（null にできない）');
          continue;
        }
        const [x, y, w, h] = b;
        if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1 || y + h > 1) flag(ctx, at('framing', 'variants', kind, 'box'), '切り取り範囲が画像の外');
        if (kind === 'full' && b.join(',') !== '0,0,1,1') flag(ctx, at('framing', 'variants', kind, 'box'), 'full は原画像全体（0,0,1,1）');
      }
    });
  })
  .meta({ title: 'キャラクター素材のポーズと命名' });

// ---- 動画（config/video-brand.json・video-content.json・youtube-*.json） ---------------------------------------

const videoAsset = z
  .object({
    path: z.string().min(1).describe('画像のパス（リポジトリ相対）'),
    sha256: sha256.describe('画像の SHA-256。読み込み時に実体と照合する'),
    width: pixels('幅'),
    height: pixels('高さ'),
  })
  .strict();

export const ConfigVideoBrand = z
  .object({
    schemaVersion: schemaVersion1,
    design: z.string().min(1).describe('採用したブランドデザインの名前（読み込み時に既知の名前か検査される）'),
    adoptedAt: jstDate('採用日'),
    logo: videoAsset.describe('ロゴ（透過 PNG）'),
    longformBackground: videoAsset.describe('長尺動画の背景'),
    shorts: videoAsset.describe('ショート動画の CTA 画面'),
    shortsNarration: z.string().min(1).describe('ショート動画の最後に読む CTA のナレーション'),
  })
  .strict()
  .meta({ title: '動画のブランド' });

export const ConfigYoutubeDelivery = z
  .object({
    schemaVersion: schemaVersion1,
    enabled: z.boolean().describe('YouTube への配信を動かすか'),
    planSha256: sha256.describe('配信計画（非公開ストレージの plans/<sha>.json）の SHA-256。実体と照合する'),
    dailyLimits: z
      .object(
        Object.fromEntries(
          ['upload', 'audit', 'thumbnail', 'activate', 'delete', 'schedule'].map((phase) => [phase, z.number().int().min(0).max(100).describe(`${phase} の 1 日の上限回数（0〜100）`)]),
        ),
      )
      .strict()
      .describe('工程ごとの 1 日の上限（YouTube API のクォータ）'),
    deleteOldVersions: z.boolean().describe('差し替え後に旧版の動画を削除するか'),
  })
  .strict()
  .meta({ title: 'YouTube 配信の設定' });

export const ConfigYoutubeProductionDisclosure = z
  .object({
    schemaVersion: schemaVersion1,
    profile: z.string().min(1).describe('制作の開示の区分（author-led-ai-assisted など）'),
    containsSyntheticMedia: z.boolean().describe('YouTube の「合成メディアを含む」の申告'),
    authorityNotice: z.string().min(1).describe('動画の説明欄に入れる制作の開示文'),
  })
  .strict()
  .meta({ title: 'YouTube の制作の開示' });

const durationRange = (extra = {}) => z.object({ min: count('最小の秒数'), max: count('最大の秒数'), ...extra }).strict();
const canvasSpec = z.object({ ratio: z.string().regex(/^\d+:\d+$/), render: z.tuple([pixels('幅'), pixels('高さ')]) }).strict();
const stringList = (what) => z.array(z.string().min(1)).min(1).describe(what);

export const ConfigVideoContent = z
  .object({
    $schema: z.string().optional(),
    schemaVersion: schemaVersion1,
    description: doc(),
    updated: jstDate('最終更新日'),
    paths: z.object({ packsRoot: repoPath('動画パックを置くディレクトリ'), stateFile: repoPath('動画パックの状態ファイル') }).strict(),
    manifest: z
      .object({
        schemaVersion: z.number().int().positive().describe('video-pack.json の版（パック側の schemaVersion と一致が必須）'),
        requiredFields: stringList('video-pack.json の必須の欄'),
        packIdPattern: regexString('packId の形'),
        painPromiseMaxChars: z.number().int().positive().describe('pain・promise の字数の目安（超えると警告）'),
        examEnum: stringList('exam に書ける資格 id'),
        intentEnum: stringList('intent に書ける値'),
        outputsKeys: stringList('outputs に書ける派生物の種類'),
      })
      .strict(),
    sourceRef: z.object({ typeEnum: stringList('sourceRefs の type'), note_: doc() }).strict(),
    cta: z.object({ kindEnum: stringList('primaryCta の kind'), catalogs: z.record(z.string().min(1), repoPath('id を解決するカタログ')), note_: doc() }).strict(),
    canvas: z.object({ longform: canvasSpec, vertical: canvasSpec }).strict().describe('動画の画角（長尺 16:9・縦 9:16）'),
    storyboard: z
      .object({
        formatEnum: stringList('storyboard の format'),
        captionMaxChars: z.number().int().positive().describe('字幕 1 つの最大字数'),
        durationSeconds: z
          .object({
            longform: durationRange(),
            shorts: durationRange({ recommendedMin: count('推奨の最小秒数'), recommendedMax: count('推奨の最大秒数') }),
          })
          .strict(),
        note_: doc(),
      })
      .strict(),
    verbatim: z.object({ windowChars: z.number().int().positive().describe('これだけ連続一致したら逐語転用とみなす字数'), note_: doc() }).strict(),
    forbiddenBinaryExtensions: z.array(z.string().regex(/^\.[a-z0-9]+$/, '.mp4 の形')).describe('Git に置かない動画・音声・字幕の拡張子'),
    state: z
      .object({
        schemaVersion: z.number().int().positive().describe('状態ファイルの版'),
        statusEnum: stringList('派生物の状態（進む順）'),
        transitions: z.record(z.string().min(1), z.array(z.string().min(1))).describe('状態ごとの遷移先'),
        approvalRequiredFrom: z.string().min(1).describe('この状態以降は承認者（approvedBy）が必須'),
        publishedRequires: z.array(z.string().min(1)).describe('published に要る実体（url|videoId は「どちらか」）'),
        shortsPublishedRequires: z.array(z.string().min(1)),
        derivativeKeys: stringList('状態を持つ派生物の種類'),
        note_: doc(),
      })
      .strict(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const s = v.state;
    const statuses = new Set(s.statusEnum);
    if (statuses.size !== s.statusEnum.length) flag(ctx, ['state', 'statusEnum'], '状態が重複');
    for (const st of s.statusEnum) if (!(st in s.transitions)) flag(ctx, ['state', 'transitions'], `状態「${st}」の遷移が書かれていない`);
    for (const [from, tos] of Object.entries(s.transitions)) {
      if (!statuses.has(from)) flag(ctx, ['state', 'transitions', from], `状態「${from}」が statusEnum に無い`);
      tos.forEach((to, i) => !statuses.has(to) && flag(ctx, ['state', 'transitions', from, i], `遷移先「${to}」が statusEnum に無い`));
    }
    if (!statuses.has(s.approvalRequiredFrom)) flag(ctx, ['state', 'approvalRequiredFrom'], `「${s.approvalRequiredFrom}」が statusEnum に無い`);
    const d = v.storyboard.durationSeconds;
    if (d.longform.min > d.longform.max) flag(ctx, ['storyboard', 'durationSeconds', 'longform'], '最小が最大を超えている');
    if (d.shorts.min > d.shorts.max) flag(ctx, ['storyboard', 'durationSeconds', 'shorts'], '最小が最大を超えている');
    if (!(d.shorts.min <= d.shorts.recommendedMin && d.shorts.recommendedMin <= d.shorts.recommendedMax && d.shorts.recommendedMax <= d.shorts.max)) {
      flag(ctx, ['storyboard', 'durationSeconds', 'shorts'], '推奨の範囲が許す範囲（min〜max）に収まっていない');
    }
    for (const k of Object.keys(v.cta.catalogs)) if (!v.cta.kindEnum.includes(k)) flag(ctx, ['cta', 'catalogs', k], `「${k}」が kindEnum に無い`);
  })
  .meta({ title: '動画パックの契約' });

// ---- 参考文献（config/reference-sources.json） ----------------------------------------------------------------

const ReferenceClass = z
  .object({
    label: z.string().min(1),
    verbatim: z.enum(['allowed', 'question-only', 'short-quote', 'forbidden']).describe('逐語転載の可否'),
    figureReuse: z.boolean().describe('図を流用してよいか'),
    transcriptPublic: z.boolean().nullable().describe('文字起こしを公開してよいか。null は原本ごとに決める'),
    citation: z.enum(['page', 'title-url', 'section', 'title', 'name']).describe('出典を書く粒度'),
    note: z.string().min(1),
  })
  .strict();

const ReferenceOrigin = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('drive'), vaultDir: z.string().min(1).describe('Drive vault の中のディレクトリ') }).strict(),
  z.object({ kind: z.literal('catalog'), catalog: repoPath('公的基準の catalog.json') }).strict(),
  z.object({ kind: z.literal('external'), url: z.url().optional().describe('公開元の URL') }).strict(),
  z.object({ kind: z.literal('none').describe('原本を持たない') }).strict(),
]);

const BookBundle = z
  .object({
    directory: z.string().min(1).describe('書籍バンドルのディレクトリ名'),
    transcriptDir: z.string().startsWith('content/sources/').describe('文字起こしの置き場（リポジトリ相対）'),
    renderProfile: z.looseObject({ mode: z.string().min(1).describe('ページ画像の作り方（pdfimages-auto-spread など）') }).describe('ページ画像・OCR の設定（作り方ごとに欄が違う）'),
    sourceFiles: z
      .array(z.looseObject({ order: z.number().int().positive().describe('並び順'), originalName: z.string().min(1).describe('原本の元のファイル名') }))
      .min(1)
      .describe('原本の PDF（巻ごと）'),
  })
  .strict();

const ReferenceSource = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'kebab-case').describe('参考文献の id。記事の frontmatter sources: はこの id で指す'),
    title: z.string().min(1),
    shortTitle: z.string().min(1).optional().describe('サイドバーの短い表示名'),
    shelf: z.string().min(1).optional().describe('教材一覧の棚'),
    class: z.string().min(1).describe('区分（classes のキー）。使い方の可否を決める'),
    origin: ReferenceOrigin,
    transcriptDir: z.string().startsWith('content/sources/').optional().describe('既存配置の文字起こしの置き場'),
    transcriptVaultDir: z.string().min(1).optional().describe('Drive vault に留める文字起こしの置き場'),
    bookBundle: BookBundle.optional(),
    vaultCopies: z
      .array(
        z
          .object({
            path: z.string().startsWith('原資料PDF/').describe('Drive vault の中のパス（台帳 drive-manifest に載っていること。版はファイル名が持つ）'),
          })
          .strict(),
      )
      .min(1)
      .optional()
      .describe('公開元から取得して Drive vault に置いた写し（白書など）。図の切り出し直しの原典候補になる'),
    appliesTo: z.array(z.string().startsWith('content/')).optional().describe('この原本から作った記事の glob。一致する記事は sources が必須'),
    aliases: z.record(z.string().min(1), z.string().min(1)).optional().describe('移行前の書名 → 正しい参照（id か id#詳細）'),
    notes: z.string().min(1).optional(),
  })
  .strict();

export const ConfigReferenceSources = z
  .object({
    schemaVersion: schemaVersion1,
    description: doc(),
    invariants: z.array(z.string().min(1)).min(1).describe('運用の約束（人が読む）'),
    classes: z.record(z.string().regex(/^[a-z0-9-]+$/), ReferenceClass).describe('区分ごとの扱い'),
    sources: z.array(ReferenceSource).min(1).superRefine(uniqueBy('id', 'id')),
  })
  .strict()
  .superRefine((v, ctx) => {
    v.sources.forEach((s, i) => {
      if (!(s.class in v.classes)) flag(ctx, ['sources', i, 'class'], `区分「${s.class}」が classes に無い`);
    });
  })
  .meta({ title: '参考文献の区分と扱い' });
