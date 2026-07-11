// KDP 入稿メモを共通テンプレで生成する（コピペ登録用・記載漏れと表記ゆれを防ぐ）。
// 共通項（著者=doboku-note・レーベル・AI申告・カテゴリ・KDPフロー）はここに一元化。
// 各本の固有値は .claude/config/kdp-memo.json、title/subtitle/price/creditIssuer は
// scripts/kindle-specs/<id>.json から取得。出力は scripts/kindle-published/KDP入力メモ_<id>.txt。
//
// 使い方: node scripts/gen-kdp-memo.mjs e-01 d-01 d-02 ...   （複数可・省略で config 全件）

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const REPO = resolve(import.meta.dirname, '..')
// ── 共通ルール（全書籍で不変。ここを直せば全メモに反映）────────────────
const AUTHOR = 'doboku-note'
const AUTHOR_KANA = 'ドボクノート'
const AUTHOR_ROMAJI = 'doboku-note'
const LABEL = 'doboku-note 過去問シリーズ'
const LABEL_KANA = 'ドボクノート カコモンシリーズ'
const LABEL_ROMAJI = 'doboku-note Kakomon Series'
const CATEGORY = '資格・検定 ＞ 技術・工学系資格'

function memo(id, spec, d) {
  const price = spec.price
  const issuer = spec.creditIssuer || '公益社団法人 日本技術士会'
  const vol = d.volume === '' ? '（合本のため空欄、または 0）' : d.volume
  return `════════════════════════════════════════════════════════
 KDP 入稿メモ  ${id}  ${spec.title}
 （KDP の入力順どおり・上から順にコピペ）
════════════════════════════════════════════════════════

アップロードするファイル
  EPUB : ~/Downloads/kindle-${id}.epub
  表紙 : ~/Downloads/kindle-cover-${id}.jpg （1600×2560）


─────────────────────────────
【ページ1：Kindle 本の詳細】
─────────────────────────────

■ 言語
日本語

■ 本のタイトル
${spec.title}
■ タイトルのフリガナ
${d.titleKana}
■ タイトルのローマ字
${d.titleRomaji}

■ サブタイトル
${spec.subtitle}
■ サブタイトルのフリガナ
${d.subKana}
■ サブタイトルのローマ字
${d.subRomaji}

■ レーベル（オプション。付けない場合は3欄すべて空欄にする）
${LABEL}
■ レーベルのフリガナ（カタカナ）
${LABEL_KANA}
■ レーベル（ローマ字）
${LABEL_ROMAJI}

■ シリーズ名
${d.series}
■ シリーズ名のフリガナ（カタカナ）
${d.seriesKana}
■ シリーズ名（ローマ字）　※入力すると必須になる
${d.seriesRomaji}
■ シリーズの巻
${vol}

■ 版（オプション・空欄でよい）
（空欄）

■ 著者
  表示名   : ${AUTHOR}
  フリガナ : ${AUTHOR_KANA}
  ローマ字 : ${AUTHOR_ROMAJI}

■ 著者などの追加（貢献者）
（なし）

■ 内容紹介（説明文）
${d.description}

※本書は、${issuer}が実施する${spec.examName || '本試験'}の過去問題を出典とし、著者が解説・編集したものです。

■ 出版に関するさまざまな権利
「私は、この作品の著作権者であるか、または出版に必要な権利を保有しています」を選択（パブリックドメインではない）

■ AI コンテンツに関する質問
・本文（テキスト）：AI 生成を含まない →「いいえ」
・表紙画像：背景に AI 生成画像を使用（文字は後合成）→「AI 生成コンテンツを使用（画像）」＋「使用後に編集」を申告

■ キーワード（7枠）
${d.keywords.join('\n')}

■ カテゴリー
${CATEGORY}

■ 年齢範囲・学年範囲
（設定しない・空欄）


─────────────────────────────
【ページ2：Kindle 本のコンテンツ】
─────────────────────────────

■ ISBN
不要（KDP が無料の ASIN を自動付与）
■ 原稿
~/Downloads/kindle-${id}.epub をアップロード
■ 表紙
~/Downloads/kindle-cover-${id}.jpg をアップロード（自作を選択）
■ Kindle Previewer で確認（重要）
${d.previewNote}


─────────────────────────────
【ページ3：Kindle 本の価格設定】
─────────────────────────────

■ KDP セレクトへの登録
任意（独占配信＋Kindle Unlimited 対象）→ ユーザー判断
■ 出版地域
すべての地域
■ ロイヤリティと価格
・ロイヤリティプラン：70%（を選択）
・Amazon.co.jp の希望小売価格欄に入力する数字 → ${price}   （JPY・¥${price}）
・他マーケットプレイスは Amazon.co.jp 基準で自動換算（触らない）
■ 出版
設定後「Kindle 本を出版」をクリック → 審査（通常72時間以内）


─────────────────────────────
【公開後（ASIN 発番後）】ASIN を Claude に伝える → catalog.json 登録・戦略doc追記まで処理。
`
}

const cfg = JSON.parse(readFileSync(resolve(REPO, '.claude/config/kdp-memo.json'), 'utf8')).books
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(cfg)
for (const id of ids) {
  const d = cfg[id]
  if (!d) { console.error(`config に ${id} がない（.claude/config/kdp-memo.json に追記を）`); continue }
  const specPath = resolve(REPO, `scripts/kindle-specs/${id}.json`)
  if (!existsSync(specPath)) { console.error(`spec が無い: ${id}`); continue }
  const spec = JSON.parse(readFileSync(specPath, 'utf8'))
  const out = resolve(REPO, `scripts/kindle-published/KDP入力メモ_${id}.txt`)
  writeFileSync(out, memo(id, spec, d))
  console.log(`生成: ${out}`)
}
