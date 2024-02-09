import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runBenchmark } from '@twada/benchmark-commits';
import { parse } from 'acorn';

const specs = [
  {
    name: 'main-branch',
    git: 'main',
    // workspace: 'packages/transpiler-core',
    prepare: [
      'npm install',
      'npm run build:all'
    ]
  },
  {
    name: 'estree-walker-branch',
    git: 'estree-walker',
    // workspace: 'packages/transpiler-core',
    prepare: [
      'npm install',
      'npm run build:all'
    ]
  }
];

const filepath = fileURLToPath(import.meta.url);
const fileContent = readFileSync(filepath, "utf8");

runBenchmark(specs, async ({ suite, spec, dir }) => {
  const { espowerAst } = await import(pathToFileURL(`${dir}/packages/transpiler-core/dist/transpiler-core.mjs`));
  return () => {
    const ast = parse(fileContent, {
      sourceType: 'module',
      ecmaVersion: 2022,
      locations: true,
      ranges: true,
      sourceFile: filepath
    });
    const modifiedAst = espowerAst(ast, {
      code: fileContent
    });
    assert(modifiedAst !== undefined);
  };
}).then((suite) => {
  console.log('FINISHED');
}).catch((err) => {
  console.error(err);
});
