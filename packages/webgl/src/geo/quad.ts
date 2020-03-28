import { DrawMode, ModelSpec } from "../api/model";

export const defQuadModel = (uv = true): ModelSpec => ({
    attribs: {
        position: {
            data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            size: 2,
        },
        ...(uv
            ? {
                  uv: {
                      data: new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
                      size: 2,
                  },
              }
            : null),
    },
    uniforms: {},
    shader: <any>null,
    mode: DrawMode.TRIANGLE_STRIP,
    num: 4,
});
