export function getParentNode (controller) {
  const parents = controller.parents();
  return parents[parents.length - 1];
}

export function getCurrentKey (controller) {
  const path = controller.path();
  return path ? path[path.length - 1] : null;
}
