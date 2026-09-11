import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectGlb } from './glb-inspection.mjs';

function fixture(change = () => {}) {
  const png = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  png.writeUInt32BE(2048, 16); png.writeUInt32BE(1024, 20);
  const binary = Buffer.concat([Buffer.alloc(36), png]);
  const gltf = { asset: { version: '2.0' }, buffers: [{ byteLength: binary.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: png.length }], accessors: [{ bufferView: 0, componentType: 5126, type: 'VEC3', count: 3 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], nodes: [{ mesh: 0 }, { mesh: 0 }], images: [{ bufferView: 1, mimeType: 'image/png' }] };
  change(gltf);
  const json = Buffer.from(JSON.stringify(gltf));
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + binary.length, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, padded, binHeader, binary]);
}

test('measures embedded geometry and image headers without claiming image decoding', () => {
  const result = inspectGlb(fixture());
  assert.deepEqual(result.errors, []);
  assert.equal(result.meshTriangles, 1);
  assert.equal(result.sceneTriangles, 2);
  assert.deepEqual([result.images[0].width, result.images[0].height], [2048, 1024]);
  assert.equal(result.sha256.length, 64);
});
test('rejects a truncated GLB and an invalid declared length', () => {
  assert.ok(inspectGlb(fixture().subarray(0, 25)).errors.length);
  const file = fixture(); file.writeUInt32LE(1, 8);
  assert.ok(inspectGlb(file).errors.some((error) => error.includes('declared length')));
});
test('rejects external textures and out-of-bounds geometry', () => {
  const result = inspectGlb(fixture((gltf) => {
    gltf.images = [{ uri: 'https://example.invalid/image.png' }];
    gltf.accessors[0].count = 300;
  }));
  assert.ok(result.errors.some((error) => error.includes('external')));
  assert.ok(result.errors.some((error) => error.includes('Accessor 0 exceeds')));
});
test('reports a project budget as a warning unless strict mode was explicitly chosen', () => {
  const warning = inspectGlb(fixture(), { maxTextureSize: 1024 });
  assert.deepEqual(warning.errors, []);
  assert.ok(warning.warnings.some((message) => message.includes('2048×1024')));
  const strict = inspectGlb(fixture(), { maxTextureSize: 1024, strictBudget: true });
  assert.ok(strict.errors.some((message) => message.includes('2048×1024')));
});
