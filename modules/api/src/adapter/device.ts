// luma.gl, MIT license
import StatsManager, {lumaStats} from '../utils/stats-manager';
import {log} from '../utils/log';
import {uid} from '../utils/utils';
import {TextureFormat} from './types/texture-formats';
import type {default as CanvasContext, CanvasContextProps} from './canvas-context';
import type {BufferProps} from './resources/buffer';
import Buffer from './resources/buffer';
import type {default as RenderPipeline, RenderPipelineProps} from './resources/render-pipeline';
import type {default as ComputePipeline, ComputePipelineProps} from './resources/compute-pipeline';
import type {default as Sampler, SamplerProps} from './resources/sampler';
import type {default as Shader, ShaderProps} from './resources/shader';
import type {default as Texture, TextureProps, TextureData} from './resources/texture';
import type {default as ExternalTexture, ExternalTextureProps} from './resources/external-texture';
import type {default as Framebuffer, FramebufferProps} from './resources/framebuffer';
import type {default as RenderPass, RenderPassProps} from './resources/render-pass';
import type {default as ComputePass, ComputePassProps} from './resources/compute-pass';

/** Device properties */
export type DeviceProps = {
  id?: string;

  type?: 'webgl' | 'webgl1' | 'webgl2' | 'webgpu' | 'best-available';

  // Common parameters
  canvas?: HTMLCanvasElement | OffscreenCanvas | string | null; // A canvas element or a canvas string id
  container?: HTMLElement | string | null;
  width?: number /** width is only used when creating a new canvas */;
  height?: number /** height is only used when creating a new canvas */;

  // WebGLDevice parameters
  webgl2?: boolean; // Set to false to not create a WebGL2 context (force webgl1)
  webgl1?: boolean; // set to false to not create a WebGL1 context (fails if webgl2 not available)

  // WebGLContext PARAMETERS - Can only be set on context creation...
  // alpha?: boolean; // Default render target has an alpha buffer.
  // depth?: boolean; // Default render target has a depth buffer of at least 16 bits.
  // stencil?: boolean; // Default render target has a stencil buffer of at least 8 bits.
  // antialias?: boolean; // Boolean that indicates whether or not to perform anti-aliasing.
  // premultipliedAlpha?: boolean; // Boolean that indicates that the page compositor will assume the drawing buffer contains colors with pre-multiplied alpha.
  // preserveDrawingBuffer?: boolean; // Default render target buffers will not be automatically cleared and will preserve their values until cleared or overwritten
  // failIfMajorPerformanceCaveat?: boolean; // Do not create if the system performance is low.

  // Unclear if these are still supported
  debug?: boolean; // Instrument context (at the expense of performance)
  manageState?: boolean; // Set to false to disable WebGL state management instrumentation
  break?: string[]; // TODO: types

  // @deprecated Attach to existing context
  gl?: WebGLRenderingContext | WebGL2RenderingContext | null;
};

export const DEFAULT_DEVICE_PROPS: Required<DeviceProps> = {
  id: null!,
  type: 'best-available',
  canvas: null,
  container: null,
  webgl2: true, // Attempt to create a WebGL2 context
  webgl1: true, // Attempt to create a WebGL1 context (false to fail if webgl2 not available)
  manageState: true,
  width: 800, // width are height are only used by headless gl
  height: 600,
  debug: Boolean(log.get('debug')), // Instrument context (at the expense of performance)
  break: [],

  // alpha: undefined,
  // depth: undefined,
  // stencil: undefined,
  // antialias: undefined,
  // premultipliedAlpha: undefined,
  // preserveDrawingBuffer: undefined,
  // failIfMajorPerformanceCaveat: undefined

  gl: null
};

export type ShadingLanguage = 'glsl' | 'wgsl';

/**
 * Identifies the GPU vendor and driver.
 * @see https://www.khronos.org/registry/webgl/extensions/WEBGL_debug_renderer_info/
 * @note Current WebGPU support is very limited
 */
