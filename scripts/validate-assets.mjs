import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'public', 'assets', 'asset-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const seen = new Set();
const failures = [];

for (const asset of manifest.assets) {
  if (seen.has(asset.id)) failures.push(`duplicate id: ${asset.id}`);
  seen.add(asset.id);
  const absolute = path.join(root, 'public', asset.src.replace(/^\//, ''));
  if (!fs.existsSync(absolute)) failures.push(`missing: ${asset.id} -> ${asset.src}`);
}

for (const model of manifest.modelSlots) {
  if (model.available) {
    const absolute = path.join(root, 'public', model.src.replace(/^\//, ''));
    if (!fs.existsSync(absolute)) failures.push(`missing model: ${model.id}`);
  }
  if (!seen.has(model.fallback)) failures.push(`missing fallback id: ${model.fallback}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Validated ${seen.size} unique image assets and ${manifest.modelSlots.length} model slot.`);
