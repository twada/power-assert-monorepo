/* eslint @typescript-eslint/no-explicit-any: 0 */
import { DiagramRenderer } from './diagram-renderer.mjs';
import { strict as assert } from 'node:assert';

type PowerAssertMetadata = {
  transpiler: string;
  version: string;
  content: string;
};

type WeavedLog = {
  value: any;
  espath: string;
  left: number;
};

type Recorded = {
  value: any;
  logs: WeavedLog[];
};

type ArgumentRecorder = {
    _tap(value: any, espath: string, left: number): any;
    _rec(value: any, espath: string, left: number): ArgumentRecorder;
}

type PowerAssert = {
    newArgumentRecorder(argumentNumber: number): ArgumentRecorder;
    run(...args: any[]): any;
}

// eslint-disable-next-line @typescript-eslint/ban-types
type PowerAssertRuntime = (callee: Function, receiver: any, content: string, extra: any) => PowerAssert;

function isPromiseLike (o: any): o is Promise<any> {
  return o !== null && typeof o === 'object' && typeof o.then === 'function' && typeof o.catch === 'function';
}

type PromiseTapper = (...args: any[]) => void;
function mark (wrapper: $Promise$, status: 'resolved' | 'rejected'): PromiseTapper {
  return (...args: any[]) => {
    wrapper.status = status;
    wrapper.value = args.length === 1 ? args[0] : args;
  };
}

class $Promise$ {
  status: 'pending' | 'resolved' | 'rejected';
  value: any;
  constructor (prms: Promise<any>) {
    this.status = 'pending';
    prms.then(mark(this, 'resolved'), mark(this, 'rejected'));
  }
}

const wrap = (v: any) => isPromiseLike(v) ? new $Promise$(v) : v;

class ArgumentRecorderImpl implements ArgumentRecorder {
  readonly #powerAssert: PowerAssert;
  readonly #argumentNumber: number;
  #logs: WeavedLog[];
  #recorded: Recorded | null;
  #val: any;

  constructor (powerAssert: PowerAssert, argumentNumber: number) {
    this.#powerAssert = powerAssert;
    this.#argumentNumber = argumentNumber;
    this.#logs = [];
    this.#recorded = null;
    this.#val = null;
  }

  actualValue (): any {
    return this.#val;
  }

  ejectRecordedLog (): Recorded {
    const ret = this.#recorded;
    assert(ret !== null, 'eject() should be called after recording');
    this.#recorded = null;
    this.#val = null;
    return ret;
  }

  _tap (value: any, espath: string, left: number): any {
    this.#logs.push({
      value: wrap(value),
      espath,
      left
    });
    return value;
  }

  _rec (value: any, espath: string, left: number): ArgumentRecorder {
    try {
      const log = {
        value: wrap(value),
        espath,
        left
      };
      this.#logs.push(log);
      if (typeof value === 'function') {
        value = new Proxy(value, {
          apply (target, thisArg, args) {
            try {
              const ret = target.apply(thisArg, args);
              log.value = wrap(ret);
              return ret;
            } catch (e) {
              log.value = e;
              throw e;
            }
          }
        });
      }
      return this;
    } finally {
      this.#recorded = {
        value,
        logs: ([] as WeavedLog[]).concat(this.#logs)
      };
      this.#val = value;
      this.#logs = [];
    }
  }
}

const actual = (v: any) => {
  if (typeof v.actualValue === 'function') {
    return v.actualValue();
  } else {
    return v;
  }
};

const eject = (v: any) => {
  if (typeof v.ejectRecordedLog === 'function') {
    return v.ejectRecordedLog();
  } else {
    return v;
  }
};

class PowerAssertImpl implements PowerAssert {
  // eslint-disable-next-line @typescript-eslint/ban-types
  readonly #callee: Function;
  readonly #receiver: any;
  readonly #assertionMetadata: PowerAssertMetadata;

  // eslint-disable-next-line @typescript-eslint/ban-types
  constructor (callee: Function, receiver: any, assertionMetadata: PowerAssertMetadata) {
    this.#callee = callee;
    this.#receiver = receiver;
    this.#assertionMetadata = assertionMetadata;
  }

  newArgumentRecorder (argumentNumber: number): ArgumentRecorder {
    return new ArgumentRecorderImpl(this, argumentNumber);
  }

  run (...poweredArgs: any[]): any {
    const actualArgs = poweredArgs.map((a) => actual(a));
    try {
      return this.#callee.apply(this.#receiver, actualArgs);
    } catch (e: any) {
      if (!/^AssertionError/.test(e.name)) {
        throw e;
      }
      const recorded = poweredArgs.map((p) => eject(p));
      const logs = [];
      for (const rec of recorded) {
        for (const log of rec.logs) {
          logs.push({
            value: log.value,
            leftIndex: log.left
          });
        }
      }

      // console.log(logs);

      // rethrow AssertionError with diagram message
      const assertionLine = this.#assertionMetadata.content;
      const renderer = new DiagramRenderer(assertionLine);
      const diagram = renderer.render(logs);
      e.message = diagram;
      e.generatedMessage = false;
      throw e;
    }
  }
}

function createPowerAssertMetadata (content: string, extra?: any): PowerAssertMetadata {
  return Object.assign({
    transpiler: 'espower3',
    version: '0.0.0',
    content
  }, extra);
}

// eslint-disable-next-line @typescript-eslint/ban-types
const _power_: PowerAssertRuntime = (callee: Function, receiver: any, content: string, extra?: any) => {
  return new PowerAssertImpl(callee, receiver, createPowerAssertMetadata(content, extra));
};

export {
  _power_
};
