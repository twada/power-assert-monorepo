import assert from 'node:assert/strict';

async function myAsync(a){
  assert((await (a)) === 3);
}

// function notAsync(a){
//   assert((await (a)) === 3);
// }
