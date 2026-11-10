/**
 * kindle-pop-cover.mjs — Kindle の POP 表紙（文字まで画像生成で描く）の生成指示を、表紙 spec の pop と共通ルールから組み立てる。
 * 先生の特徴・画風・文字の禁止事項は config/image-generation.json（loadImageRules）から読み、ここへ書かない。
 * 2026-11-10 に C 系 12 冊で承認した型（運営者が c-05 の見本を承認）を、全 Kindle 本の表紙の唯一の作り方にする。
 */

/** spec.pop の必須の文言。どれかが欠けたら生成しない（推測で埋めない） */
export const POP_REQUIRED = ['exam', 'kicker', 'title', 'badge', 'redBand', 'navyBand', 'scene', 'reference']

/** 最下部の帯の既定（運営者の肩書き。正本は src/config/author.ts） */
export const DEFAULT_FOOTER = '技術士（総合技術監理部門）が制作'

/** 既定のポーズ（承認済みの C 系と同じ） */
export const DEFAULT_POSE = '本を持って読者に指さすポーズ'

/** spec.pop の欠けを返す（空なら合格） */
export function popErrors(pop) {
  if (!pop || typeof pop !== 'object') return ['spec に pop が無い']
  const errors = POP_REQUIRED.filter((key) => pop[key] == null || pop[key] === '').map((key) => `pop.${key} が無い`)
  if (pop.badge != null && (!Array.isArray(pop.badge) || pop.badge.length !== 2 || pop.badge.some((s) => !s))) errors.push('pop.badge は [上段, 下段] の 2 つ')
  return errors
}

/** 表紙に描く文字の全部（目視の照合表に使う） */
export function popTexts(pop) {
  return [pop.kicker, pop.title, pop.titleSub, ...(pop.badge ?? []), pop.redBand, pop.navyBand, pop.footer ?? DEFAULT_FOOTER].filter(Boolean)
}

/**
 * 生成指示の全文。
 * @param {object} pop 表紙 spec の pop
 * @param {{ teacher: { identity: string, body: string }, popStyle: string, textRule: string, formats: { kindle: { frame: string } } }} rules loadImageRules() の戻り値
 * @param {string} palette examPalette(pop.exam) の戻り値（「主色 #xxx と濃色 #yyy」）
 */
export function buildKindlePopPrompt(pop, rules, palette) {
  const errors = popErrors(pop)
  if (errors.length) throw new Error(errors.join(' / '))
  const [badgeTop, badgeBottom] = pop.badge
  return [
    '添付の承認済みKindle表紙をデザインの参照に、doboku-noteの資格学習用POP表紙を作る。',
    rules.formats.kindle.frame,
    `最上部の小さな帯: 「${pop.kicker}」。`,
    pop.titleSub
      ? `最も大きく見せる題名: 「${pop.title}」。その下に大きく「${pop.titleSub}」。`
      : `最も大きく見せる題名: 「${pop.title}」。`,
    `年度や分量を目立たせる大きな丸い印（黄色地に資格の濃色の極太文字・太い輪郭）: 上段「${badgeTop}」、下段に特大で「${badgeBottom}」。`,
    `赤い帯に白の極太文字: 「${pop.redBand}」。`,
    `補足の帯（資格の濃色の地に黄色文字）: 「${pop.navyBand}」。`,
    `最下部の黄色の帯に資格の濃色の文字: 「${pop.footer ?? DEFAULT_FOOTER}」。`,
    `文字列は上記の指定どおりだけ。${rules.textRule}評価の星も入れない。`,
    `${rules.popStyle}資格の色は${palette}。`,
    `背景は${pop.scene}の明るいイラストで、四辺まで連続させる。下半分を絵で埋めすぎず、文字と印を大きくする。`,
    `参照画像の先生を右側に大きく、${pop.pose ?? DEFAULT_POSE}で描く。${rules.teacher.identity}${rules.teacher.body}丸い印と人物の顔を重ねない。`,
  ].join('\n')
}

/** 生成された原本の縦横比が Kindle（5:8）から 1% 以内か。外れたら引き伸ばさずに作り直す */
export function kindleRatioOk(width, height, target = { width: 1600, height: 2560 }) {
  const want = target.width / target.height
  return Math.abs(width / height - want) / want <= 0.01
}
