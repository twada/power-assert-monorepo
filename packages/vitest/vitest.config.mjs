import { defineConfig } from 'vitest/config';
import { powerAssertPlugin } from '@power-assert/vitest';

export default defineConfig({
  plugins: [
    powerAssertPlugin(),
  ],
  test: {
    // ...
  },
});
