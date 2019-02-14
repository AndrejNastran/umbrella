import { partial } from "../src";

import * as assert from "assert";

describe("partial", () => {

    const fn = (a, b, c, d, e, f, g, h, i) => [a, b, c, d, e, f, g, h, i];
    const res = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    it("1-arg", () => {
        assert.deepEqual(partial(fn, 0)(1, 2, 3, 4, 5, 6, 7, 8), res);
    });

    it("2-arg", () => {
        assert.deepEqual(partial(fn, 0, 1)(2, 3, 4, 5, 6, 7, 8), res);
    });

    it("3-arg", () => {
        assert.deepEqual(partial(fn, 0, 1, 2)(3, 4, 5, 6, 7, 8), res);
    });

    it("4-arg", () => {
        assert.deepEqual(partial(fn, 0, 1, 2, 3)(4, 5, 6, 7, 8), res);
    });

    it("5-arg", () => {
        assert.deepEqual(partial(fn, 0, 1, 2, 3, 4)(5, 6, 7, 8), res);
    });

    it("6-arg", () => {
        assert.deepEqual(partial(fn, 0, 1, 2, 3, 4, 5)(6, 7, 8), res);
    });

    it("7-arg", () => {
        assert.deepEqual(partial(fn, 0, 1, 2, 3, 4, 5, 6)(7, 8), res);
    });

    it("8-arg", () => {
        assert.deepEqual(partial(fn, 0, 1, 2, 3, 4, 5, 6, 7)(8), res);
    });
});
