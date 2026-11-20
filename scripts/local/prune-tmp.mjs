#!/usr/bin/env node
// Compatibility entry: the shared cleaner owns scope, retention and protection.
import { cleanMain } from './local-resource-clean.mjs';
import { isCliEntry } from '../lib/cli-run.mjs';
export function pruneTmp({ commit = false, ...options } = {}) {
  return cleanMain(['--category', 'scratch', ...(commit ? ['--commit'] : [])], options);
}
if (isCliEntry(import.meta.url)) {
  if (!pruneTmp({ commit: process.argv.includes('--commit') }).complete) process.exitCode = 2;
}
