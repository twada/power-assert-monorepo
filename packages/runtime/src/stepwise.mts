import { stringifier } from './stringifier/stringifier.mjs';

type Log = {
  value: unknown,
  markerPos: number,
  startPos: number
  endPos: number,
  evalOrder: number,
  argIndex: number
};

const stringify = stringifier();

// soft by argIndex asc then by evalOrder desc
const stepwiseOrder = (a: Log, b: Log) => {
  if (a.argIndex !== b.argIndex) {
    // Sort by argIndex first. This is to ensure that the order of arguments is preserved
    return a.argIndex - b.argIndex;
  }
  return a.evalOrder - b.evalOrder;
};

export function renderStepwise (assertionLine: string, logs: Log[]): string {
  const capturedEvents: Log[] = ([] as Log[]).concat(logs);
  capturedEvents.sort(stepwiseOrder);
  return constructRows(assertionLine, capturedEvents).join('\n');
}

function constructRows (assertionLine: string, logs: Log[]): string[] {
  const rows: string[] = [];
  let step = 0;
  for (const log of logs) {
    step++;
    const dumpedValue = stringify(log.value);
    const expression = assertionLine.slice(log.startPos, log.endPos);
    // rows.push(`Step ${step}: arg: ${log.argIndex}: \`${expression}\` => ${dumpedValue}`);
    rows.push(`Step ${step}: arg: ${log.argIndex} eval:${log.evalOrder}: \`${expression}\` => ${dumpedValue}`);
    // rows.push(`Step ${step}: \`${expression}\` => ${dumpedValue}`);
  }
  return rows;
}
