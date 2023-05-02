import type { Controller } from 'estraverse';
import type { Node } from 'estree';

export function getParentNode (controller: Controller): Node | null {
  const parents = controller.parents();
  return parents[parents.length - 1];
}

export function getCurrentKey (controller: Controller): string | number | null {
  const path = controller.path();
  return path ? path[path.length - 1] : null;
}
