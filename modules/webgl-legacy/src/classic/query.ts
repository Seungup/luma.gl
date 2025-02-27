// WebGL2 Query (also handles disjoint timer extensions)
import {assert, ResourceProps} from '@luma.gl/api';
import {WebGLDevice, WebGLResource} from '@luma.gl/webgl';
import {isWebGL2} from '@luma.gl/webgl';

const GL_QUERY_RESULT = 0x8866; // Returns a GLuint containing the query result.
const GL_QUERY_RESULT_AVAILABLE = 0x8867; // whether query result is available.

const GL_TIME_ELAPSED_EXT = 0x88bf; // Elapsed time (in nanoseconds).
const GL_GPU_DISJOINT_EXT = 0x8fbb; // Whether GPU performed any disjoint operation.

const GL_TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN = 0x8c88; // #primitives written to feedback buffers
const GL_ANY_SAMPLES_PASSED = 0x8c2f; // Occlusion query (if drawing passed depth test)
const GL_ANY_SAMPLES_PASSED_CONSERVATIVE = 0x8d6a; // Occlusion query less accurate/faster version

export type QueryProps = ResourceProps & {
};

/**
 * Asynchronous queries for different kinds of information
 */
export default class Query extends WebGLResource<QueryProps> {
 override get [Symbol.toStringTag](): string { return 'Query'; }

  // Returns true if Query is supported by the WebGL implementation
  // Can also check whether timestamp queries are available.
  static isSupported(gl: WebGLRenderingContext, options: string[] = []): boolean {
    const webgl2 = isWebGL2(gl);

    // Initial value
    const webglDevice = WebGLDevice.attach(gl);
    const hasTimerQuery = webglDevice.features.has('timer-query-webgl');
    let supported = webgl2 || hasTimerQuery;

    for (const key of options) {
      switch (key) {
        case 'queries':
          supported = supported && webgl2;
          break;
        case 'timers':
          supported = supported && hasTimerQuery;
          break;
        default:
          assert(false);
      }
    }

    return supported;
  }

  target: number | null = null;
  _queryPending = false;
  _pollingPromise: Promise<any> | null = null;

  // Create a query class
  constructor(gl: WebGLRenderingContext, opts: QueryProps = {}) {
    super(WebGLDevice.attach(gl), opts, {} as any);
    Object.seal(this);
  }

  // Shortcut for timer query (dependent on extension in both WebGL1 and 2)
  // Measures GPU time delta between this call and a matching `end` call in the
  // GPU instruction stream.
  beginTimeElapsedQuery(): this {
    return this.begin(GL_TIME_ELAPSED_EXT);
  }

  // Shortcut for occlusion queries
  beginOcclusionQuery(options?: {conservative?: boolean}): this {
    return this.begin(options?.conservative ? GL_ANY_SAMPLES_PASSED_CONSERVATIVE : GL_ANY_SAMPLES_PASSED);
  }

  // Shortcut for transformFeedbackQuery
  beginTransformFeedbackQuery(): this {
    return this.begin(GL_TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN);
  }

  // Due to OpenGL API limitations, after calling `begin()` on one Query
  // instance, `end()` must be called on that same instance before
  // calling `begin()` on another query. While there can be multiple
  // outstanding queries representing disjoint `begin()`/`end()` intervals.
  // It is not possible to interleave or overlap `begin` and `end` calls.
  begin(target: number): this {
    // Don't start a new query if one is already active.
    if (this._queryPending) {
      return this;
    }

    this.target = target;
    this.gl2.beginQuery(this.target, this.handle);

    return this;
  }

  // ends the current query
  end(): this {
    // Can't end a new query if the last one hasn't been resolved.
    if (this._queryPending) {
      return this;
    }

    if (this.target) {
      this.gl2.endQuery(this.target);
      this.target = null;
      this._queryPending = true;
    }
    return this;
  }

  // Returns true if the query result is available
  isResultAvailable(): boolean {
    if (!this._queryPending) {
      return false;
    }

    const resultAvailable = this.gl2.getQueryParameter(this.handle, GL_QUERY_RESULT_AVAILABLE);
    if (resultAvailable) {
      this._queryPending = false;
    }
    return resultAvailable;
  }

  // Timing query is disjoint, i.e. results are invalid
  isTimerDisjoint(): boolean {
    return this.gl2.getParameter(GL_GPU_DISJOINT_EXT);
  }

  // Returns query result.
  getResult(): any {
    return this.gl2.getQueryParameter(this.handle, GL_QUERY_RESULT);
  }

  // Returns the query result, converted to milliseconds to match JavaScript conventions.
  getTimerMilliseconds() {
    return this.getResult() / 1e6;
  }

  // Polls the query
  createPoll(limit: number = Number.POSITIVE_INFINITY): Promise<any> {
    if (this._pollingPromise) {
      return this._pollingPromise;
    }

    let counter = 0;

    this._pollingPromise = new Promise((resolve, reject) => {
      const poll = () => {
        if (this.isResultAvailable()) {
          resolve(this.getResult());
          this._pollingPromise = null;
        } else if (counter++ > limit) {
          reject('Timed out');
          this._pollingPromise = null;
        } else {
          requestAnimationFrame(poll);
        }
      };

      requestAnimationFrame(poll);
    });

    return this._pollingPromise;
  }

  override _createHandle() {
    return Query.isSupported(this.gl) ? this.gl2.createQuery() : null;
  }

  override _deleteHandle() {
    this.gl2.deleteQuery(this.handle);
  }
}
