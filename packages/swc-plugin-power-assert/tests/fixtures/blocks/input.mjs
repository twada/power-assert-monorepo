import { it } from "node:test";
import assert from "node:assert";
it("test1", () => {
    const falsy = 0;
    assert(falsy);
});
it("test2", () => {
    const truthy = 0;
    const falsy = 0;
    assert(truthy === falsy);
});