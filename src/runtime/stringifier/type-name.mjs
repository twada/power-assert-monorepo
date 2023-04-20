const toStr = Object.prototype.toString;

function funcName (f) {
  if (f.name) {
    return f.name;
  }
  const match = /^\s*function\s*([^\(\s]+)/i.exec(f.toString());
  return match ? match[1] : '';
}

function ctorName (obj) {
  const strName = toStr.call(obj).slice(8, -1);
  if ((strName === 'Object' || strName === 'Error') && obj.constructor) {
    return funcName(obj.constructor);
  }
  return strName;
}

export function typeName (val) {
  if (val === null) {
    return 'null';
  }
  const type = typeof val;
  if (type === 'object') {
    return ctorName(val);
  }
  return type;
}