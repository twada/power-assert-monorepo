import assert from 'node:assert';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert(counter += 1)");
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(counter += _parg1.tap(1, 18, 18, 19, 1), 15, 7, 19, 0));
}
{
  const _pasrt2 = _power_(assert, null, "assert(dog.age += 1)");
  const _parg2 = _pasrt2.recorder(0);
  _pasrt2.run(_parg2.rec(dog.age += _parg2.tap(1, 18, 18, 19, 1), 15, 7, 19, 0));
}
{
  const _pasrt3 = _power_(assert, null, "assert(dog.age    +=  1)");
  const _parg3 = _pasrt3.recorder(0);
  _pasrt3.run(_parg3.rec(dog.age += _parg3.tap(1, 22, 22, 23, 1), 18, 7, 23, 0));
}
{
  const _pasrt4 = _power_(assert, null, "assert(dog.age += 1 === three)");
  const _parg4 = _pasrt4.recorder(0);
  _pasrt4.run(_parg4.rec(dog.age += _parg4.tap(_parg4.tap(1, 18, 18, 19, 2) === _parg4.tap(three, 24, 24, 29, 3), 20, 18, 29, 1), 15, 7, 29, 0));
}
{
  const _pasrt5 = _power_(assert, null, "assert([x] = [3])");
  const _parg5 = _pasrt5.recorder(0);
  _pasrt5.run(_parg5.rec([x] = _parg5.tap([_parg5.tap(3, 14, 14, 15, 2)], 13, 13, 16, 1), 11, 7, 16, 0));
}
{
  const _pasrt6 = _power_(assert, null, "assert([x] = [foo])");
  const _parg6 = _pasrt6.recorder(0);
  _pasrt6.run(_parg6.rec([x] = _parg6.tap([_parg6.tap(foo, 14, 14, 17, 2)], 13, 13, 18, 1), 11, 7, 18, 0));
}
