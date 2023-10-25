import { defineConfig } from 'vitest/config';
// import { powerAssertPlugin } from '@power-assert/vitest-plugin';
import { powerAssertPlugin } from './src/vitest-plugin-power-assert.mjs';

export default defineConfig({
  plugins: [
    powerAssertPlugin(),
  ],
  test: {
    // ...
  },
});
