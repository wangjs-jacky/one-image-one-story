import path from 'node:path';

export const expectedPaths = (postPath, imagePath) => new Set([
  path.normalize(postPath),
  path.normalize(imagePath),
]);

export const unexpectedChanges = (lines, allowed) => lines
  .filter(Boolean)
  .map((line) => line.slice(3))
  .filter((file) => !allowed.has(path.normalize(file)));