export type DeviceInfo = {
  type: 'webgl' | 'webgl2' | 'webgpu';
  vendor: string;
  renderer: string;
  version: string;
  gpu: 'nvidia' | 'amd' | 'intel' | 'apple' | 'software' | 'unknown';
  shadingLanguages: ShadingLanguage[];
  shadingLanguageVersions: Record<string, string>;
  vendorMasked?: string;
  rendererMasked?: string;
};

/** Limits for a device */
export type DeviceLimits = {
  readonly maxTextureDimension1D?: number;
  readonly maxTextureDimension2D?: number;
  readonly maxTextureDimension3D?: number;
  readonly maxTextureArrayLayers?: number;
  readonly maxBindGroups: number;
  readonly maxDynamicUniformBuffersPerPipelineLayout: number;
  readonly maxDynamicStorageBuffersPerPipelineLayout: number;
  readonly maxSampledTexturesPerShaderStage: number;
  readonly maxSamplersPerShaderStage: number;
  readonly maxStorageBuffersPerShaderStage: number;
  readonly maxStorageTexturesPerShaderStage: number;
  readonly maxUniformBuffersPerShaderStage: number;
  readonly maxUniformBufferBindingSize: number;
  readonly maxStorageBufferBindingSize?: number;
  readonly minUniformBufferOffsetAlignment?: number;
  readonly minStorageBufferOffsetAlignment?: number;
  readonly maxVertexBuffers?: number;
  readonly maxVertexAttributes?: number;
  readonly maxVertexBufferArrayStride?: number;
  readonly maxInterStageShaderComponents?: number;
  readonly maxComputeWorkgroupStorageSize?: number;
  readonly maxComputeInvocationsPerWorkgroup?: number;
  readonly maxComputeWorkgroupSizeX?: number;
  readonly maxComputeWorkgroupSizeY?: number;
  readonly maxComputeWorkgroupSizeZ?: number;
  readonly maxComputeWorkgroupsPerDimension?: number;
};

export type WebGPUDeviceFeature =
  | 'depth-clip-control'
  | 'depth24unorm-stencil8'
  | 'depth32float-stencil8'
  | 'timestamp-query'
  | 'indirect-first-instance'
  | 'texture-compression-bc'
  | 'texture-compression-etc2'
  | 'texture-compression-astc';

// obsolete...
// 'depth-clamping' |
// 'depth24unorm-stencil8' |
// 'depth32float-stencil8' |
// 'pipeline-statistics-query' |
// 'timestamp-query' |
// 'texture-compression-bc'

export type WebGLDeviceFeature =
  | 'webgpu'
  | 'webgl2'
  | 'webgl'

  // api support (unify with WebGPU timestamp-query?)
  | 'timer-query-webgl'
  | 'uniform-buffers-webgl'
  | 'uniforms-webgl'

  // texture filtering
  | 'texture-filter-linear-float32-webgl'
  | 'texture-filter-linear-float16-webgl'
  | 'texture-filter-anisotropic-webgl'

  // texture rendering
  | 'texture-renderable-float32-webgl'
  | 'texture-renderable-float16-webgl'
  | 'texture-renderable-rgba32float-webgl' // TODO - remove

  // texture blending
  | 'texture-blend-float-webgl1'

  // texture format support
  | 'texture-formats-norm16-webgl'
  | 'texture-formats-srgb-webgl1'
  | 'texture-formats-depth-webgl1'
  | 'texture-formats-float32-webgl1'
  | 'texture-formats-float16-webgl1'

  // api support
  | 'vertex-array-object-webgl1'
  | 'instanced-rendering-webgl1'
  | 'multiple-render-targets-webgl1'
  | 'index-uint32-webgl1'
  | 'blend-minmax-webgl1'

  // glsl extensions
  | 'glsl-frag-data'
  | 'glsl-frag-depth'
  | 'glsl-derivatives'
  | 'glsl-texture-lod';

type WebGLCompressedTextureFeatures =
  | 'texture-compression-bc5-webgl'
  | 'texture-compression-etc1-webgl'
  | 'texture-compression-pvrtc-webgl'
  | 'texture-compression-atc-webgl';

/** Valid feature strings */
export type DeviceFeature =
  | WebGPUDeviceFeature
  | WebGLDeviceFeature
  | WebGLCompressedTextureFeatures;

