import assert from 'node:assert/strict';

function *gen(a){
  assert((yield (a)) === 3);
}

// function notGen(a){
//   assert((yield (a)) === 3);
// }
