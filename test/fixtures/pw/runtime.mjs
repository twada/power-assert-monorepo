import { DiagramRenderer } from './diagram-renderer.mjs';

const isPromiseLike = o => o !== null && typeof o === 'object' && typeof o.then === 'function' && typeof o.catch === 'function';

const mark = (_this, s) => {
  return function () {
    const args = Array.from(arguments);
    _this.status = s;
    _this.value = args.length === 1 ? args[0] : args;
  };
};

class $Promise$ {
  constructor(prms) {
    this.status = 'pending';
    prms.then(mark(this, 'resolved'), mark(this, 'rejected'));
  }
}

const wrap = v => isPromiseLike(v) ? new $Promise$(v) : v;

class ArgumentRecorder {
  constructor(powerAssert, argumentNumber) {
    this._powerAssert = powerAssert;
    this._argumentNumber = argumentNumber;
    this._logs = [];
    this._recorded = null;
    this._val = null;
  }
  val() {
    return this._val;
  }
  eject() {
    const ret = this._recorded;
    this._recorded = null;
    this._val = null;
    return ret;
  }
  _tap(value, espath, left) {
    this._logs.push({
      value: wrap(value),
      espath,
      left
    });
    return value;
  }
  _rec(value, espath, left) {
    try {
      const log = {
        value: wrap(value),
        espath,
        left
      };
      this._logs.push(log);
      if (typeof value === 'function') {
        value = new Proxy(value, {
          apply(target, thisArg, args) {
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
        logs: [].concat(this._logs)
      };
      this._val = value;
      this._logs = [];
    }
  }
}

const _pwmeta = (content, extra) => {
    return Object.assign({
        transpiler: 'espower3',
        version: '0.0.0',
        content
    }, extra);
};

const val = (v) => {
  if (typeof v.val === 'function') {
    return v.val();
  } else {
    return v;
  }
};

const eject = (v) => {
  if (typeof v.eject === 'function') {
    return v.eject();
  } else {
    return v;
  }
};

class PowerAssert {
  constructor(callee, receiver, assertionMetadata) {
    this.callee = callee;
    this.receiver = receiver;
    this.assertionMetadata = assertionMetadata;
  }

  newArgumentRecorder(argumentNumber) {
    return new ArgumentRecorder(this, argumentNumber);
  }

  run(...args) {
    const poweredArgs = Array.from(args);
    const actualArgs = poweredArgs.map((a) => val(a));
    try {
      return this.callee.apply(this.receiver, actualArgs);
    } catch (e) {
      if (!/^AssertionError/.test(e.name)) {
        throw e;
      }
      const recorded = poweredArgs.map((p) => eject(p));
      const logs = [];
      for(const rec of recorded) {
        for (const log of rec.logs) {
          logs.push({
            value: log.value,
            leftIndex: log.left
          });
        }
      }

      console.log(logs);

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

const _power_ = (callee, receiver, content, extra) => {
  return new PowerAssert(callee, receiver, _pwmeta(content, extra));
};

export {
  _power_
}
