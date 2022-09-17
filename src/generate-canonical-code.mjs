import { replace } from 'estraverse';
import { generate, Precedence } from 'escodegen';
import espurify from 'espurify';
const { customize } = espurify;
const espurifyWithRaw = customize({ extra: 'raw' });

const canonicalCodeOptions = {
  format: {
    indent: {
      style: ''
    },
    newline: ''
  },
  verbatim: 'x-verbatim-espower'
};

export function generateCanonicalCode (node, visitorKeys) {
  const ast = espurifyWithRaw(node);
  const visitor = {
    leave: function (currentNode, parentNode) {
      if (currentNode.type === 'Literal' && typeof currentNode.raw !== 'undefined') {
        currentNode['x-verbatim-espower'] = {
          content: currentNode.raw,
          precedence: Precedence.Primary
        };
        return currentNode;
      } else {
        return undefined;
      }
    }
  };
  if (visitorKeys) {
    visitor.keys = visitorKeys;
  }
  replace(ast, visitor);
  return generate(ast, canonicalCodeOptions);
}
