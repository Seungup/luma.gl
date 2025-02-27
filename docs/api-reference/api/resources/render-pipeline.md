# RenderPipeline

> The luma.gl v9 API is currently in [public review](/docs/public-review).

A `RenderPipeline` contains a matched pair of vertex and fragment [shaders](/docs/api-reference/api/resources/shader) that can be exectued on the GPU by calling `RenderPipeline.draw()`. handle compilation and linking of shaders, and store uniform values. They provide `draw` call which allows the application to run the shaders on specified input data.

A RenderPipeline controls the vertex and fragment shader stages, and can be used in GPURenderPassEncoder as well as GPURenderBundleEncoder.

Render pipeline inputs are:
- bindings, according to the given bindingLayout
- vertex and index buffers
- the color attachments, Framebuffer
- the optional depth-stencil attachment, described by Framebuffer
- parameters

Render pipeline outputs are:
- buffer bindings with a type of "storage"
- storageTexture bindings with a access of "write-only"
- the color attachments, described by Framebuffer
- the depth-stencil optional attachment, described by Framebuffer

A render pipeline is comprised of the following render stages:
- Vertex fetch, from the buffers buffers
- Vertex shader, props.vs
- Primitive assembly, controlled by
- Rasterization controlled by parameters (GPUPrimitiveState, GPUDepthStencilState, and GPUMultisampleState)
- Fragment shader, controlled by props.fs
- Stencil test and operation, controlled by GPUDepthStencilState
- Depth test and write, controlled by GPUDepthStencilState
- Output merging, controlled by GPUFragmentState.targets

## Usage

Creating a pipeline

```typescript
const pipeline = device.createRenderPipeline({
  id: 'my-pipeline',
  vs: vertexShaderSourceString,
  fs: fragmentShaderSourceString
});
```

Set or update uniforms, in this case world and projection matrices

```typescript
pipeline.setUniforms({
  uMVMatrix: view,
  uPMatrix: projection
});
```

Create a `VertexArray` to store buffer values for the vertices of a triangle and drawing

```typescript
const pipeline = device.createRenderPipeline({vs, fs});

const vertexArray = new VertexArray(gl, {pipeline});

vertexArray.setAttributes({
  aVertexPosition: new Buffer(gl, {data: new Float32Array([0, 1, 0, -1, -1, 0, 1, -1, 0])})
});

pipeline.draw({vertexArray, ...});
```

Creating a pipeline for transform feedback, specifying which varyings to use

```typescript
const pipeline = device.createRenderPipeline({vs, fs, varyings: ['gl_Position']});
```

## Members

- `gl` : `WebGLRenderingContext`
- `handle` : `WebGLProgram` - The WebGL `WebGLProgram` instance.
- `id` : `String` - `id` string for debugging.

## Constructor

### RenderPipeline(gl : WebGLRenderingContext, props : Object)

Creates a new pipeline using the supplied vertex and fragment shaders. The shaders are compiled into WebGLShaders and is created and the shaders are linked.

```typescript
const pipeline = device.createRenderPipeline({
  id: 'my-identifier',
  vs: vertexShaderSource,
  fs: fragmentShaderSource,
  varyings: ['gl_Position', 'vColor']
});
```

- `id` (`string`, optional) - string id (to help indentify the pipeline during debugging).
- `vs` (`VertexShader`|`String`) - A vertex shader object, or source as a string.
- `fs` (`FragmentShader`|`String`) - A fragment shader object, or source as a string.
- `varyings` WebGL 2 (`String[]`) - a list of names of varyings.
- `bufferMode`=`GL.SEPARATE_ATTRIBS` WebGL 2 (`GLenum`) - Optional, specifies how transform feedback should store the varyings.

| `GL.TRANSFORM_FEEDBACK_BUFFER_MODE` | Description                  |
| ----------------------------------- | ---------------------------- |
| `GL.SEPARATE_ATTRIBS`               | One varying per buffer       |
| `GL.INTERLEAVED_ATTRIBS`            | Multiple varyings per buffer |

