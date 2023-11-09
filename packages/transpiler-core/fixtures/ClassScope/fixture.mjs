import assert from 'node:assert/strict';

class Dog {
    say() {
        return 'bow';
    }
}

const d = new Dog();
assert(d.say());
