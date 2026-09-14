#!/usr/bin/env node
// Compatibility entry: the shared cleaner owns scope, retention and protection.
import { pathToFileURL } from 'node:url';
import { cleanMain } from './local-resource-clean.mjs';
export function pruneTmp({ commit = false, ...options } = {}) {
  return cleanMain(['--category', 'scratch', ...(commit ? ['--commit'] : [])], options);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!pruneTmp({ commit: process.argv.includes('--commit') }).complete) process.exitCode = 2;
}
