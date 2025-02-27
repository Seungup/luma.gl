import {log, assert} from '@luma.gl/api';
import GL from '@luma.gl/constants';
import {assertWebGL2Context} from '@luma.gl/webgl';
import {withParameters} from '@luma.gl/webgl';
import {flipRows, scalePixels} from '../webgl-utils/typed-array-utils';
import {getTypedArrayFromGLType, getGLTypeFromTypedArray} from '../webgl-utils/typed-array-utils';
import {glFormatToComponents, glTypeToBytes} from '../webgl-utils/format-utils';
import {toFramebuffer} from '../webgl-utils/texture-utils';
import Buffer from './buffer';
// import Texture from '../adapter/resources/webgl-texture';
import Texture from './texture';
import Framebuffer from './framebuffer';

/**
 * Copies data from a type  or a Texture object into ArrayBuffer object.
 * App can provide targetPixelArray or have it auto allocated by this method
 *  newly allocated by this method unless provided by app.
 * @note Slow requires roundtrip to GPU
 *
 * @param source
 * @param options
 * @returns pixel array,
 */
export function readPixelsToArray(
  source: Framebuffer | Texture,
  options?: {
    sourceX?: number;
    sourceY?: number;
    sourceFormat?: number;
    sourceAttachment?: number;
    target?: Uint8Array | Uint16Array | Float32Array;
    // following parameters are auto deduced if not provided
    sourceWidth?: number;
    sourceHeight?: number;
    sourceType?: number;
  }
): Uint8Array | Uint16Array | Float32Array {
  const {sourceX = 0, sourceY = 0, sourceFormat = GL.RGBA} = options || {};
  let {
    sourceAttachment = GL.COLOR_ATTACHMENT0, // TODO - support gl.readBuffer
    target = null,
    // following parameters are auto deduced if not provided
    sourceWidth,
    sourceHeight,
    sourceType
  } = options || {};

  const {framebuffer, deleteFramebuffer} = getFramebuffer(source);
  assert(framebuffer);
  const {gl, handle} = framebuffer;
  sourceWidth = sourceWidth || framebuffer.width;
  sourceHeight = sourceHeight || framebuffer.height;

  // TODO - Set and unset gl.readBuffer
  if (sourceAttachment === GL.COLOR_ATTACHMENT0 && handle === null) {
    sourceAttachment = GL.FRONT;
  }

  const attachment = sourceAttachment - GL.COLOR_ATTACHMENT0;
  // assert(attachments[sourceAttachment]);

  // Deduce the type from color attachment if not provided.
  sourceType = sourceType || framebuffer.colorAttachments[attachment].type;

  // Deduce type and allocated pixelArray if needed
  target = getPixelArray(target, sourceType, sourceFormat, sourceWidth, sourceHeight);

  // Pixel array available, if necessary, deduce type from it.
  sourceType = sourceType || getGLTypeFromTypedArray(target);

  const prevHandle = gl.bindFramebuffer(GL.FRAMEBUFFER, handle);
  gl.readPixels(sourceX, sourceY, sourceWidth, sourceHeight, sourceFormat, sourceType, target);
  // @ts-expect-error
  gl.bindFramebuffer(GL.FRAMEBUFFER, prevHandle || null);
  if (deleteFramebuffer) {
    framebuffer.delete();
  }
  return target;
}

/**
 * Copies data from a Framebuffer or a Texture object into a Buffer object.
 * NOTE: doesn't wait for copy to be complete, it programs GPU to perform a DMA transffer.
 * @param source
 * @param options
 */
export function readPixelsToBuffer(
  source: Framebuffer | Texture,
  options?: {
    sourceX?: number;
    sourceY?: number;
    sourceFormat?: number;
    target?: Buffer; // A new Buffer object is created when not provided.
    targetByteOffset?: number; // byte offset in buffer object
    // following parameters are auto deduced if not provided
    sourceWidth?: number;
    sourceHeight?: number;
    sourceType?: number;
  }
): Buffer {
  const {sourceX = 0, sourceY = 0, sourceFormat = GL.RGBA,
    targetByteOffset = 0
  } = options || {};
    // following parameters are auto deduced if not provided
  let {
    target,
    sourceWidth,
    sourceHeight,
    sourceType,
  } = options || {}
  const {framebuffer, deleteFramebuffer} = getFramebuffer(source);
  assert(framebuffer);
  sourceWidth = sourceWidth || framebuffer.width;
  sourceHeight = sourceHeight || framebuffer.height;

  // Asynchronous read (PIXEL_PACK_BUFFER) is WebGL2 only feature
  const gl2 = assertWebGL2Context(framebuffer.gl);

  // deduce type if not available.
  sourceType = sourceType || (target ? target.type : GL.UNSIGNED_BYTE);

  if (!target) {
    // Create new buffer with enough size
    const components = glFormatToComponents(sourceFormat);
    const byteCount = glTypeToBytes(sourceType);
    const byteLength = targetByteOffset + sourceWidth * sourceHeight * components * byteCount;
    target = new Buffer(gl2, {byteLength, accessor: {type: sourceType, size: components}});
  }

  // @ts-expect-error
  target.bind({target: GL.PIXEL_PACK_BUFFER});
  withParameters(gl2, {framebuffer}, () => {
    gl2.readPixels(
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      sourceFormat,
      sourceType,
      targetByteOffset
    );
  });
  target.unbind({target: GL.PIXEL_PACK_BUFFER});
  if (deleteFramebuffer) {
    framebuffer.delete();
  }

  return target;
}

