export class Transformation {
  constructor () {
    this.mutations = {};
    this.nameCounts = {};
  }

  register (espath, callback) {
    if (!this.mutations[espath]) {
      this.mutations[espath] = [];
    }
    this.mutations[espath].unshift(callback);
  }

  apply (espath, node) {
    this.mutations[espath].forEach((callback) => {
      callback(node);
    });
  }

  isTarget (espath) {
    return !!this.mutations[espath];
  }

  generateUniqueName (name) {
    if (!this.nameCounts[name]) {
      this.nameCounts[name] = 0;
    }
    this.nameCounts[name] += 1;
    return '_' + name + this.nameCounts[name];
  }
}
