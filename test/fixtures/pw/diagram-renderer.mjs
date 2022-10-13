const createRow = (numCols, initial) => new Array(numCols).fill(initial);
const rightToLeft = (a, b) => b.leftIndex - a.leftIndex;

export class DiagramRenderer {
  constructor (assertionLine) {
    this.assertionLine = assertionLine;
    this.events = [];
    this.rows = [];
    const initialVertivalBarLength = 1;
    for (let i = 0; i <= initialVertivalBarLength; i += 1) {
      this.addOneMoreRow();
    }
  }
  addLog(log) {
    this.events.push({
      value: log.value,
      leftIndex: log.left
    });
  }
  toString() {
    this.events.sort(rightToLeft);
    this.constructRows(this.events);
    this.addOneMoreRow();
    const wrote = ['', this.assertionLine];
    this.rows.forEach((columns) => {
      wrote.push(columns.join(''));
    });
    return wrote.join('\n');
  }
  newRowFor (assertionLine) {
    return createRow(this.widthOf(assertionLine), ' ');
  }
  addOneMoreRow () {
    this.rows.push(this.newRowFor(this.assertionLine));
  }
  lastRow () {
    return this.rows[this.rows.length - 1];
  }
  renderVerticalBarAt (columnIndex) {
    const lastRowIndex = this.rows.length - 1;
    for (let i = 0; i < lastRowIndex; i += 1) {
      this.rows[i].splice(columnIndex, 1, '|');
    }
  }
  renderValueAt (columnIndex, dumpedValue) {
    const width = this.widthOf(dumpedValue);
    for (let i = 0; i < width; i += 1) {
      this.lastRow().splice(columnIndex + i, 1, dumpedValue.charAt(i));
    }
  }
  isOverlapped (prevCapturing, nextCaputuring, dumpedValue) {
    return (typeof prevCapturing !== 'undefined') && this.startColumnFor(prevCapturing) <= (this.startColumnFor(nextCaputuring) + this.widthOf(dumpedValue));
  }
  constructRows (capturedEvents) {
    let prevCaptured;
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
  startColumnFor (captured) {
    return this.widthOf(this.assertionLine.slice(0, captured.leftIndex));
  }
  widthOf(str) {
    // TODO AmbiguousEastAsianCharWidth
    return str.length;
  }
  stringify(obj) {
    // TODO stringify
    return String(obj);
  }
}
