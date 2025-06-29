import { stringifier } from './stringifier/stringifier.mjs';

type Log = {
  value: unknown,
  markerPos: number,
  startPos: number
  endPos: number,
  evalOrder: number,
  argIndex: number,
  metadata?: { [key: string]: any }
};

const stringify = stringifier();

export function renderStepwise (assertionLine: string, logs: Log[]): string {
  // create shallow copy of logs to avoid mutating the original array
  const capturedEvents: Log[] = ([] as Log[]).concat(logs);
  return constructRows(assertionLine, capturedEvents).join('\n');
}

function constructRows (assertionLine: string, logs: Log[]): string[] {
  const rows: string[] = [];
  for (const argIndex of uniqueArgIndexes(logs)) {
    rows.push(`=== arg:${argIndex} ===`);
    const steps = logs.filter(log => log.argIndex === argIndex);
    steps.sort((a, b) => a.evalOrder - b.evalOrder);
    for (const step of steps) {
      const dumpedValue = stringify(step.value);
      const expression = assertionLine.slice(step.startPos, step.endPos);
      rows.push(`Step ${step.evalOrder}: \`${expression}\` => ${dumpedValue}`);
    }
  }
  return rows;
}

function uniqueArgIndexes (logs: Log[]): number[] {
  const uniqueArgIndexes: number[] = logs.reduce((found: number[], log: Log) => {
    if (!found.includes(log.argIndex)) {
      found.push(log.argIndex);
    }
    return found;
  }, []);
  uniqueArgIndexes.sort((a, b) => a - b);
  return uniqueArgIndexes;
}
