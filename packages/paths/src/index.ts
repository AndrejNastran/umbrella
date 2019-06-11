import { isString } from "@thi.ng/checks";
import { illegalArgs } from "@thi.ng/errors";

export type Path = PropertyKey | PropertyKey[];

export type UpdateFn<T> = (curr: T, ...args: any[]) => T;

const isa = Array.isArray;
const iss = isString;

const _copy = (s: any) => (isa(s) ? s.slice() : { ...s });

const compS = (k: PropertyKey, f: (o: any, v: any) => any) => (
    s: any,
    v: any
) => ((s = _copy(s)), (s[k] = f ? f(s[k], v) : v), s);

/**
 * Converts the given key path to canonical form (array).
 *
 * ```
 * toPath("a.b.c");
 * // ["a", "b", "c"]
 *
 * toPath(0)
 * // [0]
 *
 * toPath(["a", "b", "c"])
 * // ["a", "b", "c"]
 * ```
 *
 * @param path
 */
export const toPath = (path: Path) =>
    isa(path)
        ? path
        : iss(path)
        ? path.length > 0
            ? path.split(".")
            : []
        : path != null
        ? [path]
        : [];

/**
 * Takes an arbitrary object and lookup path. Descends into object along
 * path and returns true if the full path exists (even if final leaf
 * value is `null` or `undefined`). Checks are performed using
 * `hasOwnProperty()`.
 *
 * @param obj
 * @param path
 */
export const exists = (obj: any, path: Path) => {
    if (obj == null) {
        return false;
    }
    path = toPath(path);
    for (let n = path.length - 1, i = 0; i <= n; i++) {
        const k = path[i];
        if (!obj.hasOwnProperty(k)) {
            return false;
        }
        obj = obj[k];
        if (obj == null && i < n) {
            return false;
        }
    }
    return true;
};

/**
 * Composes a getter function for given nested lookup path. Optimized
 * fast execution paths are provided for path lengths less than 5.
 * Supports any `[]`-indexable data structure (arrays, objects,
 * strings).
 *
 * If `path` is given as string, it will be split using `.`. Returns
 * function which accepts single object and when called, returns value
 * at given path.
 *
 * If any intermediate key is not present in the given obj, descent
 * stops and the function returns `undefined`.
 *
 * If `path` is an empty string or array, the returned getter will
 * simply return the given state arg (identity function).
 *
 * Also see: `getIn()`
 *
 * ```
 * g = getter("a.b.c");
 * // or
 * g = getter(["a","b","c"]);
 *
 * g({a: {b: {c: 23}}}) // 23
 * g({x: 23}) // undefined
 * g() // undefined
 * ```
 *
 * @param path
 */
export const getter = (path: Path) => {
    const ks = toPath(path);
    let [a, b, c, d] = ks;
    switch (ks.length) {
        case 0:
            return (s: any) => s;
        case 1:
            return (s: any) => (s != null ? s[a] : undefined);
        case 2:
            return (s: any) =>
                s != null ? ((s = s[a]) != null ? s[b] : undefined) : undefined;
        case 3:
            return (s: any) =>
                s != null
                    ? (s = s[a]) != null
                        ? (s = s[b]) != null
                            ? s[c]
                            : undefined
                        : undefined
                    : undefined;
        case 4:
            return (s: any) =>
                s != null
                    ? (s = s[a]) != null
                        ? (s = s[b]) != null
                            ? (s = s[c]) != null
                                ? s[d]
                                : undefined
                            : undefined
                        : undefined
                    : undefined;
        default:
            return (s: any) => {
                const n = ks.length - 1;
                let res = s;
                for (let i = 0; res != null && i <= n; i++) {
                    res = res[ks[i]];
                }
                return res;
            };
    }
};

