#!/usr/bin/env node

import { execSync } from 'child_process';

const port = process.argv[2] || '3020';

try {
  const output = execSync('netstat -ano', { encoding: 'utf8' });
  const pids = new Set();

  // Parse netstat output to find PIDs listening on the target port
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

  // Kill each PID
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'inherit' });
      console.log(`✅ Killed PID ${pid} on port ${port}`);
    } catch (err) {
      // Process might already be dead
      console.log(`⚠️  Could not kill PID ${pid}: ${err.message}`);
    }
  }

  // Give OS time to release the port
  await new Promise(r => setTimeout(r, 1000));
  console.log(`✅ Port ${port} is now ready for use.`);
} catch (err) {
  // netstat failed or port not in use
  console.log(`✅ Port ${port} appears to be free.`);
  process.exit(0);
}
