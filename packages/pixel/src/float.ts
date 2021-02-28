import { assert, Fn, ICopy, IEmpty, NumericArray } from "@thi.ng/api";
import { isNumber } from "@thi.ng/checks";
import { clamp01 } from "@thi.ng/math";
import type {
    BlendFnFloat,
    BlitOpts,
    FloatFormat,
    FloatFormatSpec,
    IPixelBuffer,
    PackedFormat,
} from "./api";
import { defFloatFormat } from "./format/float-format";
import { FLOAT_GRAY } from "./format/float-gray";
import { PackedBuffer } from "./packed";
import { clampRegion, ensureChannel, ensureSize, prepRegions } from "./utils";

/**
 * Syntax sugar for {@link FloatBuffer} ctor.
 *
 * @param w -
 * @param h -
 * @param fmt -
 * @param pixels -
 */
export function floatBuffer(
    w: number,
    h: number,
    fmt: FloatFormat | FloatFormatSpec,
    pixels?: Float32Array
): FloatBuffer;
export function floatBuffer(
    src: PackedBuffer,
    fmt: FloatFormat | FloatFormatSpec
): FloatBuffer;
export function floatBuffer(...args: any[]) {
    return args[0] instanceof PackedBuffer
        ? // @ts-ignore
          FloatBuffer.fromPacked(...args)
        : // @ts-ignore
          new FloatBuffer(...args);
}

