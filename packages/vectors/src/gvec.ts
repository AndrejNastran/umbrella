import { EPS } from "@thi.ng/math";
import { memoize1 } from "@thi.ng/memoize";
import { map, range } from "@thi.ng/transducers";
import { IVector, Vec } from "./api";
import { eqDeltaS } from "./eqdelta";
import { values } from "./internal/vec-utils";
import { zeroes } from "./setn";
import { setS } from "./sets";

const SYM_B = "buf";
const SYM_L = "length";
const SYM_O = "offset";
const SYM_S = "stride";
const SYM_C = "copy";
const SYM_CV = "copyView";
const SYM_EMPTY = "empty";
const SYM_EQD = "eqDelta";
const SYM_STR = "toString";

const PROPS = new Set<PropertyKey>([
    SYM_B,
    SYM_C,
    SYM_CV,
    SYM_EMPTY,
    SYM_EQD,
    SYM_L,
    SYM_O,
    SYM_S,
    SYM_STR,
    Symbol.iterator
]);

const keys = memoize1<number, PropertyKey[]>(
    (size: number) => [
        ...map(String, range(size)),
        ...PROPS
    ]
);

/**
 * Wrapper for strided, arbitrary length vectors. Wraps given buffer in
 * ES6 `Proxy` with custom property getters/setters and implements the
 * following interfaces:
 *
 * - `Iterable` (ES6)
 * - `ICopy`
 * - `IEmpty`
 * - `IEqualsDelta`
 * - `IVector`
 * - `Object.toString()`
 *
 * Read/write access for the following properties:
 *
 * - array indices in the [0 .. `size`) interval
 * - `offset` - start index
 * - `stride` - component stride
 * - `buf` - backing buffer (readonly)
 * - `length` - vector size
 *
 * Array index access uses bounds checking against the [0 .. `size`)
 * interval, but, for performance reasons, **not** against the actual
 * wrapped buffer.
 *
 * Note: ES6 proxies are ~10x slower than standard array accesses. If
 * several computations are to be performed on such vectors it will be
 * much more efficient to first copy them to compact arrays and then
 * copy result back if needed.
 *
 * ```
 * // 3D vector w/ stride length of 4
 * a = gvec([1,0,0,0,2,0,0,0,3,0,0,0], 3, 0, 4);
 * a[0] // 1
 * a[1] // 2
 * a[2] // 3
 *
 * a.stride
 * // 4
 *
 * [...a]
 * // [1, 2, 3]
 *
 * a.toString()
 * // "[1,2,3]"
 *
 * add([], a, a)
 * // [2, 4, 6]
 *
 * copy(a)
 * // [1, 2, 3]
 *
 * a.copyView()
 * // Proxy [ [ 1, 0, 2, 0, 3, 0 ], ... }
 *
 * eqDelta(a, [1, 2, 3])
 * // true
 * ```
 *
 * @param buf
 * @param size
 * @param offset
 * @param stride
 */
export const gvec =
    (buf: Vec, size: number, offset = 0, stride = 1): IVector<any> =>
        <any>new Proxy(buf, {
            get(obj, id) {
                switch (id) {
                    case Symbol.iterator:
                        return () => values(obj, size, offset, stride);
                    case SYM_L:
                        return size;
                    case SYM_B:
                        return buf;
                    case SYM_O:
                        return offset;
                    case SYM_S:
                        return stride;
                    case SYM_C:
                        return () =>
                            setS([], obj, size, 0, offset, 1, stride);
                    case SYM_CV:
                        return () =>
                            gvec(obj, size, offset, stride);
                    case SYM_EMPTY:
                        return () => zeroes(size);
                    case SYM_EQD:
                        return (o, eps = EPS) =>
                            eqDeltaS(buf, o, size, eps, offset, 0, stride, 1);
                    case SYM_STR:
                        return () =>
                            JSON.stringify([...values(obj, size, offset, stride)]);
                    default:
                        const j = parseInt(<string>id);
                        return !isNaN(j) && j >= 0 && j < size ?
                            obj[offset + j * stride] :
                            undefined;
                }
            },
            set(obj, id, value) {
                const j = parseInt(<string>id);
                if (!isNaN(j) && <any>j >= 0 && <any>j < size) {
                    obj[offset + (<number>id | 0) * stride] = value;
                } else {
                    switch (id) {
                        case SYM_O:
                            offset = value;
                            break;
                        case SYM_S:
                            stride = value;
                            break;
                        case SYM_L:
                            size = value;
                            break;
                        default:
                            return false;
                    }
                }
                return true
            },
            has(_, id) {
                return (<any>id >= 0 && <any>id < size) ||
                    PROPS.has(id);
            },
            ownKeys() {
                return keys(size);
            }
        });
