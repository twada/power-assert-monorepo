import { it } from "node:test";
import assert from "node:assert";
import { _power_ } from "@power-assert/runtime";
it("test1", ()=>{
    const _pasrt1 = _power_(assert, null, "assert(falsy)");
    const _parg1 = _pasrt1.recorder(0);
    const falsy = 0;
    _pasrt1.run(_parg1.rec(falsy, 7));
});
it("test2", ()=>{
    const _pasrt2 = _power_(assert, null, "assert(truthy === falsy)");
    const _parg2 = _pasrt2.recorder(0);
    const truthy = 0;
    const falsy = 0;
    _pasrt2.run(_parg2.rec(_parg2.tap(truthy, 7) === _parg2.tap(falsy, 18), 7));
});
