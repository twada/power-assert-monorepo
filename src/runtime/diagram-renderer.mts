import { stringifier } from './stringifier/stringifier.mjs';

type LogWithLeftIndex = {
  value: unknown,
  leftIndex: number
};

const stringify = stringifier();
const rightToLeft = (a: LogWithLeftIndex, b: LogWithLeftIndex) => b.leftIndex - a.leftIndex;

export function renderDiagram (assertionLine: string, logs: LogWithLeftIndex[]): string {
  return new DiagramRenderer().render(assertionLine, logs);
}

class DiagramRenderer {
  readonly #rows: string[];

  constructor () {
    this.#rows = [];
  }

  render (assertionLine: string, logs: LogWithLeftIndex[]): string {
    const events: LogWithLeftIndex[] = ([] as LogWithLeftIndex[]).concat(logs);
    events.sort(rightToLeft);
    this.#addOneMoreRow();
    this.#constructRows(events);
    const wrote = [assertionLine];
    this.#rows.forEach((row) => {
      wrote.push(row);
    });
    return wrote.join('\n');
  }

  #constructRows (capturedEvents: LogWithLeftIndex[]): void {
    capturedEvents.forEach((captured) => {
      const dumpedValue = stringify(captured.value);
      this.#addOneMoreRow();
      this.#renderVerticalBarAt(captured.leftIndex);
      this.#renderValueAt(captured.leftIndex, dumpedValue);
    });
  }

  #addOneMoreRow (): void {
    this.#rows.push('');
  }

  #renderVerticalBarAt (columnIndex: number): void {
    const lastRowIndex = this.#rows.length - 1;
    for (let i = 0; i < lastRowIndex; i += 1) {
      if (this.#rows[i].length < columnIndex) {
        this.#rows[i] = ' '.repeat(columnIndex);
      }
      this.#rows[i] = this.#rows[i].slice(0, columnIndex) + '|' + this.#rows[i].slice(columnIndex + 1);
    }
  }

  #renderValueAt (columnIndex: number, dumpedValue: string): void {
    this.#rows[this.#rows.length - 1] = ' '.repeat(columnIndex) + dumpedValue;
  }
}
