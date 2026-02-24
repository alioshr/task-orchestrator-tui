#!/usr/bin/env bun

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entrypoint = resolve(packageRoot, 'src/tui/index.tsx');

const child = Bun.spawn({
  cmd: [process.execPath, entrypoint, ...process.argv.slice(2)],
  cwd: packageRoot,
  stdio: ['inherit', 'inherit', 'inherit'],
  env: process.env,
});

const exitCode = await child.exited;
process.exit(exitCode);
