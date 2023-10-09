import { renderDiagram } from './diagram.mjs';
import { stringifier } from './stringifier/stringifier.mjs';
import { strict as assert, AssertionError } from 'node:assert';

type PowerAssertMetadata = {
  transpiler: string;
  version: string;
  content: string;
  binexp?: string;
};

type CapturedValue = {
  value: unknown;
  espath: string;
  left: number;
};

type RecordedArgument = {
  value: unknown;
  capturedValues: CapturedValue[];
};

type ArgumentRecorder = {
  tap(value: unknown, espath: string, left: number): unknown;
  rec(value: unknown, espath: string, left: number): ArgumentRecorder;
}

type PowerAssert = {
  recorder(argumentNumber: number): ArgumentRecorder;
  run(...args: unknown[]): unknown;
}

// eslint-disable-next-line @typescript-eslint/ban-types
type PowerAssertRuntime = (callee: Function, receiver: unknown, content: string, extra?: unknown) => PowerAssert;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPromiseLike (o: any): o is Promise<any> {
  return typeof o === 'object' && o !== null && typeof o.then === 'function' && typeof o.catch === 'function';
}

type PromiseWatcher = (...args: unknown[]) => void;
function mark (wrapper: $Promise$, status: 'resolved' | 'rejected'): PromiseWatcher {
  return (...args: unknown[]) => {
    wrapper.status = status;
    wrapper.value = args.length === 1 ? args[0] : args;
  };
}

class $Promise$ {
  status: 'pending' | 'resolved' | 'rejected';
  value: unknown;
  constructor (prms: Promise<unknown>) {
    this.status = 'pending';
    prms.then(mark(this, 'resolved'), mark(this, 'rejected'));
  }
}

const wrap = (v: unknown) => isPromiseLike(v) ? new $Promise$(v) : v;

class ArgumentRecorderImpl implements ArgumentRecorder {
  readonly #powerAssert: PowerAssert;
  readonly #argumentNumber: number;
  #capturedValues: CapturedValue[];
  #recorded: RecordedArgument | null;
  #val: unknown;

  constructor (powerAssert: PowerAssert, argumentNumber: number) {
    this.#powerAssert = powerAssert;
    this.#argumentNumber = argumentNumber;
    this.#capturedValues = [];
    this.#recorded = null;
    this.#val = null;
  }

  actualValue (): unknown {
    return this.#val;
  }

  ejectRecordedArgument (): RecordedArgument {
    const ret = this.#recorded;
    assert(ret !== null, 'ejectRecordedArgument() should be called after recording');
    this.#recorded = null;
    this.#val = null;
    return ret;
  }

  tap (value: unknown, espath: string, left: number): unknown {
    this.#capturedValues.push({
      value: wrap(value),
      espath,
      left
    });
    return value;
  }

  rec (value: unknown, espath: string, left?: number): ArgumentRecorder {
    try {
      if (typeof left === 'undefined') {
        return this;
      }
      const cap = {
        value: wrap(value),
        espath,
        left
      };
      this.#capturedValues.push(cap);
      if (typeof value === 'function') {
        value = new Proxy(value, {
          apply (target, thisArg, args) {
            try {
              const ret = target.apply(thisArg, args);
              cap.value = wrap(ret);
              return ret;
            } catch (e) {
              cap.value = e;
              throw e;
            }
          }
        });
      }
      return this;
    } finally {
      this.#recorded = {
        value,
        capturedValues: ([] as CapturedValue[]).concat(this.#capturedValues)
      };
      this.#val = value;
      this.#capturedValues = [];
    }
  }
}

function actual (v: unknown): unknown {
  if (v instanceof ArgumentRecorderImpl) {
    return v.actualValue();
  } else {
    return v;
  }
}

type PoweredArgument = {
  type: 'PoweredArgument'
  value: unknown;
  capturedValues: CapturedValue[];
};

type NonPoweredArgument = {
  type: 'NonPoweredArgument'
  value: unknown;
};

