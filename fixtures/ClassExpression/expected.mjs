import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert(class Me { getClassName() { return foo + Me.name; } })");
import assert from 'node:assert/strict';
assert(class Me {
  getClassName() {
    return foo + Me.name;
  }
});
