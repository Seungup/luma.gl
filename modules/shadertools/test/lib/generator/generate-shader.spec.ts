import test from 'tape-promise/tape';
import {ShaderModule, generateGLSLForModule, generateWGSLForModule} from '@luma.gl/shadertools';
import {GLSLGenerationOptions} from 'modules/shadertools/dist';

let module: ShaderModule = {
  name: 'test',
  uniformFormats: {
    uProjectMatrix: 'mat4x4<f32>',
    uViewMatrix: 'mat4x4<f32>',
    uClipped: 'f32',
  },
};

const TEST_CASES: {module: ShaderModule; options: GLSLGenerationOptions, result: string}[] = [
  {
    module, 
    options: {uniforms: 'uniforms'}, 
    result: `\
uniform mat4 test_uProjectMatrix;
uniform mat4 test_uViewMatrix;
uniform float test_uClipped;
`
  },
  {
    module, 
    options: {uniforms: 'unscoped-interface-blocks'}, 
    result: `\
uniform Test {
  mat4 test_uProjectMatrix;
  mat4 test_uViewMatrix;
  float test_uClipped;
};
`
  },
  {
    module, 
    options: {uniforms: 'scoped-interface-blocks'}, 
    result: `\
uniform Test {
  mat4 uProjectMatrix;
  mat4 uViewMatrix;
  float uClipped;
} test;
`
  },
];


test('shadertools#generateGLSLForModule', (t) => {
  for (const tc of TEST_CASES) {
    const glsl = generateGLSLForModule(tc.module, tc.options);
    t.equal(glsl, tc.result, JSON.stringify(tc.options));
  }
  t.end();
});