/**
 * Composes a setter function for given nested update path. Optimized
 * fast execution paths are provided for path lengths less up to 4.
 * Supports both arrays and objects and creates intermediate shallow
 * copies at each level of the path. Thus provides structural sharing
 * with the original data for any branches not being updated by the
 * setter.
 *
 * If `path` is given as string, it will be split using `.`. Returns
 * function which accepts single object and when called, **immutably**
 * updates value at given path, i.e. produces a partial deep copy of obj
 * up until given path.
 *
 * If any intermediate key is not present in the given obj, creates a
 * plain empty object for that key and descends further.
 *
 * If `path` is an empty string or array, the returned setter will
 * simply return the new value.
 *
 * Also see: `setIn()`, `updateIn()`, `deleteIn()`
 *
 * ```
 * s = setter("a.b.c");
 * // or
 * s = setter(["a","b","c"]);
 *
 * s({a: {b: {c: 23}}}, 24)
 * // {a: {b: {c: 24}}}
 *
 * s({x: 23}, 24)
 * // { x: 23, a: { b: { c: 24 } } }
 *
 * s(null, 24)
 * // { a: { b: { c: 24 } } }
 * ```
 *
 * Only keys in the path will be modified, all other keys present in the
 * given object retain their original values to provide efficient
 * structural sharing / re-use.
 *
 * ```
 * s = setter("a.b.c");
 *
 * a = {x: {y: {z: 1}}};
 * b = s(a, 2);
 * // { x: { y: { z: 1 } }, a: { b: { c: 2 } } }
 *
 * a.x === b.x // true
 * a.x.y === b.x.y // true
 * ```
 *
 * @param path
 */
export const setter = (path: Path): ((s: any, v: any) => any) => {
    const ks = toPath(path);
    let [a, b, c, d] = ks;
    switch (ks.length) {
        case 0:
            return (_, v) => v;
        case 1:
            return (s, v) => ((s = _copy(s)), (s[a] = v), s);
        case 2:
            return (s, v) => {
                let x;
                s = _copy(s);
                s[a] = x = _copy(s[a]);
                x[b] = v;
                return s;
            };
        case 3:
            return (s, v) => {
                let x, y;
                s = _copy(s);
                s[a] = x = _copy(s[a]);
                x[b] = y = _copy(x[b]);
                y[c] = v;
                return s;
            };
        case 4:
            return (s, v) => {
                let x, y, z;
                s = _copy(s);
                s[a] = x = _copy(s[a]);
                x[b] = y = _copy(x[b]);
                y[c] = z = _copy(y[c]);
                z[d] = v;
                return s;
            };
        default:
            let f: any;
            for (let i = ks.length; --i >= 0; ) {
                f = compS(ks[i], f);
            }
            return f;
    }
};

/**
 * Immediate use getter, i.e. same as: `getter(path)(state)`.
 *
 * ```
 * getIn({a: {b: {c: 23}}}, "a.b.c");
 * // 23
 * ```
 *
 * @param state
 * @param path
 */
export const getIn = (state: any, path: Path) => getter(path)(state);

/**
 * Immediate use setter, i.e. same as: `setter(path)(state, val)`.
 *
 * ```
 * setIn({}, "a.b.c", 23);
 * // {a: {b: {c: 23}}}
 * ```
 *
 * @param state
 * @param path
 */
export const setIn = (state: any, path: Path, val: any) =>
    setter(path)(state, val);

/**
 * Like `setIn()`, but takes any number of path-value pairs and applies
 * them in sequence by calling `setIn()` for each. Any key paths missing
 * in the data structure will be created. Does *not* mutate original
 * (instead use `mutInMany()` for this purpose).
 *
 * ```
 * setInMany({}, "a.b", 10, "x.y.z", 20)
 * // { a: { b: 10 }, x: { y: { z: 20 } } }
 * ```
 *
 * @param state
 * @param pairs
 */
export const setInMany = (state: any, ...pairs: any[]) => {
    const n = pairs.length;
    n & 1 && illegalArgs(`require even number of args (got ${pairs.length})`);
    for (let i = 0; i < n; i += 2) {
        state = setIn(state, pairs[i], pairs[i + 1]);
    }
    return state;
};

/**
 * Similar to `setter()`, returns a function to update values at given
 * `path` using provided update `fn`. The returned function accepts a
 * single object / array and applies `fn` to current path value (incl.
 * any additional/optional arguments passed) and uses result as new
 * value. Does not modify original state (unless given function does so
 * itself).
 *
 * ```
 * add = updater("a.b", (x, n) => x + n);
 *
 * add({a: {b: 10}}, 13);
 * // { a: { b: 23 } }
 * ```
 *
 * @param path
 * @param fn
 */
export const updater = (path: Path, fn: UpdateFn<any>) => {
    const g = getter(path);
    const s = setter(path);
    return (state: any, ...args: any[]) =>
        s(state, fn.apply(null, <any>(args.unshift(g(state)), args)));
};

