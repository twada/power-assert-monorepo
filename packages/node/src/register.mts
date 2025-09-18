import { register } from 'node:module';
// use package self-reference to use conditional exports with type-stripping
register('@power-assert/node/hooks', import.meta.url);
