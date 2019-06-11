import {
    IDeref,
    IID,
    INotify,
    IRelease,
    IWatch,
    Predicate
} from "@thi.ng/api";
import { Path } from "@thi.ng/paths";

export type SwapFn<T> = (curr: T, ...args: any[]) => T;

export type ViewTransform<T> = (x: any) => T;

export interface ReadonlyAtom<T>
    extends IDeref<T>,
        IRelease,
        IWatch<T>,
        IViewable {}

export interface IAtom<T> extends ReadonlyAtom<T>, IReset<T>, ISwap<T> {}

export interface IReset<T> {
    reset(val: T): T;
    resetIn<V>(path: Path, val: V): T;
}

export interface ISwap<T> {
    swap(fn: SwapFn<T>, ...args: any[]): T;
    swapIn<V>(path: Path, fn: SwapFn<V>, ...args: any[]): T;
}

export interface IView<T> extends IDeref<T | undefined>, IID<string>, IRelease {
    readonly path: PropertyKey[];
    readonly value: T | undefined;

    view(): T | undefined;
    changed(): boolean;
}

export interface IViewable {
    addView<T>(path: Path, tx?: ViewTransform<T>, lazy?: boolean): IView<T>;
}

export interface CursorOpts<T> {
    parent: IAtom<any>;
    path: Path | [(s: any) => T, (s: any, v: T) => any];
    validate?: Predicate<T>;
    id?: string;
}

export interface IHistory<T> extends IAtom<T>, INotify {
    canUndo(): boolean;
    canRedo(): boolean;

    undo(): T | undefined;
    redo(): T | undefined;
    clear(): void;

    record(): void;
}
