import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert(d.say())");
const _parg1 = _pasrt1.recorder(0);
class Dog {
  say() {
    return 'bow';
  }
}
const d = new Dog();
_pasrt1.run(_parg1.rec(_parg1.tap(d, 7, 7, 8, 1).say(), 9, 7, 14, 0));
