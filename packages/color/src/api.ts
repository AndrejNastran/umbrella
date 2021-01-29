import type { FloatArray, FnU2, IDeref, Range, Tuple } from "@thi.ng/api";
import type { IRandom } from "@thi.ng/random";
import type { IVector, ReadonlyVec, Vec } from "@thi.ng/vectors";

export type Color = Vec;
export type ReadonlyColor = ReadonlyVec;

export type MaybeColor = string | number | ReadonlyColor | IColor;

export type ColorOp = (out: Color | null, src: ReadonlyColor) => Color;

export type ColorMode =
    | "hcy"
    | "hsi"
    | "hsl"
    | "hsv"
    | "lab"
    | "lch"
    | "oklab"
    | "rgb"
    | "srgb"
    | "xyy"
    | "xyz"
    | "ycc";

/**
 * Hue names in radial order, e.g. used by {@link namedHueRgb}.
 */
export enum Hue {
    RED,
    ORANGE,
    YELLOW,
    CHARTREUSE,
    GREEN,
    SPRING_GREEN,
    CYAN,
    AZURE,
    BLUE,
    VIOLET,
    MAGENTA,
    ROSE,
}

export interface IColor {
    readonly mode: ColorMode;
}

export interface ChannelSpec {
    /**
     * @defaultValue [0,1]
     */
    range?: Range;
    /**
     * @defaultValue 0
     */
    default?: number;
}

export interface ColorSpec<M extends ColorMode, K extends string> {
    mode: M;
    channels: Record<K, ChannelSpec>;
    order: readonly K[];
    from: Partial<Record<ColorMode, ColorOp>> & { rgb: ColorOp };
}

export interface ColorFactory<T extends TypedColor<any>> {
    (
        col: TypedColor<any> | ParsedColor | string | number,
        buf?: Color,
        idx?: number,
        stride?: number
    ): T;
    (col?: Color, idx?: number, stride?: number): T;
    (a: number, b: number, c: number, ...xs: number[]): T;

    /**
     * Returns a new random color, optionally backed by given memory. I.e. if
     * `buf` is given, the returned color will wrap `buf` from given `index`
     * (default: 0) and `stride` step size (default: 1).
     *
     * @param rnd
     * @param buf
     * @param index
     * @param stride
     */
    random(rnd?: IRandom, buf?: Color, index?: number, stride?: number): T;

    /**
     * Returns array of memory mapped colors using given backing array and
     * stride settings.
     *
     * @remarks
     * The `cstride` is the step size between individual color components.
     * `estride` is the step size between successive colors and will default to
     * number of channels supported by given color type/space. This arrangement
     * allows for different storage approaches, incl. SOA, AOS, striped /
     * interleaved etc.
     *
     * @param buf - backing array
     * @param num - num vectors (default: buf.length / numChannels)
     * @param start -  start index (default: 0)
     * @param cstride - component stride (default: 1)
     * @param estride - element stride (default: numChannels)
     */
    mapBuffer(
        buf: FloatArray,
        num?: number,
        start?: number,
        cstride?: number,
        estride?: number
    ): T[];
}

export interface TypedColor<T> extends IColor, IDeref<Color>, IVector<T> {
    /**
     * Backing array / memory
     */
    buf: Color;
    /**
     * Start index in array
     */
    offset: number;
    /**
     * Step size between channels
     */
    stride: number;
    random(rnd?: IRandom): this;
    /**
     * Copies `src` into this color's array.
     *
     * @param src
     */
    set(src: ReadonlyColor): this;
    /**
     * For memory mapped colors, this ensures only the elements used by this
     * color are being serialized (as array) by `JSON.stringify()`.
     */
    toJSON(): number[];
}

export class ParsedColor implements IDeref<Color> {
    constructor(public readonly mode: ColorMode, public value: Color) {}

    deref() {
        return this.value;
    }
}

/**
 * A 4x5 matrix in column-major order
 */
export type ColorMatrix = Tuple<number, 20>;

export type ColorDistance = FnU2<ReadonlyColor, number>;
