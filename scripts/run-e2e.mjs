import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const cli = fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url));
const server = await createServer({
  root,
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
  logLevel: 'error',
});

let exitCode = 1;
try {
  await server.listen();
  exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'test'], {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
} finally {
  await server.close();
}

process.exitCode = exitCode;
