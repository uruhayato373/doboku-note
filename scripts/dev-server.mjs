import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nextBin = resolve(repoRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const mediaServer = resolve(repoRoot, 'scripts', 'local-media-server.mjs');
const children = new Set();
let stopping = false;

function start(args) {
  const child = spawn(process.execPath, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  });
  children.add(child);
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (stopping) return;
    stopping = true;
    for (const other of children) other.kill('SIGTERM');
    process.exitCode = signal ? 1 : (code ?? 1);
  });
  return child;
}

start([mediaServer]);
start([nextBin, 'dev', '-p', '3020']);

function stop(signal) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill(signal);
}

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
