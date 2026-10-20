// category（フルslug）→ OGP のテーマ色キー（note-cover-tokens.json の exams のキー）。
// ogp-create（描画）と check-home-exam-coverage（網羅の検査）が同じ表を読むために切り出した（DN-0786）。
// 色そのものは note-cover-tokens.json の base が真実源で、ここは対応だけを持つ（色は重複させない）。
// 表に無いカテゴリは枠色なしで出荷されるので、categories.json の表示中のカテゴリは全部ここに要る
// （2026-10-20 に測量士・舗装が漏れて枠色なしで出ていた）。
export const CATEGORY_TO_EXAM_KEY = Object.freeze({
  'pe-comprehensive-management': 'pe-comprehensive',
  'civil-construction-1': 'civil-1',
  'civil-construction-2': 'civil-2',
  'concrete-engineer': 'concrete-engineer',
  'concrete-chief-engineer': 'concrete-chief',
  'concrete-diagnostician': 'concrete-diagnosis',
  rccm: 'rccm',
  'pe-construction': 'pe-construction',
  'pe-first-stage': 'pe-comprehensive',
  surveyor: 'surveyor',
  pavement: 'pavement',
  // 資格に紐づかない実務カテゴリ。`common`（土木・建設 共通・bronze）を明示的に指す。
  // 背景画像は backgrounds/common.* が無いためオフホワイトへフォールバックする（意図どおり）。
  'civil-practice': 'common',
});
