import { describe, it } from "node:test";
import assert from "node:assert";
it("test1", () => {
    const falsy = 0;
    assert(falsy);
});
describe("description", () => {
    it("test2", () => {
        const truthy = 1;
        const falsy = 0;
        assert(truthy === falsy);
    });
    describe("nested", () => {
        it("test3", () => {
            const truthy = 0;
            const another = 0;
            assert(truthy !== another);
        });
    });
});
