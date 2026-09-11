import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { collectAssetInventory, digest } from './asset-inventory.mjs';
import { inspectGlb } from './glb-inspection.mjs';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const manifestPath = path.join(publicRoot, 'assets', 'asset-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const inventory = collectAssetInventory(root);
const walk = (folder) => fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)]);
const runtimeByPath = new Map(inventory.assets.map((asset) => [asset.url, asset]));

if (process.argv.includes('--write')) {
  const previous = new Map(manifest.assets.map((asset) => [asset.src, asset]));
  manifest.schemaVersion = 2;
  manifest.description = 'Actual media inventory. classroomReady resources are reachable from the application import graph. Source storyboards stay outside the deployable bundle.';
  manifest.assets = walk(publicRoot).filter((file) => /\.(webp|png|jpg|svg|mp3|wav|ogg|mp4|woff2|glb)$/i.test(file) && !file.includes(`${path.sep}storyboards${path.sep}`)).map((file) => {
    const src = '/' + path.relative(publicRoot, file).replaceAll('\\', '/');
    const body = fs.readFileSync(file);
    const old = previous.get(src);
    const runtime = runtimeByPath.get(src);
    const kind = /\.(mp3|wav|ogg)$/i.test(file) ? 'audio' : /\.woff2$/i.test(file) ? 'font' : /\.mp4$/i.test(file) ? 'video' : /\.glb$/i.test(file) ? 'model' : 'image';
    const modelStats = kind === 'model' ? inspectGlb(body) : undefined;
    return { ...old, id: old?.id ?? `file.${src.slice(1).replaceAll('/', '.')}`, src, kind, bytes: body.length, sha256: digest(body), classroomReady: Boolean(runtime), references: runtime?.references ?? [], ...(modelStats ? { modelStats } : {}) };
  }).sort((a, b) => a.src.localeCompare(b.src));
  manifest.unusedCandidates = inventory.unused;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

const ids = new Set();
const paths = new Set();
const failures = [...inventory.missing];
for (const asset of manifest.assets) {
  if (ids.has(asset.id)) failures.push(`duplicate id: ${asset.id}`);
  if (paths.has(asset.src)) failures.push(`duplicate path: ${asset.src}`);
  ids.add(asset.id); paths.add(asset.src);
  const absolute = path.resolve(publicRoot, asset.src.replace(/^\//, ''));
  if (!absolute.startsWith(publicRoot + path.sep)) { failures.push(`path outside public: ${asset.src}`); continue; }
  if (!fs.existsSync(absolute)) failures.push(`missing: ${asset.id} -> ${asset.src}`);
  else {
    const body = fs.readFileSync(absolute);
    if (asset.bytes !== body.length || asset.sha256 !== digest(body)) failures.push(`stale bytes/hash: ${asset.src}; run node scripts/validate-assets.mjs --write`);
    if (/\.glb$/i.test(asset.src)) {
      const inspection = inspectGlb(body);
      failures.push(...inspection.errors.map((error) => `${asset.src}: ${error}`));
      for (const warning of inspection.warnings) console.warn(`${asset.src}: ${warning}`);
    }
  }
}
for (const asset of inventory.assets) if (!paths.has(asset.url)) failures.push(`runtime reference absent from manifest: ${asset.url}`);
for (const model of manifest.modelSlots) {
  if (model.available && !fs.existsSync(path.join(publicRoot, model.src))) failures.push(`missing model: ${model.id}`);
  if (!ids.has(model.fallback)) failures.push(`missing fallback id: ${model.fallback}`);
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`Validated ${ids.size} media files, ${inventory.assets.length} reachable classroom resources, ${manifest.modelSlots.length} model slot. ${inventory.unused.length} source/unused candidates remain preserved outside the classroom bundle.`);
