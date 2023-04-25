import { stringifier } from './stringifier/index.mjs';

type LogWithLeftIndex = {
  value: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  leftIndex: number
};

const stringify = stringifier();
const createRow = (numCols: number, initial: string) => new Array<string>(numCols).fill(initial);
const rightToLeft = (a: LogWithLeftIndex, b: LogWithLeftIndex) => b.leftIndex - a.leftIndex;

export class DiagramRenderer {
  readonly #assertionLine: string;
  readonly #rows: string[][];

  get assertionLine() {
    return this.#assertionLine;
  }

  constructor (assertionLine: string) {
    this.#assertionLine = assertionLine;
    this.#rows = [];
  }

  render (logs: LogWithLeftIndex[]): string {
    const events: LogWithLeftIndex[] = ([] as LogWithLeftIndex[]).concat(logs);
    events.sort(rightToLeft);
    const initialVertivalBarLength = 1;
    for (let i = 0; i <= initialVertivalBarLength; i += 1) {
      this.#addOneMoreRow();
    }
    this.#constructRows(events);
    const wrote = ['', this.#assertionLine];
    this.#rows.forEach((columns) => {
      wrote.push(columns.join(''));
    });
    wrote.push('');
    return wrote.join('\n');
  }

  #newRowFor (str: string): string[] {
    return createRow(this.#widthOf(str), ' ');
  }

  #addOneMoreRow (): void {
    this.#rows.push(this.#newRowFor(this.#assertionLine));
  }

  #lastRow (): string[] {
    return this.#rows[this.#rows.length - 1];
  }

  #renderVerticalBarAt (columnIndex: number): void {
    const lastRowIndex = this.#rows.length - 1;
    for (let i = 0; i < lastRowIndex; i += 1) {
      this.#rows[i].splice(columnIndex, 1, '|');
    }
  }

  #renderValueAt (columnIndex: number, dumpedValue: string): void {
    const width = this.#widthOf(dumpedValue);
    for (let i = 0; i < width; i += 1) {
      this.#lastRow().splice(columnIndex + i, 1, dumpedValue.charAt(i));
    }
  }

  #isOverlapped (prevCapturing: LogWithLeftIndex | undefined, nextCaputuring: LogWithLeftIndex, dumpedValue: string): boolean {
    return (typeof prevCapturing !== 'undefined') && this.#startColumnFor(prevCapturing) <= (this.#startColumnFor(nextCaputuring) + this.#widthOf(dumpedValue));
  }

  #constructRows (capturedEvents: LogWithLeftIndex[]): void {
    let prevCaptured: LogWithLeftIndex | undefined;
    capturedEvents.forEach((captured) => {
      const dumpedValue = this.#stringify(captured.value);
      if (this.#isOverlapped(prevCaptured, captured, dumpedValue)) {
        this.#addOneMoreRow();
      }
      this.#renderVerticalBarAt(this.#startColumnFor(captured));
      this.#renderValueAt(this.#startColumnFor(captured), dumpedValue);
      prevCaptured = captured;
    });
  }

  #startColumnFor (captured: LogWithLeftIndex): number {
    return this.#widthOf(this.#assertionLine.slice(0, captured.leftIndex));
  }

  #widthOf (str: string): number {
    // TODO AmbiguousEastAsianCharWidth
    return str.length;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #stringify (input: any): string {
    return stringify(input);
  }
}
