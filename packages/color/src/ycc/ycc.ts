import type { Vec } from "@thi.ng/vectors";
import type { Color, ColorFactory, ColorType, ReadonlyColor } from "../api";
import { defColor } from "../defcolor";
import { rgbYcc } from "../rgb/rgb-ycc";

export declare class YCC implements ColorType<YCC> {
    buf: Vec;
    offset: number;
    stride: number;
    y: number;
    cb: number;
    cr: number;
    alpha: number;
    [id: number]: number;
    readonly mode: "ycc";
    readonly length: 4;
    [Symbol.iterator](): Iterator<number, any, undefined>;
    copy(): YCC;
    copyView(): YCC;
    deref(): Color;
    empty(): YCC;
    eqDelta(o: YCC, eps?: number): boolean;
    set(src: ReadonlyColor): this;
    toJSON(): number[];
}

export const ycc = <ColorFactory<YCC>>defColor({
    mode: "ycc",
    channels: {
        y: {},
        cb: { range: [-1, 1] },
        cr: { range: [-1, 1] },
        alpha: { default: 1 },
    },
    order: <const>["y", "cb", "cr", "alpha"],
    from: { rgb: rgbYcc },
});
