import assert from "node:assert";
import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert((foo, bar))");
const _parg1 = _pasrt1.recorder(0);
_pasrt1.run(_parg1.rec((_parg1.tap(foo, 8), _parg1.tap(bar, 13))));