// Reads pixels from a Framebuffer or Texture object to a dataUrl
export function copyToDataUrl(
  source,
  options?: {
    sourceAttachment?: number; // TODO - support gl.readBuffer
    targetMaxHeight?: number;
  }
): string;

// Reads pixels from a Framebuffer or Texture object to a dataUrl
export function copyToDataUrl(
  source,
  {
    sourceAttachment = GL.COLOR_ATTACHMENT0, // TODO - support gl.readBuffer
    targetMaxHeight = Number.MAX_SAFE_INTEGER
  } = {}
) {
  let data = readPixelsToArray(source, {sourceAttachment});

  // Scale down
  let {width, height} = source;
  while (height > targetMaxHeight) {
    ({data, width, height} = scalePixels({data, width, height}));
  }

  // Flip to top down coordinate system
  flipRows({data, width, height});

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  // Copy the pixels to a 2D canvas
  const imageData = context.createImageData(width, height);
  imageData.data.set(data);
  context.putImageData(imageData, 0, 0);

  return canvas.toDataURL();
}

// Reads pixels from a Framebuffer or Texture object into an HTML Image
// Reads pixels from a Framebuffer or Texture object into an HTML Image
export function copyToImage(
  source: Framebuffer | Texture,
  options?: {
    sourceAttachment?: number; // TODO - support gl.readBuffer
    targetImage?: typeof Image;
  }
): typeof Image {
  const dataUrl = copyToDataUrl(source, {sourceAttachment: options?.sourceAttachment || GL.COLOR_ATTACHMENT0});
  const targetImage = options?.targetImage || new Image();
  // @ts-expect-error
  targetImage.src = dataUrl;
  // @ts-expect-error
  return targetImage;
}

/**
 * Copy a rectangle from a Framebuffer or Texture object into a texture (at an offset)
 */
// eslint-disable-next-line complexity, max-statements
export function copyToTexture(
  source: Framebuffer | Texture,
  target: Texture | GL,
  options?: {
    sourceX?: number;
    sourceY?: number;

    targetX?: number;
    targetY?: number;
    targetZ?: number;
    targetMipmaplevel?: number;
    targetInternalFormat?: number;

    width?: number; // defaults to target width
    height?: number; // defaults to target height
  }
): Texture {
  const {
    sourceX = 0,
    sourceY = 0,
    // attachment = GL.COLOR_ATTACHMENT0, // TODO - support gl.readBuffer
    targetMipmaplevel = 0,
    targetInternalFormat = GL.RGBA
  } = options || {};
  let {
    targetX,
    targetY,
    targetZ,
    width, // defaults to target width
    height // defaults to target height
  } = options || {};

  const {framebuffer, deleteFramebuffer} = getFramebuffer(source);
  assert(framebuffer);
  const {gl, handle} = framebuffer;
  const isSubCopy =
    typeof targetX !== 'undefined' ||
    typeof targetY !== 'undefined' ||
    typeof targetZ !== 'undefined';
  targetX = targetX || 0;
  targetY = targetY || 0;
  targetZ = targetZ || 0;
  const prevHandle = gl.bindFramebuffer(GL.FRAMEBUFFER, handle);
  // TODO - support gl.readBuffer (WebGL2 only)
  // const prevBuffer = gl.readBuffer(attachment);
  assert(target);
  let texture = null;
  let textureTarget: GL;
  if (target instanceof Texture) {
    texture = target;
    width = Number.isFinite(width) ? width : texture.width;
    height = Number.isFinite(height) ? height : texture.height;
    texture.bind(0);
    textureTarget = texture.target;
  } else {
    textureTarget = target;
  }

  if (!isSubCopy) {
    gl.copyTexImage2D(
      textureTarget,
      targetMipmaplevel,
      targetInternalFormat,
      sourceX,
      sourceY,
      width,
      height,
      0 /* border must be 0 */
    );
  } else {
    switch (textureTarget) {
      case GL.TEXTURE_2D:
      case GL.TEXTURE_CUBE_MAP:
        gl.copyTexSubImage2D(
          textureTarget,
          targetMipmaplevel,
          targetX,
          targetY,
          sourceX,
          sourceY,
          width,
          height
        );
        break;
      case GL.TEXTURE_2D_ARRAY:
      case GL.TEXTURE_3D:
        const gl2 = assertWebGL2Context(gl);
        gl2.copyTexSubImage3D(
          textureTarget,
          targetMipmaplevel,
          targetX,
          targetY,
          targetZ,
          sourceX,
          sourceY,
          width,
          height
        );
        break;
      default:
    }
  }
  if (texture) {
    texture.unbind();
  }
  // @ts-expect-error
  gl.bindFramebuffer(GL.FRAMEBUFFER, prevHandle || null);
  if (deleteFramebuffer) {
    framebuffer.delete();
  }
  return texture;
}

