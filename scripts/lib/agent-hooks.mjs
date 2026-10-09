// agent-hooks（純粋ロジック）— Claude Code / Codex の hook（scripts/hooks/agent-hook.mjs）が使う判定。I/O を持たない。
//
// 2026-09-14 まで hook は .claude/hooks/*.sh と .codex/hooks/*.sh の二重実体で、Codex 側は Mac の絶対パスを
// 指していて Windows では一度も発火していなかった。check-mojibake.sh は存在しない env（$TOOL_INPUT_FILE_PATH）を
// 読んで常に no-op だった。判定をここへ集め、両ツールから `node scripts/hooks/agent-hook.mjs <name>` で呼ぶ。

/** hook の stdin JSON（Claude Code / Codex 共通の形）と env フォールバックから必要な値を取り出す */
export function parseHookInput(raw, env = {}) {
  let json = null;
  if (raw && raw.trim()) {
    try {
      json = JSON.parse(raw);
    } catch {
      json = null;
    }
  }
  const toolInput = json?.tool_input ?? {};
  const command = typeof toolInput.command === 'string' ? toolInput.command : typeof env.CLAUDE_TOOL_INPUT === 'string' ? env.CLAUDE_TOOL_INPUT : raw && !json ? raw : '';
  const filePath = typeof toolInput.file_path === 'string' ? toolInput.file_path : typeof env.TOOL_INPUT_FILE_PATH === 'string' ? env.TOOL_INPUT_FILE_PATH : '';
  return { json, command, filePath, event: json?.hook_event_name ?? '', toolName: json?.tool_name ?? '' };
}

// ---- check-mojibake ----------------------------------------------------------------------------

export function isMdxPath(p) {
  return typeof p === 'string' && /\.mdx$/i.test(p);
}

/** U+FFFD（置換文字）を含むか */
export function hasReplacementChar(text) {
  return typeof text === 'string' && text.includes('�');
}

// ---- check-stray-files -------------------------------------------------------------------------

export const STRAY_GLOBS = ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.svg', '*.tmp', '*.bak'];

/** git ls-files の出力行からリポジトリ直下（`/` を含まない）のものだけを重複なく返す */
export function strayAtRoot(lines) {
  const out = new Set();
  for (const l of lines) {
    const p = l.trim();
    if (p && !p.includes('/') && !p.includes('\\')) out.add(p);
  }
  return [...out].sort();
}

// ---- check-doc-sync（git commit 前）-------------------------------------------------------------

const RE_SKILLS = /^\.claude\/(skills|agents)\//;
const RE_REGISTRY = /^\.claude\/knowledge\/reference\/(skills-guide|skills-registry|agents-registry)\.md$/;
const RE_DECISION = /決定.*\.md$|ADR.*\.md$|^\.claude\/knowledge\/reference\/|noteコンテンツ計画\.md$|^\.claude\/skills\/.*\/SKILL\.md$/;
const RE_NEW_TOOL = /^scripts\/.*\.(mjs|mts|js|ts|cjs)$/;

/** 「git commit」を含むコマンドか（PreToolUse(Bash) で doc-sync 検査を走らせる条件） */
export function isGitCommitCommand(command) {
  return typeof command === 'string' && /\bgit\s+commit\b/.test(command);
}

/**
 * @param {Array<{status:string,path:string}>} staged `git diff --cached --name-status` の行
 * @returns {{ skillsChanged: string[], registryChanged: string[], decisionChanged: string[], newTools: string[] }}
 */
export function classifyStaged(staged) {
  const paths = staged.map((s) => s.path);
  return {
    skillsChanged: paths.filter((p) => RE_SKILLS.test(p)),
    registryChanged: paths.filter((p) => RE_REGISTRY.test(p)),
    decisionChanged: paths.filter((p) => RE_DECISION.test(p)),
    newTools: staged.filter((s) => s.status.startsWith('A') && RE_NEW_TOOL.test(s.path)).map((s) => s.path),
  };
}

/** `git diff --cached --name-status` の生テキストを {status,path}[] に */
export function parseNameStatus(text) {
  return String(text)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [status, ...rest] = line.split('\t');
      return { status: status.trim(), path: rest[rest.length - 1]?.trim() ?? '' };
    })
    .filter((s) => s.path);
}

/** doc-sync の advisory 文を組み立てる（空なら何も言わない） */
export function docSyncMessages({ skillsChanged, registryChanged, decisionChanged, newTools }, activeHandoffs = 0) {
  const out = [];
  if (skillsChanged.length && !registryChanged.length) {
    out.push(
      'WARNING: .claude/skills/ or .claude/agents/ が変更されましたが docs が未更新です。',
      '  .claude/knowledge/reference/skills-guide.md（一覧）または skills-registry.md（退役ログ）または agents-registry.md を同一 commit に含めてください。',
      '変更されたファイル:',
      ...skillsChanged.map((p) => `  ${p}`),
    );
  }
  if (decisionChanged.length) {
    out.push(
      'NOTE: 決定/ポリシー文書を変更しています。同じ決定を載せる並行SoT（ADR/skill/checklist/戦略SoT）の',
      '  横断更新を確認し、必要なら /doc-sync を回してください。',
      ...decisionChanged.map((p) => `  ${p}`),
    );
  }
  if (newTools.length) {
    out.push(
      'NOTE: 新しいスクリプト/ツールを追加しています。次を確認してください（情報構造 規律7）:',
      '  1) 既存の該当 skill SKILL.md / reference policy から参照を張る（discoverability・新旧の棲み分けも明記）',
      "  2) /doc-sync を回し『既存の案内が旧/別ツールを指したまま』の routing drift を点検",
      ...newTools.map((p) => `  ${p}`),
    );
  }
  if (activeHandoffs >= 6) {
    out.push(
      `NOTE: active handoff が ${activeHandoffs} 本あります。完了済みの退避・古い行の trim・重複の統廃合は`,
      '  /doc-declutter（機械 surfacer: npm run check-doc-lifecycle → doc-curator が処分判定）で。',
    );
  }
  return out;
}