/**
 * WebGPU Device/WebGL context abstraction
 */
export default abstract class Device {
  get [Symbol.toStringTag](): string {
    return 'Device';
  }

  constructor(props: DeviceProps) {
    this.props = {...DEFAULT_DEVICE_PROPS, ...props};
    this.id = this.props.id || uid(this[Symbol.toStringTag].toLowerCase());
  }

  readonly id: string;
  readonly statsManager: StatsManager = lumaStats;
  readonly props: Required<DeviceProps>;
  userData: {[key: string]: any} = {};

  /** Information about the device (vendor, versions etc) */
  abstract info: DeviceInfo;

  /** Optional capability discovery */
  abstract get features(): Set<DeviceFeature>;

  /** WebGPU style device limits */
  abstract get limits(): DeviceLimits;

  /** Check if device supports a specific texture format (creation and `nearest` sampling) */
  abstract isTextureFormatSupported(format: TextureFormat): boolean;

  /** Check if linear filtering (sampler interpolation) is supported for a specific texture format */
  abstract isTextureFormatFilterable(format: TextureFormat): boolean;

  /** Check if device supports rendering to a specific texture format */
  abstract isTextureFormatRenderable(format: TextureFormat): boolean;

  /** True context is already lost */
  abstract get isLost(): boolean;

  /** Promise that resolves when context is lost */
  abstract readonly lost: Promise<{reason: 'destroyed'; message: string}>;

  /** default canvas context */
  abstract canvasContext: CanvasContext | null;

  /** Creates a new CanvasContext (WebGPU only) */
  abstract createCanvasContext(props?: CanvasContextProps): CanvasContext;

  /** Call after rendering a frame (necessary e.g. on WebGL OffscreenCanvas) */
  abstract submit(): void;

  // Resource creation

  /** Create a buffer */
  createBuffer(props: BufferProps): Buffer;
  createBuffer(data: ArrayBuffer | ArrayBufferView): Buffer;

  createBuffer(props: BufferProps | ArrayBuffer | ArrayBufferView): Buffer {
    if (props instanceof ArrayBuffer || ArrayBuffer.isView(props)) {
      return this._createBuffer({data: props});
    }

    // TODO - fragile, as this is done before we merge with default options
    // inside the Buffer constructor

    // Deduce indexType
    if ((props.usage || 0) & Buffer.INDEX && !props.indexType) {
      if (props.data instanceof Uint32Array) {
        props.indexType = 'uint32';
      } else if (props.data instanceof Uint16Array) {
        props.indexType = 'uint16';
      }
    }
    return this._createBuffer(props);
  }

  /** Create a texture */
  createTexture(props: TextureProps): Texture;
  createTexture(data: Promise<TextureData>): Texture;
  createTexture(url: string): Texture;

  createTexture(props: TextureProps | Promise<TextureData> | string): Texture {
    // Signature: new Texture2D(gl, url | Promise)
    if (props instanceof Promise || typeof props === 'string') {
      props = {data: props};
    }
    return this._createTexture(props);
  }

  /** Create a temporary texture view of a video source */
  abstract createExternalTexture(props: ExternalTextureProps): ExternalTexture;

  /** Create a sampler */
  abstract createSampler(props: SamplerProps): Sampler;

  abstract createFramebuffer(props: FramebufferProps): Framebuffer;

  /** Create a shader */
  abstract createShader(props: ShaderProps): Shader;

  /** Create a render pipeline (aka program) */
  abstract createRenderPipeline(props: RenderPipelineProps): RenderPipeline;

  /** Create a compute pipeline (aka program) */
  abstract createComputePipeline(props: ComputePipelineProps): ComputePipeline;

  /** Create a RenderPass */
  abstract beginRenderPass(props: RenderPassProps): RenderPass;

  /** Create a ComputePass */
  abstract beginComputePass(props?: ComputePassProps): ComputePass;

  abstract getDefaultRenderPass(): RenderPass;

  // Implementation

  protected abstract _createBuffer(props: BufferProps): Buffer;
  protected abstract _createTexture(props: TextureProps): Texture;
}
