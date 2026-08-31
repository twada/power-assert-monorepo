import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..', '..');

describe('sync hooks registered via module.registerHooks', () => {
  // Unlike module.register(), sync hooks also intercept CJS require() calls.
  // On that path Node.js does not provide `importAttributes` in the load context,
  // so hooks must not assume its presence.
  // see: https://github.com/twada/power-assert-monorepo/blob/main/docs/adr-013-sync-hooks-importattributes-hardening.md
  test('CJS require() of a builtin module after hooks registration does not crash', () => {
    const args: string[] = [];
    if (process.execArgv.includes('--conditions=power-assert-dev')) {
      args.push('--conditions=power-assert-dev');
    }
    // `--eval` runs as CJS, so require('tty') goes through the registered sync hooks
    args.push('--import', '@power-assert/node', '--eval', "require('tty')");
    const result = spawnSync(process.execPath, args, { cwd: packageRoot, encoding: 'utf8' });
    assert.equal(result.status, 0, `child process should exit cleanly but got status ${result.status}\nstderr: ${result.stderr}`);
  });
});
