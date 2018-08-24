import { Reducer } from "../api";
import { reduce, reducer } from "../reduce";

export function max(): Reducer<number, number>;
export function max(xs: Iterable<number>): number;
export function max(xs?: Iterable<number>): any {
    return xs ?
        reduce(max(), xs) :
        reducer(() => Number.NEGATIVE_INFINITY, (acc, x: number) => Math.max(acc, x));
}
