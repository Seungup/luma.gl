// luma.gl, MIT license
import type {TypedArray, VertexFormat} from '@luma.gl/api';

/** Holds one geometry */
export type GeometryTable = {
  length: number;
  schema?: Record<string, VertexFormat>;
  attributes: {
    POSITION: TypedArray,
    NORMAL: TypedArray,
    TEXCOORD_0: TypedArray,
    [key: string]: TypedArray,
  };
  indices?: Uint16Array | Uint32Array;
  topology?: 'point-list' | 'line-list' | 'line-strip' | 'triangle-list' | 'triangle-strip';
}
