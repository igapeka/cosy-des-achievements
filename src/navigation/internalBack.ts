const internalTrail: string[] = [];

export function recordInternalNavigation(from: string, to: string) {
  if (from !== to) internalTrail.push(from);
}

export function resolveInternalBackPath(
  currentPath: string,
  parentCollectionPath?: string,
) {
  const previousPath = internalTrail.pop();
  if (previousPath && previousPath !== currentPath) return previousPath;
  if (currentPath.startsWith("/stickers/")) return parentCollectionPath ?? "/";
  return "/";
}

export function navigateBackInternally(
  currentPath: string,
  navigate: (path: string) => void,
  parentCollectionPath?: string,
) {
  navigate(resolveInternalBackPath(currentPath, parentCollectionPath));
}
