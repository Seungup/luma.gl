import React from 'react';
import {LumaExample} from '../../react-luma';
import AnimationLoopTemplate from '../../../../examples/getting-started/hello-cube/app';

export class HelloCubeExample extends React.Component {
  render() {
    const { pageContext } = this.props;
    const exampleConfig = (pageContext && pageContext.exampleConfig) || {};
    return (
      <LumaExample name="hello-cube" AnimationLoopTemplate={AnimationLoopTemplate} exampleConfig={exampleConfig} />
    );
  }
}
