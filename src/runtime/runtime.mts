import { DiagramRenderer } from './diagram-renderer.mjs';
import { strict as assert } from 'node:assert';

function isPromiseLike (o: any): o is Promise<any> {
  return o !== null && typeof o === 'object' && typeof o.then === 'function' && typeof o.catch === 'function';
}

const mark = (_this: $Promise$, s: 'resolved' | 'rejected') => {
  return function () {
    const args = Array.from(arguments);
    _this.status = s;
    _this.value = args.length === 1 ? args[0] : args;
  };
};

class $Promise$ {
  status: 'pending' | 'resolved' | 'rejected';
  value: any;
  constructor (prms: Promise<any>) {
    this.status = 'pending';
    prms.then(mark(this, 'resolved'), mark(this, 'rejected'));
  }
}

const wrap = (v: any) => isPromiseLike(v) ? new $Promise$(v) : v;

type WeavedLog = {
  value: any;
  espath: string;
  left: number;
};

type Recorded = {
  value: any;
  logs: WeavedLog[];
};

class ArgumentRecorder {
  readonly _powerAssert: PowerAssert;
  readonly _argumentNumber: number;
  _logs: WeavedLog[];
  _recorded: Recorded | null;
  _val: any;

  constructor (powerAssert: PowerAssert, argumentNumber: number) {
    this._powerAssert = powerAssert;
    this._argumentNumber = argumentNumber;
    this._logs = [];
    this._recorded = null;
    this._val = null;
  }

  val (): any {
    return this._val;
  }

  eject (): Recorded {
    const ret = this._recorded;
    assert(ret !== null, 'eject() should be called after recording');
    this._recorded = null;
    this._val = null;
    return ret;
  }

  _tap (value: any, espath: string, left: number): any {
    this._logs.push({
      value: wrap(value),
      espath,
      left
    });
    return value;
  }

  _rec (value: any, espath: string, left: number) {
    try {
      const log = {
        value: wrap(value),
        espath,
        left
      };
      this._logs.push(log);
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
      this._recorded = {
        value,
        logs: ([] as WeavedLog[]).concat(this._logs)
      };
      this._val = value;
      this._logs = [];
    }
  }
}

const _pwmeta = (content: string, extra: any) => {
  return Object.assign({
    transpiler: 'espower3',
    version: '0.0.0',
    content
  }, extra);
};

type PowerAssertMetadata = {
  transpiler: string;
  version: string;
  content: string;
};

const val = (v: any) => {
  if (typeof v.val === 'function') {
    return v.val();
  } else {
    return v;
  }
};

const eject = (v: any) => {
  if (typeof v.eject === 'function') {
    return v.eject();
  } else {
    return v;
  }
};

class PowerAssert {
  readonly callee: Function;
  readonly receiver: any;
  readonly assertionMetadata: PowerAssertMetadata;

  constructor (callee: Function, receiver: any, assertionMetadata: PowerAssertMetadata) {
    this.callee = callee;
    this.receiver = receiver;
    this.assertionMetadata = assertionMetadata;
  }

  newArgumentRecorder (argumentNumber: number): ArgumentRecorder {
    return new ArgumentRecorder(this, argumentNumber);
  }

  run (...args: any[]): any {
    const poweredArgs = Array.from(args);
    const actualArgs = poweredArgs.map((a) => val(a));
    try {
      return this.callee.apply(this.receiver, actualArgs);
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
      const assertionLine = this.assertionMetadata.content;
      const renderer = new DiagramRenderer(assertionLine);
      const diagram = renderer.render(logs);
      e.message = diagram;
      e.generatedMessage = false;
      throw e;
    }
  }
}

type PowerAssertRuntime = (callee: Function, receiver: any, content: string, extra: any) => PowerAssert;
const _power_: PowerAssertRuntime = (callee: Function, receiver: any, content: string, extra: any) => {
  return new PowerAssert(callee, receiver, _pwmeta(content, extra));
};

export {
  _power_
};
