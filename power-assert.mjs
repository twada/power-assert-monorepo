import { parse } from 'acorn';
import { espowerAst } from 'espower3/transpiler';
import { generate } from 'astring';
import { SourceMapGenerator } from 'source-map';
import { fromJSON } from 'convert-source-map';

const targetPattern = /^test\.(:?m)js$|^test-.+\.(:?m)js|.+[\.\-\_]test\.(:?m)js$/;

export async function load(url, context, nextLoad) {
  const { format } = context;
  if (format !== 'module') {
    return nextLoad(url);
  }
  if (targetPattern.test(url)) {
    const { source: rawSource } = await nextLoad(url, { ...context, format });
    const transpiledCode = transpile(rawSource.toString(), url);
    // console.log(transpiledCode);
    return {
      format,
      source: transpiledCode,
    };
  }
  return nextLoad(url);
}

function transpile (code, url) {
  const ast = parse(code, {
    sourceType: 'module',
    ecmaVersion: '2022',
    locations: true,
    ranges: true,
    sourceFile: url
  });
  const modifiedAst = espowerAst(ast, {
    runtime: 'espower3/runtime',
    code: code
  });
  const smg = new SourceMapGenerator({
    file: url,
  });
  const transpiledCode = generate(modifiedAst, {
    sourceMap: smg,
  });
  const outMap = fromJSON(smg.toString());
  return transpiledCode + '\n' + outMap.toComment() + '\n';
}
