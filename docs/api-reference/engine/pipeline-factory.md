# PipelineFactory

The `PipelineFactory` manages the creation and caching of programs. It allows the application to request a program based on a vertex shader, fragment shader and set of defines, modules and code injections. The `PipelineFactory` will return the requested program, creating it the first time, and re-using a cached version if it is requested more than once. It also allows for the definition of hook functions and module code injections to be inserted into shaders.

## Usage

```typescript
import {PipelineFactor} from '@luma.gl/engine';
const pf = new PipelineFactory(gl);

const vs = `
attribute vec4 position;

void main() {
#ifdef MY_DEFINE
  gl_Position = position;
#else
  gl_Position = position.wzyx;
#endif
}
`;

const fs = `
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  MY_SHADER_HOOK(gl_FragColor);
}
`;

pf.addShaderHook('fs:MY_SHADER_HOOK(inout vec4 color)');

pf.addDefaultModule(dirlight); // Will be included in all following programs

const pipeline1 = pf.get({vs, fs}); // Basic, no defines, only default module
const program2 = pf.get({vs, fs}); // Cached, same as pipeline 1, use count 2
const program3 = pf.get({
  // New pipeline, with different source based on define
  vs,
  fs,
  defines: {
    MY_DEFINE: true
  }
});

const program4 = pf.get({
  // New pipeline, with different source based on module and its injection
  vs,
  fs,
  defines: {
    MY_DEFINE: true
  },
  modules: [picking]
});

const program5 = pf.get({
  // Cached, same as pipeline 4, use count 2
  vs,
  fs,
  defines: {
    MY_DEFINE: true
  },
  modules: [picking]
});

pf.release(program1); // Cached pipeline still available, use count 1
pf.release(program2); // Cached pipeline deleted
pf.release(program3); // Cached pipeline deleted
pf.release(program4); // Cached pipeline still available, use count 1
pf.release(program5); // Cached pipeline deleted
```

## Methods

### get(opts: Object): Program

Get a program that fits the parameters provided. If one is already cached, return it, otherwise create and cache a new one.
`opts` can include the following (see `assembleShaders` for details):

- `vs`: Base vertex shader source.
- `fs`: Base fragment shader source.
- `defines`: Object indicating `#define` constants to include in the shaders.
- `modules`: Array of module objects to include in the shaders.
- `inject`: Object of hook injections to include in the shaders.
- `transpileToGLSL100`: Transpile shaders to GLSL 1.0.

### `addDefaultModule(module: Object)`

Add a module that will automatically be added to any programs created by the program manager.

### `removeDefaultModule(module: Object)`

Remove a module that is automatically being added to programs created by the program manager.

### `addShaderHook(hook: String, [opts: Object])`

Creates a shader hook function that shader modules can injection code into. Shaders can call these functions, which will be no-ops by default. If a shader module injects code it will be executed upon the hook function call. This mechanism allows the application to create shaders that can be automatically extended by included shader modules.

- `hook`: `vs:` or `fs:` followed by the name and arguments of the function, e.g. `vs:MYHOOK_func(inout vec4 value)`. Hook name without arguments
  will also be used as the name of the shader hook
- `opts.header` (optional): code always included at the beginning of a hook function
- `opts.footer` (optional): code always included at the end of a hook function

### getUniforms(program: Program): Object

Returns an object containing all the uniforms defined for the program. Returns `null` if `program` isn't managed by the `PipelineFactory`.

### release(program: Program)

Indicate that a program is no longer in use. When all references to a program are released, the program is deleted.
