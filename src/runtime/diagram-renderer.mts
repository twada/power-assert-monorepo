import { stringifier } from './stringifier/index.mjs';
const stringify = stringifier();
const createRow = (numCols: number, initial: string) => new Array<string>(numCols).fill(initial);
const rightToLeft = (a: Log, b: Log) => b.leftIndex - a.leftIndex;

type Log = {
  value: any,
  leftIndex: number
};

export class DiagramRenderer {
  readonly assertionLine: string;
  readonly rows: string[][];

  constructor (assertionLine: string) {
    this.assertionLine = assertionLine;
    this.rows = [];
  }

  render (logs: Log[]): string {
    const events: Log[] = ([] as Log[]).concat(logs);
    events.sort(rightToLeft);
    const initialVertivalBarLength = 1;
    for (let i = 0; i <= initialVertivalBarLength; i += 1) {
      this.addOneMoreRow();
    }
    this.constructRows(events);
    const wrote = ['', this.assertionLine];
    this.rows.forEach((columns) => {
      wrote.push(columns.join(''));
    });
    wrote.push('');
    return wrote.join('\n');
  }

  _newRowFor (str: string): string[] {
    return createRow(this.widthOf(str), ' ');
  }

  addOneMoreRow (): void {
    this.rows.push(this._newRowFor(this.assertionLine));
  }

  lastRow (): string[] {
    return this.rows[this.rows.length - 1];
  }

  renderVerticalBarAt (columnIndex: number): void {
    const lastRowIndex = this.rows.length - 1;
    for (let i = 0; i < lastRowIndex; i += 1) {
      this.rows[i].splice(columnIndex, 1, '|');
    }
  }

  renderValueAt (columnIndex: number, dumpedValue: string): void {
    const width = this.widthOf(dumpedValue);
    for (let i = 0; i < width; i += 1) {
      this.lastRow().splice(columnIndex + i, 1, dumpedValue.charAt(i));
    }
  }

  isOverlapped (prevCapturing: Log | undefined, nextCaputuring: Log, dumpedValue: string): boolean {
    return (typeof prevCapturing !== 'undefined') && this.startColumnFor(prevCapturing) <= (this.startColumnFor(nextCaputuring) + this.widthOf(dumpedValue));
  }

  constructRows (capturedEvents: Log[]): void {
    let prevCaptured: Log | undefined;
    capturedEvents.forEach((captured) => {
      const dumpedValue = this.stringify(captured.value);
      if (this.isOverlapped(prevCaptured, captured, dumpedValue)) {
        this.addOneMoreRow();
      }
      this.renderVerticalBarAt(this.startColumnFor(captured));
      this.renderValueAt(this.startColumnFor(captured), dumpedValue);
      prevCaptured = captured;
    });
  }

  startColumnFor (captured: Log) {
    return this.widthOf(this.assertionLine.slice(0, captured.leftIndex));
  }

  widthOf (str: string): number {
    // TODO AmbiguousEastAsianCharWidth
    return str.length;
  }

  stringify (input: any): string {
    return stringify(input);
  }
}
