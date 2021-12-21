import type {TextureFormat, CanvasContextProps} from '@luma.gl/api';
import {CanvasContext} from '@luma.gl/api';

/** 
 * Holds a WebGPU Canvas Context which handles resizing etc 
 */
export default class WebGPUCanvasContext extends CanvasContext {
  readonly device: GPUDevice;
  readonly context: GPUCanvasContext;
  readonly presentationFormat: TextureFormat;
  presentationSize: [number, number];
  depthStencilFormat: TextureFormat = 'depth24plus';
  sampleCount: number = 1;

  /** Prepare render pass attachments for this context */
  renderTarget: GPUTexture;
  depthStencilTarget: GPUTexture
  depthStencilView: GPUTextureView;

  constructor(device: GPUDevice, adapter: GPUAdapter, props: CanvasContextProps) {
    super(props);
    this.device = device;
    this.context = this.canvas.getContext('webgpu');
    this.presentationFormat = this.context.getPreferredFormat(adapter);
    this.presentationSize = [-1, -1];
    this.update();
  }

  /** Resizes and updates render targets if necessary */
  update() {
    const size = this.getPixelSize();

    const sizeChanged = size[0] !== this.presentationSize[0] || size[1] !== this.presentationSize[1];

    if (sizeChanged) {
      this.presentationSize = size;

      // Reconfigure the canvas size.
      // https://www.w3.org/TR/webgpu/#canvas-configuration
      this.context.configure({
        device: this.device,
        format: this.presentationFormat,
        size: this.presentationSize,
        // colorSpace: "srgb"; // GPUPredefinedColorSpace 
        // compositingAlphaMode = "opaque"; | 'premultiplied'
      });

      // Destroy any previous render targets
      if (this.renderTarget !== undefined) {
        this.renderTarget.destroy();
      }

      if (this.depthStencilTarget !== undefined) {
        this.renderTarget.destroy();
      }
    }
  }


  // WebGPU specific API
  /** Return fresh texture views */
  getRenderTargets() {
    this._createRenderTargets();
    return {
      colorAttachment: this.context.getCurrentTexture().createView(),
      depthStencil: this.depthStencilView
    };
  }
  
  /** We build render targets on demand (i.e. not when size changes but when about to render) */
  _createRenderTargets(): void {
    if (!this.renderTarget) {
      this.renderTarget = this.device.createTexture({
        label: 'render-target',
        size: this.presentationSize,
        sampleCount: this.sampleCount,
        format: this.presentationFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }

    if (!this.depthStencilTarget) {
      this.depthStencilTarget = this.device.createTexture({
        label: 'depth-stencil-target',
        size: this.presentationSize,
        format: this.depthStencilFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT
      });

      this.depthStencilView = this.depthStencilTarget.createView({
        label: 'depth-stencil-attachment'
      });
    }
  }
}
