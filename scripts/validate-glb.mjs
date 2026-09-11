import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { inspectGlb, DEFAULT_GLB_BUDGET } from './glb-inspection.mjs';

const args = process.argv.slice(2);
const options = { strictBudget: args.includes('--strict-budget') };
for (const [flag, key] of [['max-triangles', 'maxTriangles'], ['max-texture-size', 'maxTextureSize'], ['max-bytes', 'maxBytes']]) {
  const value = args.find((argument) => argument.startsWith(`--${flag}=`))?.split('=')[1];
  if (value === undefined) continue;
  if (!Number.isSafeInteger(Number(value)) || Number(value) <= 0) throw new Error(`--${flag} must be a positive integer.`);
  options[key] = Number(value);
}
const inputs = args.filter((argument) => !argument.startsWith('--'));
const collect = (input) => {
  const absolute = path.resolve(input);
  if (!fs.existsSync(absolute)) throw new Error(`Model path does not exist: ${input}`);
  if (fs.statSync(absolute).isDirectory()) return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() || /\.glb$/i.test(entry.name) ? collect(path.join(absolute, entry.name)) : []);
  if (!/\.glb$/i.test(absolute)) throw new Error(`Expected a .glb file: ${input}`);
  return [absolute];
};
try {
  const files = [...new Set((inputs.length ? inputs : ['public/assets/meshy']).flatMap(collect))];
  if (!files.length) throw new Error('No GLB files found; no model has been validated.');
  const models = files.map((file) => ({ file: path.relative(process.cwd(), file).replaceAll('\\', '/'), ...inspectGlb(fs.readFileSync(file), options) }));
  const report = { checker: 'Focused glTF 2 delivery inspection; not full Khronos validation or visual QA', budget: { ...DEFAULT_GLB_BUDGET, ...options }, models };
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    for (const model of models) {
      console.log(`${model.errors.length ? 'FAIL' : 'PASS'} ${model.file}: ${model.bytes} bytes, ${model.meshTriangles} mesh triangles, ${model.sceneTriangles} triangles across nodes, ${model.images.length} embedded images.`);
      for (const image of model.images) console.log(`  image ${image.index}: ${image.width ?? '?'}×${image.height ?? '?'} ${image.format}`);
      for (const message of model.errors) console.error(`  ERROR: ${message}`);
      for (const message of model.warnings) console.warn(`  WARNING: ${message}`);
    }
    console.log('Performance budgets are project review defaults, not measured tablet performance or a contractual acceptance standard.');
  }
  if (models.some((model) => model.errors.length)) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
