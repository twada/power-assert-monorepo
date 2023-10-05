import { stringifier } from './stringifier/stringifier.mjs';

type LogWithLeftIndex = {
  value: unknown,
  leftIndex: number
};

const stringify = stringifier();
const rightToLeft = (a: LogWithLeftIndex, b: LogWithLeftIndex) => b.leftIndex - a.leftIndex;

export function renderDiagram (assertionLine: string, logs: LogWithLeftIndex[]): string {
  const capturedEvents: LogWithLeftIndex[] = ([] as LogWithLeftIndex[]).concat(logs);
  capturedEvents.sort(rightToLeft);
  return [assertionLine].concat(constructRows(capturedEvents)).join('\n');
}

function constructRows (capturedEvents: LogWithLeftIndex[]): string[] {
  const rows: string[] = [];
  rows.push('');
  capturedEvents.forEach((captured) => {
    const dumpedValue = stringify(captured.value);
    rows.push('');
    renderVerticalBarAt(captured.leftIndex, rows);
    renderValueAt(captured.leftIndex, dumpedValue, rows);
  });
  return rows;
}

function renderVerticalBarAt (columnIndex: number, rows: string[]): void {
  const lastRowIndex = rows.length - 1;
  for (let i = 0; i < lastRowIndex; i += 1) {
    if (rows[i].length < columnIndex) {
      rows[i] = ' '.repeat(columnIndex);
    }
    rows[i] = rows[i].slice(0, columnIndex) + '|' + rows[i].slice(columnIndex + 1);
  }
}

function renderValueAt (columnIndex: number, dumpedValue: string, rows: string[]): void {
  rows[rows.length - 1] = ' '.repeat(columnIndex) + dumpedValue;
}