function eject (v: unknown): PoweredArgument | NonPoweredArgument {
  if (v instanceof ArgumentRecorderImpl) {
    return {
      type: 'PoweredArgument',
      ...v.ejectRecordedArgument()
    };
  } else {
    return {
      type: 'NonPoweredArgument',
      value: v
    };
  }
}

function isAssertionError (e: unknown): e is AssertionError {
  return e instanceof Error && /^AssertionError/.test(e.name);
}

function isMultiline (s: string): boolean {
  return s.indexOf('\n') !== -1;
}

const stringify = stringifier();

class PowerAssertImpl implements PowerAssert {
  // eslint-disable-next-line @typescript-eslint/ban-types
  readonly #callee: Function;
  readonly #receiver: unknown;
  readonly #assertionMetadata: PowerAssertMetadata;

  // eslint-disable-next-line @typescript-eslint/ban-types
  constructor (callee: Function, receiver: unknown, assertionMetadata: PowerAssertMetadata) {
    this.#callee = callee;
    this.#receiver = receiver;
    this.#assertionMetadata = assertionMetadata;
  }

  recorder (argumentNumber: number): ArgumentRecorder {
    return new ArgumentRecorderImpl(this, argumentNumber);
  }

  run (...poweredArgs: unknown[]): unknown {
    const actualArgs = poweredArgs.map((a) => actual(a));
    try {
      return this.#callee.apply(this.#receiver, actualArgs);
    } catch (e: unknown) {
      if (!isAssertionError(e)) {
        throw e;
      }
      const recorded = poweredArgs.map((p) => eject(p));
      const logs = [];
      for (const rec of recorded) {
        if (rec.type === 'PoweredArgument') {
          for (const cap of rec.capturedValues) {
            logs.push({
              value: cap.value,
              espath: cap.espath,
              leftIndex: cap.left
            });
          }
        }
      }
      // console.log(logs);

      const originalMessage = e.message;
      const newMessageFragments: string[] = [];
      const assertionLine = this.#assertionMetadata.content;

      newMessageFragments.push('');
      newMessageFragments.push('');
      if (isMultiline(assertionLine)) {
        newMessageFragments.push(assertionLine);
      } else {
        // rethrow AssertionError with diagram message
        const diagram = renderDiagram(assertionLine, logs);
        newMessageFragments.push(diagram);
      }
      newMessageFragments.push('');

      const newAssertionErrorProps = {
        message: originalMessage,
        operator: e.operator,
        actual: e.actual,
        expected: e.expected,
        stackStartFn: this.run // the generated stack trace omits frames before this function.
      };

      // BinaryExpression analysis
      if (this.#assertionMetadata.binexp) {
        const binexp = this.#assertionMetadata.binexp;
        newAssertionErrorProps.operator = binexp;
        newAssertionErrorProps.actual = logs.find((log) => log.espath === 'arguments/0/left')?.value;
        newAssertionErrorProps.expected = logs.find((log) => log.espath === 'arguments/0/right')?.value;
        const { expected, actual, operator } = newAssertionErrorProps;
        newMessageFragments.push(`${stringify(actual)} ${operator} ${stringify(expected)}`);
        newMessageFragments.push('');
      } else {
        newMessageFragments.push(originalMessage);
        newMessageFragments.push('');
      }

      newAssertionErrorProps.message = newMessageFragments.join('\n');

      throw new AssertionError(newAssertionErrorProps);
    }
  }
}

function createPowerAssertMetadata (content: string, extra?: unknown): PowerAssertMetadata {
  return Object.assign({
    transpiler: 'espower3',
    version: '0.0.0',
    content
  }, extra);
}

// eslint-disable-next-line @typescript-eslint/ban-types
const _power_: PowerAssertRuntime = (callee: Function, receiver: unknown, content: string, extra?: unknown) => {
  return new PowerAssertImpl(callee, receiver, createPowerAssertMetadata(content, extra));
};

export {
  _power_
};
