import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert(function (a, b) { return a + b; })");
  assert(function (a, b) {
    return a + b;
  });
}
