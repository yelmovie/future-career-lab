import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

/** Check the actual written output, after all bundler code rewriting has finished. */
export function verifyClassroomRelease(directory) {
  const root = path.resolve(directory);
  const release = JSON.parse(fs.readFileSync(path.join(root, 'classroom-assets.json'), 'utf8'));
  const errors = [];
  const seen = new Set();
  let bytes = 0;
  if (!Array.isArray(release.files) || !release.files.length) throw new Error('Classroom manifest contains no files.');
  for (const asset of release.files) {
    const file = path.resolve(root, asset.url.replace(/^\//, ''));
    if (!file.startsWith(root + path.sep)) { errors.push(`Path outside release: ${asset.url}`); continue; }
    if (seen.has(asset.url)) errors.push(`Duplicate release file: ${asset.url}`);
    seen.add(asset.url);
    if (!fs.existsSync(file)) { errors.push(`Missing release file: ${asset.url}`); continue; }
    const data = fs.readFileSync(file);
    bytes += data.length;
    if (data.length !== asset.bytes) errors.push(`Byte length mismatch: ${asset.url}`);
    if (createHash('sha256').update(data).digest('hex') !== asset.sha256) errors.push(`SHA-256 mismatch: ${asset.url}`);
  }
  if (bytes !== release.totalBytes) errors.push(`Release totalBytes mismatch: ${release.totalBytes} declared, ${bytes} actual.`);
  return { version: release.version, files: release.files.length, bytes, errors };
}
