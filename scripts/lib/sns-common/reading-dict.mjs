/**
 * VoiceVox 向け読み辞書。
 * 長いフレーズを先に置くこと（部分一致の順序保証のため）。
 */
const READING_DICT = {
  // 資格・組織名（長いものから順）
  '技術士総合技術監理部門': 'ぎじゅつしそうごうぎじゅつかんりぶもん',
  '総合技術監理部門': 'そうごうぎじゅつかんりぶもん',
  '総合技術監理': 'そうごうぎじゅつかんり',
  '技術士': 'ぎじゅつし',
  // サービス名
  'doboku-note.com': 'どぼくのーとどっとこむ',
  'doboku-note': 'どぼくのーと',
  // 単独の「要」だけを文脈付きで指定し、必要・要点・要否などの熟語を壊さない。
  '概要の要は': '概要のかなめは',
  // 試験用語（「問」を「もん」と読ませる。辞書なしだと VOICEVOX が訓読みで「かことい/ぜんとい」と誤読）
  '過去問': 'かこもん',
  '全問': 'ぜんもん',
  // 伏せ字。辞書なしだと VOICEVOX が「ゼロゼロ」と読む（2026-10-08 に audio_query で確認）
  '〇〇': 'まるまる',
  // 図解リールの実機確認で誤読した土木・計算用語
  '粗骨材': 'そこつざい',
  '細骨材': 'さいこつざい',
  '骨材': 'こつざい',
  '表面乾燥飽水': 'ひょうめんかんそうほうすい',
  '絶乾': 'ぜっかん',
  '気乾': 'きかん',
  '表乾': 'ひょうかん',
  '後視': 'こうし',
  '前視': 'ぜんし',
  '視準線': 'しじゅんせん',
  '標尺': 'ひょうしゃく',
  '野帳': 'やちょう',
  '導関数': 'どうかんすう',
  // 略語・アルファベット
  'KYT': 'けーわいてぃー',
  'BCP': 'びーしーぴー',
  'BCM': 'びーしーえむ',
  'PDCA': 'ぴーでぃーしーえー',
  'FMEA': 'えふえむいーえー',
  'HAZOP': 'はぞっぷ',
  'OEE': 'おーいーいー',
  'ECRS': 'いーしーあーるえす',
  'VE': 'ぶいいー',
  'QCD': 'きゅーしーでぃー',
  'AI': 'えーあい',
  'DX': 'でじたるとらんすふぉーめーしょん',
  'LCC': 'えるしーしー',
  'LCA': 'えるしーえー',
  'ESG': 'いーえすじー',
  'SDGs': 'えすでぃーじーず',
  'IoT': 'あいおーてぃー',
  'IT': 'あいてぃー',
  'ICT': 'あいしーてぃー',
};

// VOICEVOX は II-1 を「アイアイ、イチ」、R04 を「アールゼロヨン」と読む（2026-11-06 に audio_query で確認）
const DIGITS = ['ぜろ', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
const ROMAN = { I: 'いち', II: 'に', III: 'さん', IV: 'よん', Ⅰ: 'いち', Ⅱ: 'に', Ⅲ: 'さん', Ⅳ: 'よん' };

function readExamNotation(text) {
  return text
    // R1 は回路の抵抗、単独の I は電流にも使うので、年度と区分の形に限る
    .replace(/(?<![A-Za-z0-9])R0([1-9])(?![0-9A-Za-z])/g, (_, year) => `れいわ${DIGITS[year]}`)
    .replace(/(?<![A-Za-z])(?:III|II|IV|Ⅰ|Ⅱ|Ⅲ|Ⅳ|I(?=-\d)|(?<=科目|区分|問題|健全性)I)(?:-\d+)*(?![A-Za-z])/g, (match) => {
      const [roman, ...rest] = match.split('-');
      return [ROMAN[roman], ...rest.map((number) => DIGITS[number] ?? number)].join('の');
    });
}

/**
 * テキストに読み辞書を適用してひらがな化する。
 * @param {string} text
 * @returns {string}
 */
export function applyReadingDict(text) {
  let result = text;
  for (const [from, to] of Object.entries(READING_DICT).sort(([a], [b]) => b.length - a.length)) {
    result = result.replaceAll(from, to);
  }
  return readExamNotation(result);
}
