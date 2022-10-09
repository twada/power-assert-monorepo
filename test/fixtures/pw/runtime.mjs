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
  constructor(callee, am) {
    this._callee = callee;
    this._am = am;
    this._logs = [];
    this._recorded = null;
    this._val = null;
  }
  metadata() {
    return this._am;
  }
  val() {
    return this._val;
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
    const empowered = this._callee && this._callee._empowered;
    try {
      if (!empowered)
        return value;
      if (!espath)
        return this;
      const log = {
        value: wrap(value),
        espath,
        left
      };
      this._logs.push(log);
      if (this._isBlock && empowered && typeof value === 'function') {
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
      if (empowered) {
        this._recorded = {
          value,
          logs: [].concat(this._logs)
        };
      }
      this._val = value;
      this._logs = [];
    }
  }
  eject() {
    const ret = this._recorded;
    this._recorded = null;
    this._val = null;
    return ret;
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

const power = (callee, receiver, assertionMetadata) => {
  callee._empowered = true;
  return (...args) => {
    const poweredArgs = Array.from(args);
    const actualArgs = poweredArgs.map((a) => val(a));
    try {
      return callee.apply(receiver, actualArgs);
    } catch (e) {

      if (!/^AssertionError/.test(e.name)) {
        throw e;
      }

      const dr = new DiagramRenderer(assertionMetadata.content);
      console.log(poweredArgs);
      const recorded = poweredArgs.map((p) => eject(p));
      for(const rec of recorded) {
        for (const log of rec.logs) {
          console.log(log);
          dr.addLog(log);
        }
      }
      dr.onEnd();

      console.log('######################### construct diagram');

      const diagram = dr.toString();
      console.log(diagram);

      // rethrow AssertionError with diagram message
      e.message = diagram;
      e.generatedMessage = false;
      throw e;
    }
  };
};

export {
  ArgumentRecorder,
  _pwmeta,
  power
}
