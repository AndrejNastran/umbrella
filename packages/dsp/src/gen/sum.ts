import { IGen } from "../api";
import { CompG2, CompG3 } from "./comp";

/**
 * Higher order gen. Returns a {@link Comp2} or {@link Comp3} yielding
 * sums of given {@link IGen}s. Initializes to 0.
 *
 * @param a - summand
 * @param b - summand
 */
export function sum(a: IGen<number>, b: IGen<number>): IGen<number>;
export function sum(
    a: IGen<number>,
    b: IGen<number>,
    c: IGen<number>
): IGen<number>;
export function sum(a: IGen<number>, b: IGen<number>, c?: IGen<number>) {
    return c
        ? new CompG3((a, b, c) => a + b + c, a, b, c, 0)
        : new CompG2((a, b) => a + b, a, b, 0);
}
