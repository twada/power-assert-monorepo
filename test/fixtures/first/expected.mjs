const ArgumentRecorder1 = function () {
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
        constructor(callee, am, matchIndex) {
            this._callee = callee;
            this._am = am;
            this._logs = [];
            this._recorded = null;
            this._val = null;
            this._idx = matchIndex;
            const conf = am.params[matchIndex];
            this._isBlock = !!conf.block;
        }
        metadata() {
            return this._am;
        }
        matchIndex() {
            return this._idx;
        }
        val() {
            return this._val;
        }
        _tap(value, espath) {
            this._logs.push({
                value: wrap(value),
                espath
            });
            return value;
        }
        _rec(value, espath) {
            const empowered = this._callee && this._callee._empowered;
            try {
                if (!empowered)
                    return value;
                if (!espath)
                    return this;
                const log = {
                    value: wrap(value),
                    espath
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
    return ArgumentRecorder;
}();
const _pwmeta = (content, extra) => {
    return Object.assign({
        transpiler: 'espower3',
        version: '0.0.0',
        content
    }, extra);
};
import assert, { deepStrictEqual } from 'power-assert';
function add(a, b) {
    const _am1 = _pwmeta('deepStrictEqual({a,b: b}, expected)');
    const _arg1 = new ArgumentRecorder1(deepStrictEqual, _am1);
    const _arg2 = new ArgumentRecorder1(deepStrictEqual, _am1);
    const _am2 = _pwmeta('assert(typeof a === \'number\')');
    const _arg3 = new ArgumentRecorder1(assert, _am2);
    const _am3 = _pwmeta('assert.is.ok(typeof a === \'number\')');
    const _arg4 = new ArgumentRecorder1(assert.is.ok, _am3);
    const _am4 = _pwmeta('assert.equal(typeof b, \'number\')');
    const _arg5 = new ArgumentRecorder1(assert.equal, _am4);
    const expected = {
        b,
        a
    };
    deepStrictEqual(_arg1._rec({
        a,
        b: _arg1._tap(b, 'arguments/0/properties/1/value', 22)
    }, 'arguments/0', 16), _arg2._rec(expected, 'arguments/1', 26));
    assert(_arg3._rec(_arg3._tap(typeof a, 'arguments/0/left', 7) === 'number', 'arguments/0', 16));
    assert.is.ok(_arg4._rec(_arg4._tap(typeof a, 'arguments/0/left', 13) === 'number', 'arguments/0', 22));
    assert.equal(_arg5._rec(typeof b, 'arguments/0', 13), 'number');
    return a + b;
}
