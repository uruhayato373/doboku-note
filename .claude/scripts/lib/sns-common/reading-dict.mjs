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
  // 試験用語（「問」を「もん」と読ませる。辞書なしだと VOICEVOX が訓読みで「かことい/ぜんとい」と誤読）
  '過去問': 'かこもん',
  '全問': 'ぜんもん',
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

/**
 * テキストに読み辞書を適用してひらがな化する。
 * @param {string} text
 * @returns {string}
 */
export function applyReadingDict(text) {
  let result = text;
  for (const [from, to] of Object.entries(READING_DICT)) {
    result = result.replaceAll(from, to);
  }
  return result;
}
