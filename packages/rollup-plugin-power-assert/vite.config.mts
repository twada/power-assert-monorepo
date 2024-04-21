import { defineConfig } from 'vite';
import { powerAssertPlugin } from 'rollup-plugin-power-assert';
const examplePattern = 'examples/**/*.test.mts';

export default defineConfig({
  plugins: [
    powerAssertPlugin({
      include: [examplePattern],
    }),
  ],
  test: {
    include: [examplePattern],
    // ...
  },
});
