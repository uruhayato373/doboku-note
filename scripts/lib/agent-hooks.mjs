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

// ---- check-gemini-cost -------------------------------------------------------------------------

const GEMINI_BILLING = /ogp-backgrounds|generate-ogp-backgrounds|:generateContent|:predict|generativelanguage\.googleapis\.com|(^|[^a-zA-Z-])gemini[\s]/;

/** Gemini の課金が発生しうるコマンドか（--dry-run は無料の確認系なので素通し） */
export function isGeminiBilling(command) {
  if (!command || command.includes('--dry-run')) return false;
  return GEMINI_BILLING.test(command);
}

export const GEMINI_ASK_PAYLOAD = {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'ask',
    permissionDecisionReason: 'Gemini は従量課金（画像 1 枚 ~$0.03-0.04）です。実行前にユーザー確認が必要（memory: gemini-cost-confirm）。--dry-run なら確認不要。',
  },
};

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