// ---- decision-doc-checkpoint（PreCompact / SessionEnd）------------------------------------------

const RE_CHECKPOINT = /決定.*\.md$|ADR.*\.md$|^\.claude\/knowledge\/reference\/|noteコンテンツ計画\.md$|^\.claude\/(skills|agents)\/|note-magazines\.ts$/;

/** `git status --porcelain` の行から、決定/ポリシー文書の未コミット変更だけを返す */
export function decisionDocsChanged(porcelainText) {
  return String(porcelainText)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.slice(3).trim())
    .map((p) => (p.includes(' -> ') ? p.split(' -> ').pop() : p))
    .filter((p) => RE_CHECKPOINT.test(p));
}

// ---- check-capture（Stop）----------------------------------------------------------------------
//
// 「その場で直さない不具合・未確認は同じセッションで起票し、報告はカード番号で書く」（CLAUDE.md §12）を、
// 最後の報告の文面で確かめる。未確認・未対応・別途などを書いたのに DN-#### が 1 つも無ければ、
// 1 セッションに 1 回だけ終了を止めて起票を促す（2026-10-07: 未確認を報告しながら起票を忘れ、ユーザーに指摘された）。
// 言葉で判定するので誤検知はありうる。止めるのは 1 回だけで、「起票不要: 理由」を書けば通る。

/** 先送り・未確認を表す言い回し。報告に残ったら起票先（DN-####）が要る */
const CAPTURE_MARKERS = [
  /未確認/, /未検証/, /確かめていない/, /確認できていない/, /原因(?:は)?(?:まだ)?(?:不明|分かっていない|わかっていない|分からない|わからない)/,
  /未対応/, /直していない/, /手を付けていない/, /対応していない/, /別途/, /後日/, /今後の課題/, /残課題/, /スコープ外/, /範囲外/,
  /別の\s*PR\s*で/, /起票(?:していない|せず|が必要|すべき)/, /\bTODO\b/,
];

/** 文中の先送りの言い回し（重複なし・出現順） */
export function captureMarkers(text) {
  const out = [];
  for (const re of CAPTURE_MARKERS) {
    const m = String(text ?? '').match(re);
    if (m && !out.includes(m[0])) out.push(m[0]);
  }
  return out;
}

/** 起票を促すべきか: 先送りの言い回しがあり、カード番号も「起票不要」も無い */
export function needsCapture(text) {
  const t = String(text ?? '');
  if (!t.trim() || /DN-\d{4}/.test(t) || /起票不要/.test(t)) return false;
  return captureMarkers(t).length > 0;
}

/**
 * transcript（JSONL）から最後のターンの assistant の文章を取り出す。最後の利用者の発言（文字列の user。
 * tool_result は除く）より後の assistant の text を連結する。Claude Code と Codex（response_item）の両方を読む。
 */
export function finalAssistantText(jsonl) {
  let parts = [];
  for (const line of String(jsonl ?? '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    let j;
    try { j = JSON.parse(line); } catch { continue; }
    if (j.isSidechain) continue;
    // Codex: { type: 'response_item', payload: { type: 'message', role, content: [{ type: 'output_text'|'input_text', text }] } }
    const msg = j.type === 'response_item' && j.payload?.type === 'message' ? j.payload : j.message;
    const role = msg?.role ?? j.type;
    const content = msg?.content;
    if (role === 'user') {
      const isToolResult = Array.isArray(content) && content.some((c) => c?.type === 'tool_result');
      if (!isToolResult) parts = [];
      continue;
    }
    if (role !== 'assistant') continue;
    if (typeof content === 'string') parts.push(content);
    else if (Array.isArray(content)) for (const c of content) if ((c?.type === 'text' || c?.type === 'output_text') && c.text) parts.push(c.text);
  }
  return parts.join('\n');
}

/** Stop で返す block の理由（モデルへ渡る） */
export function captureReason(markers) {
  return [
    `最後の報告に「${markers.slice(0, 3).join('」「')}」とありますが、カード番号（DN-####）がありません。`,
    'その場で直さない不具合・改善・未確認は `npm run todo:add -- --title … --tier … --kind … --domain … --body-file … --commit` で起票し、報告にカード番号を書いてください（CLAUDE.md §12）。',
    '起票が要らないなら「起票不要: 理由」を 1 行書いて終えてください。このセッションで止めるのはこの 1 回だけです。',
  ].join('\n');
}
