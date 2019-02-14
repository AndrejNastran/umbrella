import { ReadonlyVec, Vec } from "./api";
import { setC3 } from "./setc";

export const cross2 =
    (a: ReadonlyVec, b: ReadonlyVec) =>
        a[0] * b[1] - a[1] * b[0];

export const cross3 =
    (out: Vec, a: ReadonlyVec, b: ReadonlyVec) =>
        setC3(
            out || a,
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        );
