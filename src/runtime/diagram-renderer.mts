import { stringifier } from './stringifier/stringifier.mjs';

type LogWithLeftIndex = {
  value: unknown,
  leftIndex: number
};

const stringify = stringifier();
// const createRow = (numCols: number, initial: string) => new Array<string>(numCols).fill(initial);
const rightToLeft = (a: LogWithLeftIndex, b: LogWithLeftIndex) => b.leftIndex - a.leftIndex;

export class DiagramRenderer {
  readonly #assertionLine: string;
  // readonly #rows: string[][];
  readonly #rows: string[];
  readonly #segmenter: Intl.Segmenter;

  get assertionLine () {
    return this.#assertionLine;
  }

  constructor (assertionLine: string) {
    this.#assertionLine = assertionLine;
    this.#rows = [];
    this.#segmenter = new Intl.Segmenter();
  }

  render (logs: LogWithLeftIndex[]): string {
    const events: LogWithLeftIndex[] = ([] as LogWithLeftIndex[]).concat(logs);
    events.sort(rightToLeft);
    const initialVertivalBarLength = 0;
    for (let i = 0; i <= initialVertivalBarLength; i += 1) {
      this.#addOneMoreRow();
    }
    this.#constructRows(events);
    const wrote = [this.#assertionLine];
    // this.#rows.forEach((columns) => {
    //   wrote.push(columns.join(''));
    // });
    this.#rows.forEach((row) => {
      wrote.push(row);
    });
    return wrote.join('\n');
  }

  // #newRowFor (str: string): string[] {
  //   return createRow(0, ' ');
  //   // return createRow(this.#widthOf(str), ' ');
  // }

  #addOneMoreRow (): void {
    this.#rows.push('');
    // this.#rows.push(this.#newRowFor(this.#assertionLine));
  }

  // #lastRow (): string[] {
  #lastRow (): string {
    return this.#rows[this.#rows.length - 1];
  }

  #renderVerticalBarAt (columnIndex: number): void {
    const lastRowIndex = this.#rows.length - 1;
    console.log(this.#rows);
    for (let i = 0; i < lastRowIndex; i += 1) {
      if (this.#rows[i].length < columnIndex) {
        // this.#rows[i] = this.#rows[i].padEnd(columnIndex, ' ');
        console.log('####################### ' + columnIndex);
        this.#rows[i] = ' '.repeat(columnIndex);
        console.log(`rows: "${this.#rows[i]}"`);
      }
      this.#rows[i] = this.#rows[i].slice(0, columnIndex) + '|' + this.#rows[i].slice(columnIndex + 1);
      // this.#rows[i] = this.#splitIntoSegments(this.#rows[i]).splice(columnIndex, 1, '|').join('');
      console.log(`rows after splice: "${this.#rows[i]}"`);
      // this.#rows[i].splice(columnIndex, 1, '|');
    }
  }

  #splitIntoSegments (str: string): string[] {
    const segments = this.#segmenter.segment(str);
    const wrote: string[] = [];
    for (const { segment: seg } of segments) {
      wrote.push(seg);
    }
    return wrote;
  }

  #renderValueAt (columnIndex: number, dumpedValue: string): void {
    // const width = this.#widthOf(dumpedValue);
    // this.#lastRow().splice(columnIndex, width, ...this.#splitIntoSegments(dumpedValue));
    this.#rows[this.#rows.length - 1] = ' '.repeat(columnIndex) + dumpedValue;
  }

  // #isOverlapped (prevCapturing: LogWithLeftIndex | undefined, nextCaputuring: LogWithLeftIndex, dumpedValue: string): boolean {
  //   if (typeof prevCapturing === 'undefined') {
  //     return false;
  //   }
  //   const nextWidth = widthOf(dumpedValue);
  //   if (nextWidth.type === 'UnknownWidth') {
  //     return true;
  //   }
  //   return this.#startColumnFor(prevCapturing) <= (this.#startColumnFor(nextCaputuring) + nextWidth.width);
  // }

  #constructRows (capturedEvents: LogWithLeftIndex[]): void {
    // let prevCaptured: LogWithLeftIndex | undefined;
    capturedEvents.forEach((captured) => {
      const dumpedValue = this.#stringify(captured.value);
      this.#addOneMoreRow();
      // if (this.#isOverlapped(prevCaptured, captured, dumpedValue)) {
      //   this.#addOneMoreRow();
      // }
      this.#renderVerticalBarAt(this.#startColumnFor(captured));
      this.#renderValueAt(this.#startColumnFor(captured), dumpedValue);
      // prevCaptured = captured;
    });
  }

  #startColumnFor (captured: LogWithLeftIndex): number {
    return captured.leftIndex;
    // return this.#widthOf(this.#assertionLine.slice(0, captured.leftIndex));
  }

  // #widthOf (str: string): number {
  //   const w = widthOf(str);
  //   if (w.type === 'KnownWidth') {
  //     return w.width;
  //   } else {
  //     return w.hint;
  //   }
  // }

  #stringify (input: unknown): string {
    return stringify(input);
  }
}
