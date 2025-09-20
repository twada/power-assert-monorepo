import { stringifier } from './stringifier/stringifier.mts';

type LogWithMarkerPos = {
  value: unknown,
  markerPos: number
};

const stringify = stringifier();
const rightToLeft = (a: LogWithMarkerPos, b: LogWithMarkerPos) => b.markerPos - a.markerPos;

export function renderDiagram (assertionLine: string, logs: LogWithMarkerPos[]): string {
  const capturedEvents: LogWithMarkerPos[] = ([] as LogWithMarkerPos[]).concat(logs);
  capturedEvents.sort(rightToLeft);
  return [assertionLine].concat(constructRows(capturedEvents)).join('\n');
}

function constructRows (capturedEvents: LogWithMarkerPos[]): string[] {
  const rows: string[] = [];
  rows.push('');
  for (const captured of capturedEvents) {
    const dumpedValue = stringify(captured.value);
    rows.push('');
    renderVerticalBarAt(captured.markerPos, rows);
    renderValueAt(captured.markerPos, dumpedValue, rows);
  }
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
