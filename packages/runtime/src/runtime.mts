import { renderDiagram } from './diagram.mjs';
import { renderStepwise } from './stepwise.mjs';
import { stringifier } from './stringifier/stringifier.mjs';
import { strict as assert, AssertionError } from 'node:assert';

type PowerAssertMetadata = {
  transpiler: string;
  version: string;
  content: string;
  binexp?: string;
};

type CapturedValueMetadata = {
  hint?: string;
};

type CapturedValue = {
  value: unknown;
  markerPos: number;
  startPos: number;
  endPos: number;
  evalOrder: number;
  metadata?: CapturedValueMetadata;
};

type RecordedArgument = {
  value: unknown;
  capturedValues: CapturedValue[];
};

type ArgumentRecorder = {
  tap(value: unknown, markerPos: number, startPos: number, endPos: number, metadata?: CapturedValueMetadata): unknown;
  rec(value: unknown, markerPos?: number, startPos?: number, endPos?: number): ArgumentRecorder;
};

type PowerAssert = {
  recorder(argumentNumber: number): ArgumentRecorder;
  run(...args: unknown[]): unknown;
};

type PowerAssertRuntime = (callee: Function, receiver: unknown, content: string, extra?: unknown) => PowerAssert;

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
  #evalOrder: number;

  constructor (powerAssert: PowerAssert, argumentNumber: number) {
    this.#powerAssert = powerAssert;
    this.#argumentNumber = argumentNumber;
    this.#capturedValues = [];
    this.#recorded = null;
    this.#val = null;
    this.#evalOrder = 0;
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

  tap (value: unknown, markerPos: number, startPos: number, endPos: number, metadata?: CapturedValueMetadata): unknown {
    const evalOrder = ++this.#evalOrder;
    this.#capturedValues.push({
      value: wrap(value),
      markerPos,
      startPos,
      endPos,
      evalOrder,
      metadata
    });
    return value;
  }

  rec (value: unknown, markerPos?: number, startPos?: number, endPos?: number): ArgumentRecorder {
    try {
      if (typeof markerPos === 'undefined') {
        // node right under the assertion is not captured
        return this;
      }
      const evalOrder = ++this.#evalOrder;
      assert(typeof markerPos === 'number', 'markerPos must be a number');
      assert(typeof startPos === 'number', 'startPos must be a number');
      assert(typeof endPos === 'number', 'endPos must be a number');
      const cap = {
        value: wrap(value),
        markerPos,
        startPos,
        endPos,
        evalOrder
      };
      this.#capturedValues.push(cap);
      // capture asesert.throws, assert.doesNotThrow, assert.rejects, assert.doesNotReject
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
  readonly #callee: Function;
  readonly #receiver: unknown;
  readonly #assertionMetadata: PowerAssertMetadata;

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
      let argIndex = 0;
      for (const rec of recorded) {
        argIndex++;
        if (rec.type === 'PoweredArgument') {
          for (const cap of rec.capturedValues) {
            logs.push({
              value: cap.value,
              markerPos: cap.markerPos,
              startPos: cap.start,
              endPos: cap.end,
              evalOrder: cap.evalOrder,
              argIndex,
              metadata: cap.metadata
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
        newMessageFragments.push('# Human-readable format:');
        newMessageFragments.push(diagram);
      }

      newMessageFragments.push('');
      const stepwiseLines = renderStepwise(assertionLine, logs);
      newMessageFragments.push('# AI-readable format:');
      newMessageFragments.push('Assertion failed: ' + assertionLine);
      newMessageFragments.push(stepwiseLines);

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
        newAssertionErrorProps.actual = logs.find((log) => log.metadata?.hint === 'left')?.value;
        newAssertionErrorProps.expected = logs.find((log) => log.metadata?.hint === 'right')?.value;
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
    transpiler: 'power-assert',
    version: '0.0.0',
    content
  }, extra);
}

const _power_: PowerAssertRuntime = (callee: Function, receiver: unknown, content: string, extra?: unknown) => {
  return new PowerAssertImpl(callee, receiver, createPowerAssertMetadata(content, extra));
};

export {
  _power_
};
