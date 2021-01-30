import type { FloatArray, FnU2, IDeref, Range, Tuple } from "@thi.ng/api";
import type { IRandom } from "@thi.ng/random";
import type { IVector, ReadonlyVec, Vec } from "@thi.ng/vectors";

export type Color = Vec;
export type ReadonlyColor = ReadonlyVec;

export type MaybeColor =
    | TypedColor<any>
    | IParsedColor
    | ReadonlyColor
    | string
    | number;

export type ColorOp = (out: Color | null, src: ReadonlyColor) => Color;

export type ColorMode =
    | "hcy"
    | "hsi"
    | "hsl"
    | "hsv"
    | "lab50"
    | "lab65"
    | "lch"
    | "oklab"
    | "rgb"
    | "srgb"
    | "xyy"
    | "xyz50"
    | "xyz65"
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
}

export interface ColorSpec<M extends ColorMode, K extends string> {
    mode: M;
    channels?: Partial<Record<K, ChannelSpec>>;
    order: readonly K[];
    from: Partial<Record<ColorMode, ColorOp | [ColorOp, ColorOp]>> & {
        rgb: ColorOp;
    };
}

export interface ColorFactory<T extends TypedColor<any>> {
    (col: MaybeColor, buf?: Vec, idx?: number, stride?: number): T;
    (col?: Vec, idx?: number, stride?: number): T;
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
    /**
     * Randomizes all color channels based on channel ranges defined for this
     * color type (usually [0..1] interval). Alpha channel will remain
     * untouched.
     *
     * @param rnd
     */
    randomize(rnd?: IRandom): this;
    /**
     * Clamps all color channels so that colors is inside RGB gamut.
     *
     * @remarks
     * Note: This is not a 100% guarantee, due to each channel being clamped
     * individually based on pre-determined limits.
     */
    clamp(): this;
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

export interface IParsedColor extends IColor, IDeref<Color> {}

/**
 * Result type returned by {@link parseCss}, a simple wrapper for a raw color
 * array and color mode.
 */
export class ParsedColor implements IParsedColor {
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