export class FloatBuffer
    implements
        IPixelBuffer<Float32Array, NumericArray>,
        ICopy<FloatBuffer>,
        IEmpty<FloatBuffer> {
    /**
     * Creates a new `FloatBuffer` from given {@link PackedBuffer} and using
     * provided {@link FloatFormat}.
     *
     * @remarks
     * See {@link FloatBuffer.as} for reverse operation.
     *
     * @param src
     * @param fmt
     */
    static fromPacked(src: PackedBuffer, fmt: FloatFormat | FloatFormatSpec) {
        const dest = new FloatBuffer(src.width, src.height, fmt);
        const { pixels: dbuf, format: dfmt, stride } = dest;
        const { pixels: sbuf, format: sfmt } = src;
        for (let i = sbuf.length; --i >= 0; ) {
            dbuf.set(dfmt.fromABGR(sfmt.toABGR(sbuf[i])), i * stride);
        }
        return dest;
    }

    readonly width: number;
    readonly height: number;
    readonly stride: number;
    readonly rowStride: number;
    readonly pixels: Float32Array;
    readonly format: FloatFormat;
    protected __empty: NumericArray;

    constructor(
        w: number,
        h: number,
        fmt: FloatFormat | FloatFormatSpec,
        pixels?: Float32Array
    ) {
        this.width = w;
        this.height = h;
        this.format = (<any>fmt).__float
            ? <FloatFormat>fmt
            : defFloatFormat(fmt);
        this.stride = fmt.channels.length;
        this.rowStride = w * this.stride;
        this.pixels = pixels || new Float32Array(w * h * this.stride);
        this.__empty = <NumericArray>(
            Object.freeze(new Array<number>(this.stride).fill(0))
        );
    }

    as(fmt: PackedFormat) {
        const { width, height, stride, pixels, format: sfmt } = this;
        const dest = new PackedBuffer(width, height, fmt);
        const dpixels = dest.pixels;
        for (let i = 0, j = 0, n = pixels.length; i < n; i += stride, j++) {
            dpixels[j] = fmt.fromABGR(
                sfmt.toABGR(pixels.subarray(i, i + stride))
            );
        }
        return dest;
    }

    copy() {
        const dest = this.empty();
        dest.pixels.set(this.pixels);
        return dest;
    }

    empty() {
        return new FloatBuffer(this.width, this.height, this.format);
    }

    getAt(x: number, y: number) {
        const { width, stride } = this;
        if (x >= 0 && x < width && y >= 0 && y < this.height) {
            const idx = (x | 0) * stride + (y | 0) * this.rowStride;
            return this.pixels.subarray(idx, idx + stride);
        }
        return this.__empty;
    }

    setAt(x: number, y: number, col: NumericArray) {
        x >= 0 &&
            x < this.width &&
            y >= 0 &&
            y < this.height &&
            this.pixels.set(
                col,
                (x | 0) * this.stride + (y | 0) * this.rowStride
            );
        return this;
    }

    getChannelAt(x: number, y: number, id: number) {
        ensureChannel(this.format, id);
        const { width, stride } = this;
        if (x >= 0 && x < width && y >= 0 && y < this.height) {
            return this.pixels[
                (x | 0) * stride + (y | 0) * this.rowStride + id
            ];
        }
    }

    setChannelAt(x: number, y: number, id: number, col: number) {
        ensureChannel(this.format, id);
        const { width, stride } = this;
        if (x >= 0 && x < width && y >= 0 && y < this.height) {
            this.pixels[(x | 0) * stride + (y | 0) * this.rowStride + id] = col;
        }
        return this;
    }

    getChannel(id: number) {
        ensureChannel(this.format, id);
        const { pixels, stride } = this;
        const dest = new Float32Array(this.width * this.height);
        for (let i = id, j = 0, n = pixels.length; i < n; i += stride, j++) {
            dest[j] = clamp01(pixels[i]);
        }
        return new FloatBuffer(this.width, this.height, FLOAT_GRAY, dest);
    }

    setChannel(id: number, src: FloatBuffer | number) {
        ensureChannel(this.format, id);
        const { pixels: dest, stride } = this;
        if (isNumber(src)) {
            for (let i = id, n = dest.length; i < n; i += stride) {
                dest[i] = src;
            }
        } else {
            const { pixels: sbuf, stride: sstride } = src;
            ensureSize(sbuf, this.width, this.height, sstride);
            for (
                let i = id, j = 0, n = dest.length;
                i < n;
                i += stride, j += sstride
            ) {
                dest[i] = sbuf[j];
            }
        }
        return this;
    }

    blend(op: BlendFnFloat, dest: FloatBuffer, opts?: Partial<BlitOpts>) {
        this.ensureFormat(dest);
        const { sx, sy, dx, dy, rw, rh } = prepRegions(this, dest, opts);
        if (rw < 1 || rh < 1) return dest;
        const sbuf = this.pixels;
        const dbuf = dest.pixels;
        const sw = this.rowStride;
        const dw = dest.rowStride;
        const stride = this.stride;
        for (
            let si = (sx | 0) * stride + (sy | 0) * sw,
                di = (dx | 0) * stride + (dy | 0) * dw,
                yy = 0;
            yy < rh;
            yy++, si += sw, di += dw
        ) {
            for (
                let xx = rw, sii = si, dii = di;
                --xx >= 0;
                sii += stride, dii += stride
            ) {
                const out = dbuf.subarray(dii, dii + stride);
                op(out, sbuf.subarray(sii, sii + stride), out);
            }
        }
        return dest;
    }

    blit(dest: FloatBuffer, opts?: Partial<BlitOpts>) {
        this.ensureFormat(dest);
        const { sx, sy, dx, dy, rw, rh } = prepRegions(this, dest, opts);
        if (rw < 1 || rh < 1) return dest;
        const sbuf = this.pixels;
        const dbuf = dest.pixels;
        const sw = this.rowStride;
        const dw = dest.rowStride;
        const rww = rw * this.stride;
        for (
            let si = (sx | 0) * this.stride + (sy | 0) * sw,
                di = (dx | 0) * this.stride + (dy | 0) * dw,
                yy = 0;
            yy < rh;
            yy++, si += sw, di += dw
        ) {
            dbuf.set(sbuf.subarray(si, si + rww), di);
        }
        return dest;
    }

    blitCanvas(canvas: HTMLCanvasElement, x = 0, y = 0) {
        const ctx = canvas.getContext("2d")!;
        const idata = new ImageData(this.width, this.height);
        const dest = new Uint32Array(idata.data.buffer);
        const { stride, pixels, format } = this;
        for (let i = 0, j = 0, n = pixels.length; i < n; i += stride, j++) {
            dest[j] = format.toABGR(pixels.subarray(i, i + stride));
        }
        ctx.putImageData(idata, x, y);
        return canvas;
    }

    getRegion(x: number, y: number, width: number, height: number) {
        const [sx, sy, w, h] = clampRegion(
            x,
            y,
            width,
            height,
            this.width,
            this.height
        );
        return this.blit(new FloatBuffer(w, h, this.format), {
            sx,
            sy,
            w,
            h,
        });
    }

    forEach(f: Fn<NumericArray, void>) {
        const { pixels, stride } = this;
        for (let i = 0, n = pixels.length; i < n; i + stride) {
            f(pixels.subarray(i, i + stride));
        }
        return this;
    }

    clamp() {
        const pixels = this.pixels;
        for (let i = pixels.length; --i >= 0; ) {
            pixels[i] = clamp01(pixels[i]);
        }
        return this;
    }

    clampChannel(id: number) {
        ensureChannel(this.format, id);
        const { pixels, stride } = this;
        for (let i = id, n = pixels.length; i < n; i += stride) {
            pixels[i] = clamp01(pixels[i]);
        }
    }

    /**
     * Flips image vertically.
     */
    flipY() {
        const { pixels, rowStride } = this;
        const tmp = new Float32Array(rowStride);
        for (
            let i = 0, j = pixels.length - rowStride;
            i < j;
            i += rowStride, j -= rowStride
        ) {
            tmp.set(pixels.subarray(i, i + rowStride));
            pixels.copyWithin(i, j, j + rowStride);
            pixels.set(tmp, j);
        }
        return this;
    }

    /**
     * Returns new buffer of downscaled version (by given integer factor) using
     * simple nearest neighbor sampling.
     *
     * @param res
     */
    downsample(res: number) {
        res |= 0;
        const { width, height, stride, pixels: sbuf } = this;
        const dest = new FloatBuffer(
            (width / res) | 0,
            (height / res) | 0,
            this.format
        );
        const { width: dwidth, height: dheight, pixels: dbuf } = dest;
        res *= stride;
        for (let y = 0, i = 0; y < dheight; y++) {
            for (
                let x = 0, j = y * res * width;
                x < dwidth;
                x++, i += stride, j += res
            ) {
                dbuf.set(sbuf.subarray(j, j + stride), i);
            }
        }
        return dest;
    }

    protected ensureFormat(dest: FloatBuffer) {
        assert(
            dest.format === this.format,
            `dest buffer format must be same as src`
        );
    }
}
