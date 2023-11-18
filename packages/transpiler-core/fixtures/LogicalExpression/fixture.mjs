import { it } from 'node:test';
import assert from 'node:assert';

const zero = 0;
const ten = 0;

it ('logical AND', () => {
    assert(5 < zero && zero < 13);
});

it ('logical OR', () => {
    assert(ten < 5 || 13 < ten);
});

it ('logical AND with parentheses', () => {
    assert((5 < zero) && (zero < 13));
});

it ('logical OR with parentheses', () => {
    assert((ten < 5) || (13 < ten));
});

it ('two or more whitespaces', () => {
    assert(2   <   ten    &&  ten     <  8);
});
