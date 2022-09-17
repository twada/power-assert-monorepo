import { replace } from 'estraverse';
import { parse as acornParse } from 'acorn';
import espurify from 'espurify';
const { customize } = espurify;
const espurifyWithRange = customize({ extra: 'range' });

export function parseCanonicalCode (source, visitorKeys) {
  const code = source.content;
  let ast, tokens;

  function doParse (wrapper) {
    const content = wrapper ? wrapper(code) : code;
    const tokenBag = [];
    ast = acornParse(content, parserOptions(tokenBag));
    if (wrapper) {
      ast = ast.body[0].body;
      tokens = tokenBag.slice(6, -2);
    } else {
      tokens = tokenBag.slice(0, -1);
    }
  }

  if (source.async) {
    doParse(wrappedInAsync);
  } else if (source.generator) {
    doParse(wrappedInGenerator);
  } else {
    doParse();
  }

  const exp = ast.body[0].expression;
  const columnOffset = exp.loc.start.column;
  const visitor = {
    enter: function (eachNode) {
      if (!eachNode.loc && eachNode.range) {
        // skip already visited node
        return eachNode;
      }
      eachNode.range = [
        eachNode.loc.start.column - columnOffset,
        eachNode.loc.end.column - columnOffset
      ];
      delete eachNode.loc;
      return eachNode;
    }
  };
  if (visitorKeys) {
    visitor.keys = visitorKeys;
  }
  const offsetTree = replace(exp, visitor);

  return {
    tokens: offsetAndSlimDownTokens(tokens),
    expression: espurifyWithRange(offsetTree)
  };
}

function parserOptions (tokens) {
  return {
    sourceType: 'module',
    ecmaVersion: 2022,
    locations: true,
    ranges: false,
    onToken: tokens
  };
}

const wrappedInGenerator = (jsCode) => `function *wrapper() { ${jsCode} }`;
const wrappedInAsync = (jsCode) => `async function wrapper() { ${jsCode} }`;

function offsetAndSlimDownTokens (tokens) {
  const result = [];
  let columnOffset;
  tokens.forEach((token, i) => {
    if (i === 0) {
      columnOffset = token.loc.start.column;
    }
    const newToken = {
      type: {
        label: token.type.label
      },
      range: [
        token.loc.start.column - columnOffset,
        token.loc.end.column - columnOffset
      ]
    };
    if (typeof token.value !== 'undefined') {
      newToken.value = token.value;
    }
    result.push(newToken);
  });
  return result;
}
