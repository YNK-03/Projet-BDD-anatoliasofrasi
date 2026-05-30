import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';

const processes = [
  spawn('node', ['--watch', 'src/server/index.js'], {
    cwd: root,
    stdio: 'inherit',
    shell: isWindows
  }),
  spawn('npx', ['vite', '--host', '127.0.0.1'], {
    cwd: root,
    stdio: 'inherit',
    shell: isWindows
  })
];

const stopAll = () => {
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
};

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAll();
  process.exit(0);
});

for (const child of processes) {
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      stopAll();
      process.exit(code);
    }
  });
}
