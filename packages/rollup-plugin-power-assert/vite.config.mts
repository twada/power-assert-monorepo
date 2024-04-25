import { defineConfig } from 'vite';
import { powerAssert } from 'rollup-plugin-power-assert';
const examplePattern = 'examples/**/*.test.mts';

export default defineConfig({
  plugins: [
    powerAssert({
      include: [examplePattern],
    }),
  ],
  test: {
    include: [examplePattern],
    // ...
  },
});