WebGL References [WebGLProgram](https://developer.mozilla.org/en-US/docs/Web/API/WebGLProgram), [gl.createProgram](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/createProgram)

### delete() : RenderPipeline

Deletes resources held by pipeline. Note: Does not currently delete shaders (to enable shader caching).

## Methods

### initialize(props : Object) : RenderPipeline

Relinks a pipeline. Takes the same options as the constructor

### setUniforms(uniforms : Object) : RenderPipeline

Sets named uniforms from a map, ignoring names

- `key` (_String_) - The name of the uniform to be set. The name of the uniform will be matched with the name of the uniform declared in the shader. You can set more uniforms on the RenderPipeline than its shaders use, the extra uniforms will simply be ignored.
- `value` (_mixed_) - The value to be set. Can be a float, an array of floats, a typed array, a boolean, `Texture` etc. The values must match the declarations in the shader.

[gl.useProgram](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/useProgram)

### draw(opts) : RenderPipeline

`RenderPipeline.draw` is the entry point for running shaders, rendering and (optionally calculating data using transform feedback techniques).

```typescript
  RenderPipeline.draw({
    vertexArray,

    uniforms = {},
    transformFeedback = null,
    samplers = {},
    parameters = {},

    drawMode = GL.TRIANGLES,
    vertexCount,
    offset = 0,
    isIndexed = false,
    indexType = GL.UNSIGNED_SHORT,
    isInstanced = false,
    instanceCount = 0,

    start = 0,
    end=
  })
```

Main parameters

- `vertexArray` - a `VertexArray` object that will be bound and unbound before and after the draw call.
- `uniforms`=`{}` - a map of uniforms that will be set just before the draw call (and remain set after the call).
- `samplers`=`{}` - a map of texture `Sampler`s that will be bound before the draw call.
- `parameters` - temporary gl settings to be applied to this draw call.
- `transformFeedback`=`null` - optional `TransformFeedback` object containing buffers that will receive the output of the transform feedback operation.

Potentially autodeduced parameters

- `drawMode`=`GL.TRIANGLES` - geometry primitive format of vertex data
- `vertexCount` - number of vertices to draw
- `offset`=`0` - first vertex to draw
- `isIndexed`=`false` - use indices in the "elements" buffer
- `indexType`=`GL.UNSIGNED_SHORT` - must match the type of the "elements" buffer
- `isInstanced`=`false` - Set to enable instanced rendering.
- `instanceCount`=`0` - Number of instances

Parameters for drawing a limited range (WebGL 2 only)

- `start` - hint to GPU, activates `gl.drawElementsRange` (WebGL 2)
- `end` - hint to GPU, activates `gl.drawElementsRange` (WebGL 2)

Returns: `true` if successful, `false` if draw call is blocked due to missing resources.

Notes:

- Runs the shaders in the pipeline, on the attributes and uniforms.
- Indexed rendering uses the element buffer (`GL.ELEMENT_ARRAY_BUFFER`), make sure your attributes or `VertexArray` contains one.
- If a `TransformFeedback` object is supplied, `transformFeedback.begin()` and `transformFeedback.end()` will be called before and after the draw call.
- A `Sampler` will only be bound if there is a matching Texture with the same key in the supplied `uniforms` object.
- Once a uniform is set, it's size should not be changed. This is only a concern for array uniforms.

The following WebGL APIs are called in this function:

# RenderPipeline

> The luma.gl v9 API is currently in [public review](/docs/public-review).

A `RenderPipeline` contains a matched pair of vertex and fragment [shaders](/docs/api-reference/api/resources/shader) that can be exectued on the GPU by calling `RenderPipeline.draw()`. Programs handle compilation and linking of shaders, and store uniform values. They provide `draw` call which allows the application to run the shaders on specified input data.

## Usage

Creating a pipeline

```typescript
const pipeline = device.createRenderPipeline({
  id: 'my-pipeline',
  vs: vertexShaderSourceString,
  fs: fragmentShaderSourceString
});
```

Set or update uniforms, in this case world and projection matrices

```typescript
pipeline.setUniforms({
  uMVMatrix: view,
  uPMatrix: projection
});
```

Create a `VertexArray` to store buffer values for the vertices of a triangle and drawing

```typescript
const pipeline = device.createRenderPipeline({vs, fs});

const vertexArray = new VertexArray(gl, {pipeline});

vertexArray.setAttributes({
  aVertexPosition: new Buffer(gl, {data: new Float32Array([0, 1, 0, -1, -1, 0, 1, -1, 0])})
});

pipeline.draw({vertexArray, ...});
```

Creating a pipeline for transform feedback, specifying which varyings to use

```typescript
const pipeline = device.createRenderPipeline({vs, fs, varyings: ['gl_Position']});
```

## Members

- `device`: `Device` - holds a reference to the `Device` that created this `Buffer`.
- `handle`: `unknown` - holds the underlying WebGL or WebGPU shader object
- `props`: `BufferProps` - holds a copy of the `BufferProps` used to create this `Buffer`.

## Methods

### `constructor(props: BufferProps)`

`Buffer` is an abstract class and cannot be instantiated directly. Create with `device.createBuffer(...)`.

### `destroy(): void`

Free up any GPU resources associated with this buffer immediately (instead of waiting for garbage collection).

## Members

- `gl` : `WebGLRenderingContext`
- `handle` : `WebGLProgram` - The WebGL `WebGLProgram` instance.
- `id` : `String` - `id` string for debugging.

## Constructor

### RenderPipeline(gl : WebGLRenderingContext, props : Object)

Creates a new pipeline using the supplied vertex and fragment shaders. The shaders are compiled into WebGLShaders and is created and the shaders are linked.

```typescript
const pipeline = device.createRenderPipeline({
  id: 'my-identifier',
  vs: vertexShaderSource,
  fs: fragmentShaderSource,
  varyings: ['gl_Position', 'vColor']
});
```

- `id` (`string`, optional) - string id (to help indentify the pipeline during debugging).
- `vs` (`VertexShader`|`String`) - A vertex shader object, or source as a string.
- `fs` (`FragmentShader`|`String`) - A fragment shader object, or source as a string.
- `varyings` WebGL 2 (`String[]`) - a list of names of varyings.
- `bufferMode`=`GL.SEPARATE_ATTRIBS` WebGL 2 (`GLenum`) - Optional, specifies how transform feedback should store the varyings.

| `GL.TRANSFORM_FEEDBACK_BUFFER_MODE` | Description                  |
| ----------------------------------- | ---------------------------- |
| `GL.SEPARATE_ATTRIBS`               | One varying per buffer       |
| `GL.INTERLEAVED_ATTRIBS`            | Multiple varyings per buffer |

WebGL References [WebGLProgram](https://developer.mozilla.org/en-US/docs/Web/API/WebGLProgram), [gl.createProgram](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/createProgram)

### delete() : RenderPipeline

Deletes resources held by pipeline. Note: Does not currently delete shaders (to enable shader caching).

## Methods

### initialize(props : Object) : RenderPipeline

Relinks a pipeline. Takes the same options as the constructor

### setUniforms(uniforms : Object) : RenderPipeline

Sets named uniforms from a map, ignoring names

- `key` (_String_) - The name of the uniform to be set. The name of the uniform will be matched with the name of the uniform declared in the shader. You can set more uniforms on the RenderPipeline than its shaders use, the extra uniforms will simply be ignored.
- `value` (_mixed_) - The value to be set. Can be a float, an array of floats, a typed array, a boolean, `Texture` etc. The values must match the declarations in the shader.

[gl.useProgram](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/useProgram)

### draw(opts) : RenderPipeline

`RenderPipeline.draw` is the entry point for running shaders, rendering and (optionally calculating data using transform feedback techniques).

```typescript
  RenderPipeline.draw({
    vertexArray,

    uniforms = {},
    transformFeedback = null,
    samplers = {},
    parameters = {},

    drawMode = GL.TRIANGLES,
    vertexCount,
    offset = 0,
    isIndexed = false,
    indexType = GL.UNSIGNED_SHORT,
    isInstanced = false,
    instanceCount = 0,

    start = 0,
    end=
  })
```

Main parameters

- `vertexArray` - a `VertexArray` object that will be bound and unbound before and after the draw call.
- `uniforms`=`{}` - a map of uniforms that will be set just before the draw call (and remain set after the call).
- `samplers`=`{}` - a map of texture `Sampler`s that will be bound before the draw call.
- `parameters` - temporary gl settings to be applied to this draw call.
- `transformFeedback`=`null` - optional `TransformFeedback` object containing buffers that will receive the output of the transform feedback operation.

Potentially autodeduced parameters

- `drawMode`=`GL.TRIANGLES` - geometry primitive format of vertex data
- `vertexCount` - number of vertices to draw
- `offset`=`0` - first vertex to draw
- `isIndexed`=`false` - use indices in the "elements" buffer
- `indexType`=`GL.UNSIGNED_SHORT` - must match the type of the "elements" buffer
- `isInstanced`=`false` - Set to enable instanced rendering.
- `instanceCount`=`0` - Number of instances

Parameters for drawing a limited range (WebGL 2 only)

- `start` - hint to GPU, activates `gl.drawElementsRange` (WebGL 2)
- `end` - hint to GPU, activates `gl.drawElementsRange` (WebGL 2)

Returns: `true` if successful, `false` if draw call is blocked due to missing resources.

Notes:

- Runs the shaders in the pipeline, on the attributes and uniforms.
- Indexed rendering uses the element buffer (`GL.ELEMENT_ARRAY_BUFFER`), make sure your attributes or `VertexArray` contains one.
- If a `TransformFeedback` object is supplied, `transformFeedback.begin()` and `transformFeedback.end()` will be called before and after the draw call.
- A `Sampler` will only be bound if there is a matching Texture with the same key in the supplied `uniforms` object.
- Once a uniform is set, it's size should not be changed. This is only a concern for array uniforms.

The following WebGL APIs are called in this function:

## Constants

### Limits

| Limit                                                | Value          | Description |
| ---------------------------------------------------- | -------------- | ----------- |
| `GL.MAX_VERTEX_TEXTURE_IMAGE_UNITS`                  | >= 0 (GLint)   |             |
| `GL.MAX_RENDERBUFFER_SIZE`                           | >= 1 (GLint)   |             |
| `GL.MAX_VARYING_VECTORS`                             | >= 8 (GLint)   |             |
| `GL.MAX_VERTEX_ATTRIBS`                              | >= 8 (GLint)   |             |
| `GL.MAX_VERTEX_UNIFORM_VECTORS`                      | >= 128 (GLint) |             |
| `GL.MAX_FRAGMENT_UNIFORM_VECTORS`                    | >= 16 (GLint)  |             |
| `GL.TRANSFORM_FEEDBACK_VARYING_MAX_LENGTH` (WebGL 2) | -              | -           |

