import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert(class Me { getClassName() { return foo + Me.name; } })");
assert(class Me {
  getClassName() {
    return foo + Me.name;
  }
});