/**
 * Copies a rectangle of pixels between Framebuffer or Texture objects
 * @note NOTE: WEBLG2 only
 * @param source
 * @param target
 * @param options
 */
// eslint-disable-next-line max-statements, complexity
export function blit(
  source,
  target,
  options: {
    sourceAttachment?: number;
    sourceX0?: number;
    sourceY0?: number;
    sourceX1?: number;
    sourceY1?: number;
    targetX0?: number;
    targetY0?: number;
    targetX1?: number;
    targetY1?: number;
    color?: boolean;
    depth?: boolean;
    stencil?: boolean;
    mask?: number;
    filter?: number;
  }
): void {
  const {
    sourceX0 = 0,
    sourceY0 = 0,
    targetX0 = 0,
    targetY0 = 0,
    color = true,
    depth = false,
    stencil = false,
    filter = GL.NEAREST
  } = options;

  let {
    sourceX1,
    sourceY1,
    targetX1,
    targetY1,
    sourceAttachment = GL.COLOR_ATTACHMENT0,
    mask = 0
  } = options;

  const {framebuffer: srcFramebuffer, deleteFramebuffer: deleteSrcFramebuffer} =
    getFramebuffer(source);
  const {framebuffer: dstFramebuffer, deleteFramebuffer: deleteDstFramebuffer} =
    getFramebuffer(target);

  assert(srcFramebuffer);
  assert(dstFramebuffer);
  const {gl, handle, width, height, readBuffer} = dstFramebuffer;
  const gl2 = assertWebGL2Context(gl);

  if (!srcFramebuffer.handle && sourceAttachment === GL.COLOR_ATTACHMENT0) {
    sourceAttachment = GL.FRONT;
  }

  if (color) {
    mask |= GL.COLOR_BUFFER_BIT;
  }
  if (depth) {
    mask |= GL.DEPTH_BUFFER_BIT;
  }
  if (stencil) {
    mask |= GL.STENCIL_BUFFER_BIT;
  }

  if (deleteSrcFramebuffer || deleteDstFramebuffer) {
    // Either source or destiantion was a texture object, which is wrapped in a Framebuffer objecgt as color attachment.
    // Overwrite the mask to `COLOR_BUFFER_BIT`
    if (mask & (GL.DEPTH_BUFFER_BIT | GL.STENCIL_BUFFER_BIT)) {
      mask = GL.COLOR_BUFFER_BIT;
      log.warn('Blitting from or into a Texture object, forcing mask to GL.COLOR_BUFFER_BIT')();
    }
  }
  assert(mask);

  sourceX1 = sourceX1 === undefined ? srcFramebuffer.width : sourceX1;
  sourceY1 = sourceY1 === undefined ? srcFramebuffer.height : sourceY1;
  targetX1 = targetX1 === undefined ? width : targetX1;
  targetY1 = targetY1 === undefined ? height : targetY1;

  const prevDrawHandle = gl.bindFramebuffer(GL.DRAW_FRAMEBUFFER, handle);
  const prevReadHandle = gl.bindFramebuffer(GL.READ_FRAMEBUFFER, srcFramebuffer.handle);
  gl2.readBuffer(sourceAttachment);
  gl2.blitFramebuffer(
    sourceX0,
    sourceY0,
    sourceX1,
    sourceY1,
    targetX0,
    targetY0,
    targetX1,
    targetY1,
    mask,
    filter
  );
  gl2.readBuffer(readBuffer);
  // @ts-expect-error
  gl2.bindFramebuffer(GL.READ_FRAMEBUFFER, prevReadHandle || null);
  // @ts-expect-error
  gl2.bindFramebuffer(GL.DRAW_FRAMEBUFFER, prevDrawHandle || null);
  if (deleteSrcFramebuffer) {
    srcFramebuffer.delete();
  }
  if (deleteDstFramebuffer) {
    dstFramebuffer.delete();
  }

  // return dstFramebuffer;
}

// Helper methods

function getFramebuffer(source): {framebuffer: Framebuffer, deleteFramebuffer: boolean} {
  if (!(source instanceof Framebuffer)) {
    return {framebuffer: toFramebuffer(source), deleteFramebuffer: true};
  }
  return {framebuffer: source, deleteFramebuffer: false};
}

function getPixelArray(pixelArray, type, format, width: number, height: number): Uint8Array | Uint16Array | Float32Array {
  if (pixelArray) {
    return pixelArray;
  }
  // Allocate pixel array if not already available, using supplied type
  type = type || GL.UNSIGNED_BYTE;
  const ArrayType = getTypedArrayFromGLType(type, {clamped: false});
  const components = glFormatToComponents(format);
  // TODO - check for composite type (components = 1).
  return new ArrayType(width * height * components) as Uint8Array | Uint16Array | Float32Array;
}
