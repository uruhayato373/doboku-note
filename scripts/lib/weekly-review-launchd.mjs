/** The installed entrypoint survives removal of the worktree used to install it. */
const shellQuote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export function renderWeeklyReviewBootstrap(repoRoot) {
  return `#!/bin/bash
set -euo pipefail
export PATH="$HOME/.local/bin:/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export DOBOKU_WEEKLY_REPO=${shellQuote(repoRoot)}
# Only Git metadata is updated; the user's checkout and index are untouched.
git -C "$DOBOKU_WEEKLY_REPO" fetch -q origin develop
runner="$(mktemp)"
trap 'rm -f "$runner"' EXIT
git -C "$DOBOKU_WEEKLY_REPO" show origin/develop:scripts/scheduled/weekly-review.sh > "$runner"
/bin/bash "$runner"
`;
}

export function renderWeeklyReviewPlist(template, { repoRoot, homeDir, bootstrapPath }) {
  return template.replaceAll('__REPO__', xml(repoRoot)).replaceAll('__HOME__', xml(homeDir)).replaceAll('__BOOTSTRAP__', xml(bootstrapPath));
}
