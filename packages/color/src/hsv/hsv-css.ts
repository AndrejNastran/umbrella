import type { ReadonlyColor } from "../api";
import { hslCss } from "../hsl/hsl-css";
import { hsvHsl } from "./hsv-hsl";

export const hsvCss = (src: ReadonlyColor) => hslCss(hsvHsl([], src));
