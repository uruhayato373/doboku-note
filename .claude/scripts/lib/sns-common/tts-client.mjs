/**
 * VOICEVOX HTTP API クライアント。
 *
 * VOICEVOX エンジン（Docker / ローカル起動）の /audio_query → /synthesis を叩いて wav バイナリを返す。
 *
 * 使用前提: VOICEVOX エンジンが起動していること
 *   docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest
 *
 * 環境変数:
 *   VOICEVOX_BASE_URL  既定: http://localhost:50021
 *   VOICEVOX_SPEAKER   既定: 1（四国めたん・ノーマル）。Issue #163 SNS-prereq C-3 で確定
 */

const DEFAULT_BASE_URL = 'http://localhost:50021';
const DEFAULT_SPEAKER = 1;

/**
 * VOICEVOX エンジンが稼働しているか確認。
 * @param {string} [baseUrl]
 * @returns {Promise<boolean>}
 */
export async function isRunning(baseUrl) {
  const url = baseUrl ?? process.env.VOICEVOX_BASE_URL ?? DEFAULT_BASE_URL;
  try {
    const res = await fetch(`${url}/version`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * テキストを VOICEVOX で合成して wav バイナリを返す。
 *
 * @param {object} args
 * @param {string} args.text                   - 合成対象テキスト
 * @param {number} [args.speaker]              - スピーカー ID（既定: env or 1）
 * @param {string} [args.baseUrl]              - VOICEVOX エンジンの URL
 * @param {object} [args.queryOverrides]       - audio_query レスポンスへの上書き（speedScale 等）
 * @returns {Promise<Buffer>}                  - WAV バイナリ
 */
export async function synthesize({ text, speaker, baseUrl, queryOverrides } = {}) {
  if (!text || typeof text !== 'string') {
    throw new Error('synthesize requires a non-empty text string');
  }
  const url = baseUrl ?? process.env.VOICEVOX_BASE_URL ?? DEFAULT_BASE_URL;
  const sp = speaker ?? Number(process.env.VOICEVOX_SPEAKER ?? DEFAULT_SPEAKER);

  const queryRes = await fetch(
    `${url}/audio_query?speaker=${sp}&text=${encodeURIComponent(text)}`,
    { method: 'POST' }
  );
  if (!queryRes.ok) {
    throw new Error(`VOICEVOX /audio_query failed: ${queryRes.status} ${queryRes.statusText}`);
  }
  const query = await queryRes.json();
  const merged = queryOverrides ? { ...query, ...queryOverrides } : query;

  const synthRes = await fetch(`${url}/synthesis?speaker=${sp}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(merged),
  });
  if (!synthRes.ok) {
    throw new Error(`VOICEVOX /synthesis failed: ${synthRes.status} ${synthRes.statusText}`);
  }
  return Buffer.from(await synthRes.arrayBuffer());
}

/**
 * 利用可能なスピーカー一覧を取得（キャラ選定の支援用）。
 * @param {string} [baseUrl]
 * @returns {Promise<Array<{name: string, styles: Array<{name: string, id: number}>}>>}
 */
export async function listSpeakers(baseUrl) {
  const url = baseUrl ?? process.env.VOICEVOX_BASE_URL ?? DEFAULT_BASE_URL;
  const res = await fetch(`${url}/speakers`);
  if (!res.ok) {
    throw new Error(`VOICEVOX /speakers failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
