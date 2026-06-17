import { registerHooks } from 'node:module';
import { resolve, load } from './hooks.mts';
import type { RegisterHooksOptions } from 'node:module';

const hooksOptions: RegisterHooksOptions = {
  resolve,
  load
};
registerHooks(hooksOptions);
