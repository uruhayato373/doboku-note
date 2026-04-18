/**
 * pre-push フック設置スクリプト
 *
 * .git/hooks/pre-push に `npm test` と `npm run type-check` を走らせるフックを設置する。
 * pre-commit と異なり、push 単位での検証なので頻度は低い。fail で push をブロックする。
 *
 * Usage:
 *   npm run pre-push:install
 */

import { writeFileSync, chmodSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const HOOKS_DIR = join(".git", "hooks");
const HOOK_PATH = join(HOOKS_DIR, "pre-push");

const HOOK_CONTENT = `#!/bin/sh
# Pre-push hooks
# Installed by: npm run pre-push:install

echo "[pre-push] Running type-check..."
npm run type-check
if [ $? -ne 0 ]; then
  echo "[pre-push] type-check failed. Fix errors before pushing."
  exit 1
fi

echo "[pre-push] Running tests..."
npm test
if [ $? -ne 0 ]; then
  echo "[pre-push] tests failed. Fix failures before pushing."
  exit 1
fi

echo "[pre-push] OK"
`;

if (!existsSync(HOOKS_DIR)) {
  mkdirSync(HOOKS_DIR, { recursive: true });
}

if (existsSync(HOOK_PATH)) {
  console.log(`Existing pre-push hook found at ${HOOK_PATH}.`);
  console.log("Overwriting with type-check + test hook.");
}

writeFileSync(HOOK_PATH, HOOK_CONTENT, { mode: 0o755 });

try {
  chmodSync(HOOK_PATH, 0o755);
} catch {
  // Ignore chmod errors on Windows
}

console.log(`✓ pre-push hook installed at ${HOOK_PATH}`);
console.log("  type-check + tests will run before each push.");
