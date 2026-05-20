/**
 * 台本 + 各 wav の duration から ASS 字幕ファイルを生成。
 *
 * ASS（Advanced SubStation Alpha）形式を採用:
 *   - ffmpeg `-vf subtitles=*.ass` で焼き込み可能
 *   - PlayRes（解像度）と Style（フォント・サイズ・色）を自前定義できる
 *   - .srt より表現力が高い（縁取り・配置・フォント指定）
 *
 * 設計:
 *   - 1 スライド = 1 dialogue 行
 *   - 表示時間は各 wav の duration の累積
 *   - スタイル: Noto Sans JP Bold, 48px, 白文字 + 黒縁取り 4px, 下部中央（MarginV=200）
 *
 * 改行方針（重要）:
 *   WrapStyle 2 = libass の自動折り返しを無効化し、台本側で挿入した \n / \N だけで改行する。
 *   libass の自動折り返しは日本語の禁則処理・文節境界を考慮せず語中で切れるため、
 *   呼び出し側（yt-shorts-create.mjs）が budoux で文節単位に改行を入れた scripts を渡す前提。
 */

const DEFAULT_OPTIONS = {
  width: 1080,
  height: 1920,
  fontName: 'Noto Sans JP',
  fontSize: 48,
  marginV: 200, // 下端から 200px 上
  outlineWidth: 4,
};

/**
 * @param {object} args
 * @param {string[]} args.scripts   - 各スライドの台本テキスト
 * @param {number[]} args.durations - 各 wav の duration（秒）
 * @param {object}   [args.options]
 * @returns {string} ASS ファイル内容
 */
export function buildSubtitle({ scripts, durations, options = {} }) {
  if (!Array.isArray(scripts)) throw new Error('scripts must be an array');
  if (!Array.isArray(durations)) throw new Error('durations must be an array');
  if (scripts.length !== durations.length) {
    throw new Error(
      `scripts and durations length mismatch: ${scripts.length} vs ${durations.length}`
    );
  }
  for (const d of durations) {
    if (typeof d !== 'number' || d <= 0 || !Number.isFinite(d)) {
      throw new Error(`duration must be a positive finite number, got ${d}`);
    }
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  let acc = 0;
  const dialogues = scripts.map((text, i) => {
    const start = acc;
    const end = acc + durations[i];
    acc = end;
    return `Dialogue: 0,${formatTime(start)},${formatTime(end)},Default,,0,0,0,,${escapeText(text)}`;
  });

  // ASS の色形式: &H00BBGGRR
  // 白文字: &H00FFFFFF, 黒縁取り: &H00000000
  const styleLine = [
    'Style: Default',
    opts.fontName,
    opts.fontSize,
    '&H00FFFFFF', // PrimaryColour（白）
    '&H000000FF', // SecondaryColour
    '&H00000000', // OutlineColour（黒）
    '&H00000000', // BackColour
    1, // Bold
    0, // Italic
    0, // Underline
    0, // StrikeOut
    100, // ScaleX
    100, // ScaleY
    0, // Spacing
    0, // Angle
    1, // BorderStyle（1 = outline + drop shadow）
    opts.outlineWidth, // Outline
    0, // Shadow
    2, // Alignment（2 = bottom-center）
    40, // MarginL
    40, // MarginR
    opts.marginV, // MarginV（下端からの距離）
    1, // Encoding
  ].join(',');

  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${opts.width}`,
    `PlayResY: ${opts.height}`,
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    'YCbCr Matrix: TV.601',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    styleLine,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...dialogues,
    '',
  ].join('\n');
}

/**
 * 秒 → ASS の時刻形式（h:mm:ss.cs、cs はセンチ秒 = 1/100 秒）
 */
export function formatTime(seconds) {
  if (seconds < 0) seconds = 0;
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;
  const ssStr = ss.toFixed(2).padStart(5, '0'); // "00.00" 〜 "59.99"
  return `${hh}:${String(mm).padStart(2, '0')}:${ssStr}`;
}

/**
 * ASS の Text フィールドで使うエスケープ。
 * - 改行: \n → \N
 * - 中括弧（オーバーライドタグ）: { → \{, } → \}
 */
function escapeText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\N')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}
