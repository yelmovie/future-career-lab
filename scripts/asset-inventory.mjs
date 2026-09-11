import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MEDIA = /\.(?:webp|png|jpe?g|svg|mp3|wav|ogg|mp4|woff2|glb)$/i;
const slash = (value) => value.replaceAll('\\', '/');
export const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => item.isDirectory()
  ? walk(path.join(directory, item.name)) : [path.join(directory, item.name)]);

/** Follow the application's imports; retired pages and test fixtures are not classroom downloads. */
export function collectAssetInventory(root) {
  const publicRoot = path.join(root, 'public');
  const publicFiles = walk(publicRoot).map((file) => `/${slash(path.relative(publicRoot, file))}`);
  const modules = new Set();
  const pending = [path.join(root, 'src/main.tsx')];
  while (pending.length) {
    const file = pending.pop();
    if (modules.has(file)) continue;
    modules.add(file);
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.[^'"]+)['"]/g)) {
      const base = path.resolve(path.dirname(file), match[1]);
      const resolved = [base, ...['.ts', '.tsx', '.css', '.json', '/index.ts', '/index.tsx'].map((ext) => base + ext)]
        .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && !/\.test\./.test(resolved)) pending.push(resolved);
    }
  }
  const references = new Map();
  const unresolved = [];
  const add = (url, file, offset = 0) => {
    const source = slash(path.relative(root, file));
    const line = fs.readFileSync(file, 'utf8').slice(0, offset).split('\n').length;
    if (!references.has(url)) references.set(url, new Set());
    references.get(url).add(`${source}:${line}`);
  };
  const pattern = (url, file, offset) => {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll('WILDCARD', '[^/]+');
    const matches = publicFiles.filter((candidate) => new RegExp(`^${escaped}$`).test(candidate));
    if (!matches.length) unresolved.push(`${slash(path.relative(root, file))}: unresolved asset pattern ${url}`);
    matches.forEach((candidate) => add(candidate, file, offset));
  };
  for (const file of modules) {
    const text = fs.readFileSync(file, 'utf8');
    const helpersFile = slash(file).endsWith('/shared/assets.ts');
    for (const match of text.matchAll(/['"](\/(?:assets|audio|video)\/[^'"`\n]+\.(?:webp|png|jpg|svg|mp3|wav|ogg|mp4|woff2|glb))['"]/g)) add(match[1], file, match.index);
    if (helpersFile) continue;
    for (const match of text.matchAll(/`(\/(?:assets|audio|video)\/[^`\n]+\.(?:webp|png|jpg|mp3|wav|ogg|mp4|woff2|glb))`/g)) {
      pattern(match[1].replace(/\$\{[^}]+\}/g, 'WILDCARD'), file, match.index);
    }
    for (const match of text.matchAll(/\b(pageAsset|sample3d)\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/g)) {
      const url = match[1] === 'sample3d' ? `/assets/3d-samples/sample-${match[2].padStart(2, '0')}.webp`
        : `/assets/page-${match[2].padStart(2, '0')}/slot-${match[3].padStart(2, '0')}.webp`;
      add(url, file, match.index);
    }
    for (const match of text.matchAll(/\b(v[2356789]Asset|homeAsset)\(\s*(['"`])([^'"`]+)\2(?:\s+as\s+['"][^'"]+['"])?(?:\s*,\s*['"]([^'"]+)['"])?/g)) {
      const folder = match[1] === 'homeAsset' ? 'page-01' : match[1].replace('Asset', '');
      const extension = match[4] || (folder === 'v8' ? 'jpg' : 'webp');
      const url = `/assets/${folder}/${match[3]}.${extension}`;
      if (url.includes('${')) pattern(url.replace(/\$\{[^}]+\}/g, 'WILDCARD'), file, match.index);
      else add(url, file, match.index);
    }
  }
  // GameShell resolves these backgrounds by page, so all current PAGE_META entries are required.
  const constants = path.join(root, 'src/shared/constants.ts');
  for (const match of fs.readFileSync(constants, 'utf8').matchAll(/background:\s*(\d+)/g)) {
    add(`/assets/backgrounds/page-${match[1].padStart(2, '0')}.webp`, constants, match.index);
  }
  const indexFile = path.join(root, 'index.html');
  for (const match of fs.readFileSync(indexFile, 'utf8').matchAll(/(?:href|src)="(\/assets\/[^"#]+)"/g)) add(match[1], indexFile, match.index);
  const missing = [...references.keys()].filter((url) => !publicFiles.includes(url));
  const assets = [...references].filter(([url]) => !missing.includes(url)).map(([url, refs]) => {
    const body = fs.readFileSync(path.join(publicRoot, url));
    return { url, bytes: body.length, sha256: digest(body), references: [...refs].sort() };
  }).sort((a, b) => a.url.localeCompare(b.url));
  const unused = publicFiles.filter((url) => MEDIA.test(url) && !references.has(url) && url !== '/og-career-team.jpg')
    .map((url) => ({ url, bytes: fs.statSync(path.join(publicRoot, url)).size }));
  return { assets, missing: [...missing.map((url) => `${url} (${[...references.get(url)].join(', ')})`), ...unresolved], unused };
}
