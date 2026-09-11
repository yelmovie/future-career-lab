import { describe, expect, it } from 'vitest';
import { PARROT_MODELS, validateEmbeddedParrotGlb } from './parrotPreviewModel';

function glb(json: object) {
  const text = JSON.stringify(json);
  const bytes = new TextEncoder().encode(text.padEnd(Math.ceil(text.length / 4) * 4, ' '));
  const result = new ArrayBuffer(bytes.length + 20);
  const header = new DataView(result);
  header.setUint32(0, 0x46546c67, true);
  header.setUint32(4, 2, true);
  header.setUint32(8, result.byteLength, true);
  header.setUint32(12, bytes.length, true);
  header.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(result, 20).set(bytes);
  return result;
}

describe('optional parrot preview assets', () => {
  it('maps each bird and appearance to its own local file', () => {
    expect(new Set(Object.values(PARROT_MODELS).flatMap(Object.values)).size).toBe(4);
    expect(PARROT_MODELS.red.healthy).toBe('/assets/meshy/jelly-healthy.glb');
  });
  it('accepts a self-contained GLB', () => {
    expect(() => validateEmbeddedParrotGlb(glb({ asset: { version: '2.0' }, buffers: [{ byteLength: 0 }] }))).not.toThrow();
  });
  it.each(['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'])('rejects %s before a decoder can be fetched', (extension) => {
    expect(() => validateEmbeddedParrotGlb(glb({ extensionsUsed: [extension] }))).toThrow('수업용 형식');
  });
  it('rejects external resources and truncated files', () => {
    expect(() => validateEmbeddedParrotGlb(glb({ images: [{ uri: 'https://example.org/texture.png' }] }))).toThrow('한 파일');
    expect(() => validateEmbeddedParrotGlb(new ArrayBuffer(8))).toThrow();
    const valid = glb({ asset: { version: '2.0' } });
    expect(() => validateEmbeddedParrotGlb(valid.slice(0, -1))).toThrow();
  });
});
