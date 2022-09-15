import assert from 'power-assert';
function add(a, b) {
    assert(typeof a === 'number');
    assert(typeof b === 'number');
    return a + b;
}
