import {Sampler, SamplerProps} from '@luma.gl/api';
import type WebGPUDevice from '../webgpu-device';

export type WebGPUSamplerProps = SamplerProps & {
  handle?: GPUSampler;
}

/**
 *
 */
export default class WebGPUSampler extends Sampler {
  readonly device: WebGPUDevice;
  readonly handle: GPUSampler;

  constructor(device: WebGPUDevice, props: WebGPUSamplerProps) {
    super(device, props);
    this.device = device;

    // Prepare sampler props
    const samplerProps: Partial<WebGPUSamplerProps> = {...this.props};
    if (samplerProps.type !== 'comparison-sampler') {
      delete samplerProps.compare;
    }

    this.handle = this.handle || this.device.handle.createSampler(samplerProps);
    this.handle.label = this.props.id;
  }

  override destroy(): void {
    // this.handle.destroy();
  }
}
