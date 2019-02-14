import { Reducer, Transducer } from "../api";
import { compR } from "../func/compr";
import { isReduced, unreduced, ensureReduced } from "../reduced";

/**
 * Transducer to concatenate iterable values. Iterates over each input
 * and emits individual values down stream, therefore removing one level
 * of nesting from the input. If, during processing, the transducer is
 * given a wrapped `reduced()` input iterable, it will still be
 * processed as normal, but then immediately triggers early termination
 * by wrapping its own result in `reduced()`. E.g. this behavior allows
 * a `mapcat()` user functions to benefit from `reduced` results.
 *
 * ```
 * [...iterator(comp(map((x) => [x, x]), cat()), [1, 2, 3, 4])]
 * // [ 1, 1, 2, 2, 3, 3, 4, 4 ]
 *
 * [...iterator(
 *   comp(
 *     mapIndexed((i, x) => [[i], [x, x]]),
 *     cat(),
 *     cat()
 *   ),
 *   "abc"
 * )]
 * // [ 0, 'a', 'a', 1, 'b', 'b', 2, 'c', 'c' ]
 *
 * [...mapcat((x)=>(x > 1 ? reduced([x, x]) : [x, x]), [1, 2, 3, 4])]
 * // [ 1, 1, 2, 2 ]
 * ```
 *
 * @see thi.ng/transducers/iter/concat
 * @see thi.ng/transducers/xform/mapcat
 */
export const cat =
    <T>(): Transducer<Iterable<T>, T> =>
        (rfn: Reducer<any, T>) => {
            const r = rfn[2];
            return compR(rfn,
                (acc, x: Iterable<T>) => {
                    if (x) {
                        for (let y of unreduced(x)) {
                            acc = r(acc, y);
                            if (isReduced(acc)) {
                                break;
                            }
                        }
                    }
                    return isReduced(x) ?
                        ensureReduced(acc) :
                        acc;
                });
        };
