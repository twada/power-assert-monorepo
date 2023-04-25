const toStr = Object.prototype.toString;

// eslint-disable-next-line @typescript-eslint/ban-types
function funcName (f: Function): string {
  if (f.name) {
    return f.name;
  }
  // eslint-disable-next-line no-useless-escape
  const match = /^\s*function\s*([^\(\s]+)/i.exec(f.toString());
  return match ? match[1] : '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ctorName (obj: any): string {
  const strName = toStr.call(obj).slice(8, -1);
  if ((strName === 'Object' || strName === 'Error') && obj.constructor) {
    return funcName(obj.constructor);
  }
  return strName;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function typeName (val: any): string {
  if (val === null) {
    return 'null';
  }
  const type = typeof val;
  if (type === 'object') {
    return ctorName(val);
  }
  return type;
}
