#!/usr/bin/env node

// npm run admin — 運営管理画面 Next.js 版（ローカル専用・http://127.0.0.1:3021・計測/エージェント/スキル/ギャラリー/SNS状態/記事/売上/品質/ジョブ/TODO/**プロジェクト**\/**ライフサイクル横断 `/content/lifecycle`**\/**動画パック `/content/video`**・tools/admin-app）

import { execSync } from 'child_process';
import { platform } from 'os';

const port = process.argv[2] || '3020';
const isWindows = platform() === 'win32';

try {
  if (isWindows) {
    // Windows: netstat + taskkill
    const output = execSync('netstat -ano', { encoding: 'utf8' });
    const pids = new Set();

    for (const line of output.split('\n')) {
      if (line.includes(`:${port}`) && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(pid)) {
          pids.add(pid);
        }
      }
    }

    if (pids.size === 0) {
      console.log(`✅ Port ${port} is free.`);
      process.exit(0);
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'inherit' });
        console.log(`✅ Killed PID ${pid} on port ${port}`);
      } catch (err) {
        console.log(`⚠️  Could not kill PID ${pid}: ${err.message}`);
      }
    }
  } else {
    // macOS / Linux: lsof + kill
    let output;
    try {
      output = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim();
    } catch {
      // lsof returns exit code 1 when no process found
      console.log(`✅ Port ${port} is free.`);
      process.exit(0);
    }

    if (!output) {
      console.log(`✅ Port ${port} is free.`);
      process.exit(0);
    }

    const pids = output.split('\n').filter(Boolean);
    for (const pid of pids) {
      try {
        execSync(`kill -9 ${pid}`);
        console.log(`✅ Killed PID ${pid} on port ${port}`);
      } catch (err) {
        console.log(`⚠️  Could not kill PID ${pid}: ${err.message}`);
      }
    }
  }

  // Give OS time to release the port
  await new Promise(r => setTimeout(r, 1000));
  console.log(`✅ Port ${port} is now ready for use.`);
} catch (err) {
  console.log(`✅ Port ${port} appears to be free.`);
  process.exit(0);
}
