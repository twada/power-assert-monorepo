import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert(d.say())");
const _parg1 = _pasrt1.recorder(0);
import assert from 'node:assert/strict';
class Dog {
  say() {
    return 'bow';
  }
}
const d = new Dog();
_pasrt1.run(_parg1.rec(_parg1.tap(d, "arguments/0/callee/object", 7).say(), "arguments/0", 9));
