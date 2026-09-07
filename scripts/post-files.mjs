import path from 'node:path';

export const expectedPaths = (postPath, imagePath) => new Set([
  path.normalize(postPath),
  path.normalize(imagePath),
]);

export const porcelainStatusLines = (rawStatus) => {
  const records = rawStatus.split('\0');
  const lines = [];

  for (let index = 0; index < records.length - 1; index += 1) {
    const record = records[index];
    if (!record) continue;

    const status = record.slice(0, 2);
    lines.push(`${status} ${record.slice(3)}`);
    if (status.includes('R') || status.includes('C')) {
      index += 1;
      lines.push(`${status} ${records[index]}`);
    }
  }

  return lines;
};

export const unexpectedChanges = (lines, allowed) => lines
  .filter(Boolean)
  .map((line) => line.slice(3))
  .filter((file) => !allowed.has(path.normalize(file)));