/**
 * Similar to `setIn()`, but applies given function to current path
 * value (incl. any additional/optional arguments passed to `updateIn`)
 * and uses result as new value. Does not modify original state (unless
 * given function does so itself).
 *
 * ```
 * add = (x, y) => x + y;
 * updateIn({a: {b: {c: 23}}}, "a.b.c", add, 10);
 * // {a: {b: {c: 33}}}
 * ```
 *
 * @param state
 * @param path
 */
export const updateIn = (
    state: any,
    path: Path,
    fn: UpdateFn<any>,
    ...args: any[]
) =>
    setter(path)(
        state,
        fn.apply(null, <any>(args.unshift(getter(path)(state)), args))
    );

/**
 * Uses `updateIn()` and returns updated state with key for given path
 * removed. Does not modify original state.
 *
 * Returns `undefined` if `path` is an empty string or array.
 *
 * ```
 * deleteIn({a:{b:{c: 23}}}, "a.b.c");
 * // {a: {b: {}}}
 * ```
 *
 * @param state
 * @param path
 */
export const deleteIn = (state: any, path: Path) => {
    const ks = [...toPath(path)];
    if (ks.length > 0) {
        const k = <PropertyKey>ks.pop();
        return updateIn(state, ks, (x) => ((x = { ...x }), delete x[k], x));
    }
};

/**
 * Higher-order function, similar to `setter()`. Returns function which
 * when called mutates given object/array at given path location and
 * bails if any intermediate path values are non-indexable (only the
 * very last path element can be missing in the actual object
 * structure). If successful, returns original (mutated) object, else
 * `undefined`. This function provides optimized versions for path
 * lengths <= 4.
 *
 * @param path
 */
export const mutator = (path: Path) => {
    const ks = toPath(path);
    let [a, b, c, d] = ks;
    switch (ks.length) {
        case 0:
            return (_: any, x: any) => x;
        case 1:
            return (s: any, x: any) => (s ? ((s[a] = x), s) : undefined);
        case 2:
            return (s: any, x: any) => {
                let t;
                return s
                    ? (t = s[a])
                        ? ((t[b] = x), s)
                        : undefined
                    : undefined;
            };
        case 3:
            return (s: any, x: any) => {
                let t;
                return s
                    ? (t = s[a])
                        ? (t = t[b])
                            ? ((t[c] = x), s)
                            : undefined
                        : undefined
                    : undefined;
            };
        case 4:
            return (s: any, x: any) => {
                let t;
                return s
                    ? (t = s[a])
                        ? (t = t[b])
                            ? (t = t[c])
                                ? ((t[d] = x), s)
                                : undefined
                            : undefined
                        : undefined
                    : undefined;
            };
        default:
            return (s: any, x: any) => {
                let t = s;
                const n = ks.length - 1;
                for (let k = 0; k < n; k++) {
                    if (!(t = t[ks[k]])) return;
                }
                t[ks[n]] = x;
                return s;
            };
    }
};

/**
 * Immediate use mutator, i.e. same as: `mutator(path)(state, val)`.
 *
 * ```
 * mutIn({ a: { b: [10, 20] } }, "a.b.1", 23);
 * // { a: { b: [ 10, 23 ] } }
 *
 * // fails (see `mutator` docs)
 * mutIn({}, "a.b.c", 23);
 * // undefined
 * ```
 *
 * @param state
 * @param path
 * @param val
 */
export const mutIn = (state: any, path: Path, val: any) =>
    mutator(path)(state, val);

/**
 * Like `mutIn()`, but takes any number of path-value pairs and applies
 * them in sequence. All key paths must already be present in the given
 * data structure until their penultimate key.
 *
 * ```
 * mutInMany({a: {b: 1}, x: {y: {z: 2}}}, "a.b", 10, "x.y.z", 20)
 * // { a: { b: 10 }, x: { y: { z: 20 } } }
 * ```
 *
 * @param state
 * @param pairs
 */
export const mutInMany = (state: any, ...pairs: any[]) => {
    const n = pairs.length;
    n & 1 && illegalArgs(`require even number of args (got ${pairs.length})`);
    for (let i = 0; i < n && state; i += 2) {
        state = mutIn(state, pairs[i], pairs[i + 1]);
    }
    return state;
};
