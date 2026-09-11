import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

// Focused delivery checks, not a replacement for the Khronos glTF Validator or a rendering test.
// https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
export const DEFAULT_GLB_BUDGET = { maxTriangles: 100000, maxTextureSize: 4096, maxBytes: 25000000 };
const integer = (value) => Number.isSafeInteger(value) && value >= 0;
const componentBytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const array = (value) => Array.isArray(value) ? value : [];

function embeddedData(uri) {
  if (typeof uri !== 'string' || !uri.startsWith('data:')) return null;
  const match = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(uri);
  if (!match) return null;
  try { return { mime: match[1], body: match[2] ? Buffer.from(match[3], 'base64') : Buffer.from(decodeURIComponent(match[3])) }; }
  catch { return null; }
}

function imageSize(body) {
  if (body.length >= 24 && body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { format: 'png', width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
  }
  if (body.length >= 12 && body.toString('ascii', 0, 4) === 'RIFF' && body.toString('ascii', 8, 12) === 'WEBP') {
    for (let offset = 12; offset + 8 <= body.length;) {
      const kind = body.toString('ascii', offset, offset + 4);
      const length = body.readUInt32LE(offset + 4);
      const start = offset + 8;
      if (start + length > body.length) break;
      if (kind === 'VP8X' && length >= 10) return { format: 'webp', width: body.readUIntLE(start + 4, 3) + 1, height: body.readUIntLE(start + 7, 3) + 1 };
      if (kind === 'VP8L' && length >= 5 && body[start] === 0x2f) {
        const bits = body.readUInt32LE(start + 1);
        return { format: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
      }
      if (kind === 'VP8 ' && length >= 10 && body[start + 3] === 0x9d && body[start + 4] === 1 && body[start + 5] === 0x2a) {
        return { format: 'webp', width: body.readUInt16LE(start + 6) & 0x3fff, height: body.readUInt16LE(start + 8) & 0x3fff };
      }
      offset = start + length + length % 2;
    }
  }
  if (body.length >= 28 && body.subarray(0, 12).equals(Buffer.from([171, 75, 84, 88, 32, 50, 48, 187, 13, 10, 26, 10]))) {
    return { format: 'ktx2', width: body.readUInt32LE(20), height: body.readUInt32LE(24) };
  }
  if (body.length >= 4 && body[0] === 0xff && body[1] === 0xd8) {
    for (let offset = 2; offset + 3 < body.length;) {
      if (body[offset] !== 0xff) break;
      while (body[offset] === 0xff) offset += 1;
      const marker = body[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      if (offset + 2 > body.length) break;
      const length = body.readUInt16BE(offset);
      if (length < 2 || offset + length > body.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
        return { format: 'jpeg', width: body.readUInt16BE(offset + 5), height: body.readUInt16BE(offset + 3) };
      }
      offset += length;
    }
  }
  return null;
}

export function inspectGlb(input, options = {}) {
  const body = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const budget = { ...DEFAULT_GLB_BUDGET, ...options };
  const result = { bytes: body.length, sha256: createHash('sha256').update(body).digest('hex'), errors: [], warnings: [], meshTriangles: 0, sceneTriangles: 0, meshes: 0, nodes: 0, materials: 0, animations: 0, images: [], extensionsUsed: [], extensionsRequired: [] };
  const fail = (message) => result.errors.push(message);
  const warn = (message) => result.warnings.push(message);
  const overBudget = (message) => (options.strictBudget ? fail : warn)(`Budget: ${message}`);
  if (body.length > budget.maxBytes) overBudget(`${body.length} bytes exceeds ${budget.maxBytes}.`);
  if (body.length < 20 || body.readUInt32LE(0) !== 0x46546c67) { fail('Invalid or incomplete GLB header.'); return result; }
  if (body.readUInt32LE(4) !== 2) fail('GLB version must be 2.');
  if (body.readUInt32LE(8) !== body.length) fail('GLB declared length differs from file length.');
  const chunks = [];
  let offset = 12;
  while (offset + 8 <= body.length) {
    const length = body.readUInt32LE(offset);
    const type = body.readUInt32LE(offset + 4);
    if (length % 4) fail(`Chunk at ${offset} is not aligned to 4 bytes.`);
    if (offset + 8 + length > body.length) { fail('Chunk extends beyond file length.'); return result; }
    chunks.push({ type, body: body.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  if (offset !== body.length) fail('Trailing incomplete chunk header.');
  if (chunks[0]?.type !== 0x4e4f534a || chunks.filter((chunk) => chunk.type === 0x4e4f534a).length !== 1) { fail('Exactly one JSON chunk must be first.'); return result; }
  const binaryChunks = chunks.filter((chunk) => chunk.type === 0x004e4942);
  if (binaryChunks.length > 1 || (binaryChunks.length && chunks[1]?.type !== 0x004e4942)) fail('BIN chunk must occur at most once, immediately after JSON.');
  let gltf;
  try { gltf = JSON.parse(chunks[0].body.toString('utf8').trim()); }
  catch { fail('JSON chunk cannot be parsed.'); return result; }
  if (!gltf || Array.isArray(gltf) || typeof gltf !== 'object') { fail('JSON root must be an object.'); return result; }
  if (gltf.asset?.version !== '2.0') fail('asset.version must be 2.0.');
  if (gltf.asset?.minVersion && gltf.asset.minVersion !== '2.0') fail('asset.minVersion requires another glTF version.');
  result.extensionsRequired = array(gltf.extensionsRequired);
  result.extensionsUsed = array(gltf.extensionsUsed);
  const buffers = array(gltf.buffers).map((buffer, index) => {
    let data;
    if (buffer.uri === undefined && index === 0) data = binaryChunks[0]?.body;
    else data = embeddedData(buffer.uri)?.body;
    if (!data) { fail(`Buffer ${index} is missing or uses an external URI; delivery GLBs must be self-contained.`); return Buffer.alloc(0); }
    if (!integer(buffer.byteLength) || buffer.byteLength > data.length || (!buffer.uri && data.length - buffer.byteLength > 3)) fail(`Buffer ${index} byteLength is inconsistent.`);
    return data.subarray(0, buffer.byteLength);
  });
  const views = array(gltf.bufferViews);
  const viewData = views.map((view, index) => {
    const data = buffers[view.buffer];
    const start = view.byteOffset ?? 0;
    if (!integer(view.buffer) || !data || !integer(start) || !integer(view.byteLength) || start + view.byteLength > data.length) { fail(`bufferView ${index} exceeds its buffer.`); return Buffer.alloc(0); }
    if (view.byteStride !== undefined && (!integer(view.byteStride) || view.byteStride < 4 || view.byteStride > 252 || view.byteStride % 4)) fail(`bufferView ${index} has an invalid byteStride.`);
    return data.subarray(start, start + view.byteLength);
  });
  const accessors = array(gltf.accessors);
  for (const [index, accessor] of accessors.entries()) {
    const size = componentBytes[accessor.componentType];
    const count = components[accessor.type];
    if (!size || !count || !integer(accessor.count) || accessor.count < 1) { fail(`Accessor ${index} has an invalid type/count.`); continue; }
    const matrixWidth = accessor.type.startsWith('MAT') ? Number(accessor.type.slice(3)) : 0;
    const elementBytes = matrixWidth ? Math.ceil(matrixWidth * size / 4) * 4 * matrixWidth : count * size;
    const start = accessor.byteOffset ?? 0;
    if (!integer(start) || start % size) fail(`Accessor ${index} has an invalid byteOffset.`);
    if (accessor.bufferView !== undefined) {
      const view = views[accessor.bufferView];
      const data = viewData[accessor.bufferView];
      const stride = view?.byteStride ?? elementBytes;
      if (!integer(accessor.bufferView) || !data || stride < elementBytes || start + (accessor.count - 1) * stride + elementBytes > data.length) fail(`Accessor ${index} exceeds its bufferView.`);
    }
    if (accessor.sparse) {
      const sparse = accessor.sparse;
      if (!integer(sparse.count) || sparse.count < 1 || sparse.count > accessor.count) fail(`Accessor ${index} has an invalid sparse count.`);
      for (const [key, width] of [['indices', componentBytes[sparse.indices?.componentType]], ['values', elementBytes]]) {
        const item = sparse[key];
        const data = item && viewData[item.bufferView];
        const start = item?.byteOffset ?? 0;
        if (!item || !integer(item.bufferView) || !data || !width || !integer(start) || start + sparse.count * width > data.length) fail(`Accessor ${index} sparse ${key} exceeds its bufferView.`);
      }
      if (![5121, 5123, 5125].includes(sparse.indices?.componentType)) fail(`Accessor ${index} sparse indices must be unsigned integers.`);
    }
  }
  const meshTriangles = array(gltf.meshes).map((mesh, meshIndex) => array(mesh.primitives).reduce((sum, primitive, primitiveIndex) => {
    const label = `Mesh ${meshIndex} primitive ${primitiveIndex}`;
    const position = accessors[primitive.attributes?.POSITION];
    const indexed = primitive.indices !== undefined;
    const indices = indexed ? accessors[primitive.indices] : null;
    if (!position || position.type !== 'VEC3') fail(`${label} has no valid POSITION accessor.`);
    if (indexed && (!integer(primitive.indices) || !indices || indices.type !== 'SCALAR' || ![5121, 5123, 5125].includes(indices.componentType))) fail(`${label} has invalid indices.`);
    const count = (indexed ? indices?.count : position?.count) ?? 0;
    const mode = primitive.mode ?? 4;
    if (![0, 1, 2, 3, 4, 5, 6].includes(mode)) fail(`${label} has invalid topology.`);
    if (mode === 4 && count % 3 !== 0) fail(`${label} triangle count is not divisible by three.`);
    return sum + (mode === 4 ? Math.floor(count / 3) : mode === 5 || mode === 6 ? Math.max(0, count - 2) : 0);
  }, 0));
  result.meshes = meshTriangles.length;
  result.meshTriangles = meshTriangles.reduce((sum, count) => sum + count, 0);
  result.nodes = array(gltf.nodes).length;
  result.sceneTriangles = array(gltf.nodes).reduce((sum, node) => sum + (meshTriangles[node.mesh] ?? 0), 0);
  result.materials = array(gltf.materials).length;
  result.animations = array(gltf.animations).length;
  if (!result.meshTriangles) warn('No triangle geometry was found.');
  if (Math.max(result.meshTriangles, result.sceneTriangles) > budget.maxTriangles) overBudget(`${Math.max(result.meshTriangles, result.sceneTriangles)} triangles exceeds ${budget.maxTriangles}; scene figure counts all mesh-bearing nodes.`);
  for (const [index, image] of array(gltf.images).entries()) {
    const embedded = embeddedData(image.uri);
    const data = image.bufferView !== undefined ? viewData[image.bufferView] : embedded?.body;
    if (!data || (image.uri && !embedded)) { fail(`Image ${index} is missing or external; delivery textures must be embedded.`); continue; }
    const size = imageSize(data);
    result.images.push({ index, bytes: data.length, mimeType: image.mimeType ?? embedded?.mime ?? null, ...(size ?? { format: 'unmeasured', width: null, height: null }) });
    if (!size) warn(`Image ${index} dimensions could not be measured; decode/render validation is required.`);
    else if (!size.width || !size.height) fail(`Image ${index} has zero dimensions.`);
    else if (Math.max(size.width, size.height) > budget.maxTextureSize) overBudget(`Image ${index} is ${size.width}×${size.height}; limit ${budget.maxTextureSize}.`);
  }
  if ([...result.extensionsUsed, ...result.extensionsRequired].some((name) => ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'].includes(name))) warn('Compression extensions are present; verify an uncompressed fallback or a compatible locally shipped decoder. Metadata inspection does not decode compressed data.');
  return result;
}
