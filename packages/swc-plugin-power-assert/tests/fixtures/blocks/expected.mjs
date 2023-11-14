import { describe, it } from "node:test";
import assert from "node:assert";
import { _power_ } from "@power-assert/runtime";
it("test1", ()=>{
    const _pasrt1 = _power_(assert, null, "assert(falsy)");
    const _parg1 = _pasrt1.recorder(0);
    const falsy = 0;
    _pasrt1.run(_parg1.rec(falsy, 7));
});
describe("description", ()=>{
    it("test2", ()=>{
        const _pasrt2 = _power_(assert, null, "assert(truthy === falsy)");
        const _parg2 = _pasrt2.recorder(0);
        const truthy = 1;
        const falsy = 0;
        _pasrt2.run(_parg2.rec(_parg2.tap(truthy, 7) === _parg2.tap(falsy, 18), 14));
    });
    describe("nested", ()=>{
        it("test3", ()=>{
            const _pasrt3 = _power_(assert, null, "assert(truthy !== another)");
            const _parg3 = _pasrt3.recorder(0);
            const truthy = 0;
            const another = 0;
            _pasrt3.run(_parg3.rec(_parg3.tap(truthy, 7) !== _parg3.tap(another, 18), 14));
        });
    });
});
