import { stringifier } from './stringifier/stringifier.mjs';

type Log = {
  value: unknown,
  markerPos: number,
  startPos: number
  endPos: number,
  evalOrder: number,
};

const stringify = stringifier();
const reverseEvalOrder = (a: Log, b: Log) => b.evalOrder - a.evalOrder;

export function renderStepwise(assertionLine: string, logs: Log[]): string {
  const capturedEvents: Log[] = ([] as Log[]).concat(logs);
  capturedEvents.sort(reverseEvalOrder);
  return constructRows(assertionLine, capturedEvents).join('\n');
}

function constructRows(assertionLine: string, logs: Log[]): string[] {
  const rows: string[] = [];
  let step = 0;
  for (const log of logs) {
    step++;
    const dumpedValue = stringify(log.value);
    const expression = assertionLine.slice(log.startPos, log.endPos);
    rows.push(`Step ${step}: eval:${log.evalOrder}: \`${expression}\` => ${dumpedValue}`);
    // rows.push(`Step ${step}: \`${expression}\` => ${dumpedValue}`);
  }
  return rows;
}
