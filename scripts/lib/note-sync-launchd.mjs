/** Persistent entrypoint for the existing note sync job and its bounded daily catch-up. */
const shellQuote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export function validateCatchUpUntil(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString() !== `${value}T00:00:00.000Z`) {
    throw new Error('--catch-up-until は実在する YYYY-MM-DD で指定する');
  }
  return value;
}

export function renderNoteSyncBootstrap(repoRoot, catchUpUntil = '') {
  validateCatchUpUntil(catchUpUntil);
  return `#!/bin/bash
set -euo pipefail
export PATH="$HOME/.local/bin:/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export DOBOKU_NOTE_SYNC_REPO=${shellQuote(repoRoot)}
# The extra daily starts expire; manual invocations and the normal Sunday run remain available.
if [ "\${1:-}" = '--scheduled' ]; then
  until=${shellQuote(catchUpUntil)}
  today="$(TZ=Asia/Tokyo date +%F)"
  weekday="$(TZ=Asia/Tokyo date +%w)"
  if [ "$weekday" != 0 ] && { [ -z "$until" ] || [[ "$today" > "$until" ]]; }; then
    echo "[note-sync] catch-up expired: $until; next run is Sunday"
    exit 0
  fi
  shift
fi
# Read the committed runner without changing the primary checkout or its index.
git -C "$DOBOKU_NOTE_SYNC_REPO" fetch -q origin develop
runner="$(mktemp)"
trap 'rm -f "$runner"' EXIT
git -C "$DOBOKU_NOTE_SYNC_REPO" show origin/develop:scripts/scheduled/note-sync.sh > "$runner"
/bin/bash "$runner" "$@"
`;
}

export function renderNoteSyncPlist(template, { repoRoot, homeDir, bootstrapPath, catchUpUntil = '' }) {
  validateCatchUpUntil(catchUpUntil);
  return template.replaceAll('__REPO__', xml(repoRoot)).replaceAll('__HOME__', xml(homeDir)).replaceAll('__BOOTSTRAP__', xml(bootstrapPath))
    .replace('__WEEKDAY__', catchUpUntil ? '' : '<key>Weekday</key>\n        <integer>0</integer>');
}
