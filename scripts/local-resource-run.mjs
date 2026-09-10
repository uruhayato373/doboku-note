#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as root } from './lib/repository-paths.mjs';
import { acquireLock, machineResources, GiB } from './lib/local-resources.mjs';

const args = process.argv.slice(2);
const separator = args.indexOf('--');
const command = args.slice(separator + 1);
if (separator < 0 || !command.length) throw new Error('Usage: local-resource-run.mjs [--allow-low-memory] -- <command> <args>');
const policy = JSON.parse(readFileSync(join(root, '.claude/config/local-resources.json'), 'utf8'));
const resources = machineResources(root);
if (!process.env.CI && resources.freeDiskBytes < policy.minFreeDiskGiB * GiB) throw new Error('Insufficient free disk for heavy work');
if (!process.env.CI && !args.slice(0, separator).includes('--allow-low-memory') && resources.freeMemoryBytes < policy.minFreeMemoryGiB * GiB) throw new Error('Insufficient free memory for heavy work (close unused apps first)');
const release = acquireLock(root, 'heavy-work');
const child = spawn(command[0] === 'node' ? process.execPath : command[0], command.slice(1), { cwd: root, stdio: 'inherit', windowsHide: true });
let released = false;
const finish = code => { if (!released) { released = true; release(); } process.exitCode = code; };
child.on('error', error => { console.error(error.message); finish(1); });
child.on('exit', (code, signal) => finish(signal ? 1 : (code ?? 1)));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
