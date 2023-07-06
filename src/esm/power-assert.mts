import { parse } from 'acorn';
import { espowerAst } from 'espower3/transpiler';
import { generate } from 'astring';
import { SourceMapGenerator } from 'source-map';
import { fromJSON, fromMapFileSource, fromSource } from 'convert-source-map';

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

function handleIncomingSourceMap (originalCode, options) {
  var inMap;
  var sourceMappingURL = retrieveSourceMapURL(originalCode);
  var commented;
  // relative file sourceMap
  // //# sourceMappingURL=foo.js.map or /*# sourceMappingURL=foo.js.map */
  if (sourceMappingURL && !/^data:application\/json[^,]+base64,/.test(sourceMappingURL)) {
      commented = fromMapFileSource(originalCode, _path.dirname(options.path));
      commented = fromMapFileSource(originalCode, (filename) => {
         return fs.readFileSync(_path.resolve('../my-dir', filename), 'utf-8');
      });
  } else {
      // inline sourceMap or none sourceMap
      commented = fromSource(originalCode);
  }

  if (commented) {
      inMap = commented.toObject();
      options.sourceMap = inMap;
  }
}

// copy from https://github.com/evanw/node-source-map-support/blob/master/source-map-support.js#L99
function retrieveSourceMapURL (source) {
  //        //# sourceMappingURL=foo.js.map                       /*# sourceMappingURL=foo.js.map */
  var re = /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^\*]+?)[ \t]*(?:\*\/)[ \t]*$)/mg;
  // Keep executing the search to find the *last* sourceMappingURL to avoid
  // picking up sourceMappingURLs from comments, strings, etc.
  var lastMatch, match;
  while (match = re.exec(source)) {
      lastMatch = match;
  }
  if (!lastMatch) {
      return null;
  }
  return lastMatch[1];
};