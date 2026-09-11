import type { BirdId } from '../pages/page05Data';

export type ParrotAppearance = 'sick' | 'healthy';

export const PARROT_MODELS: Record<BirdId, Record<ParrotAppearance, string>> = {
  green: { sick: '/assets/meshy/jigu-sick.glb', healthy: '/assets/meshy/jigu-healthy.glb' },
  red: { sick: '/assets/meshy/jelly-sick.glb', healthy: '/assets/meshy/jelly-healthy.glb' },
};

/** Self-contained GLB only: a classroom preview never fetches third-party textures or decoders. */
export function validateEmbeddedParrotGlb(data: ArrayBuffer): void {
  if (data.byteLength < 20) throw new Error('모형 파일이 비어 있어.');
  const header = new DataView(data);
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2
    || header.getUint32(8, true) !== data.byteLength || header.getUint32(16, true) !== 0x4e4f534a) {
    throw new Error('이 모형 파일을 열 수 없어.');
  }
  const jsonLength = header.getUint32(12, true);
  if (jsonLength > data.byteLength - 20) throw new Error('모형 파일이 모두 준비되지 않았어.');
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength)));
  const extensions: string[] = [...(json.extensionsUsed ?? []), ...(json.extensionsRequired ?? [])];
  if (extensions.some((extension) => ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'].includes(extension))) {
    throw new Error('이 모형은 수업용 형식으로 다시 준비해야 해.');
  }
  if ([...(json.buffers ?? []), ...(json.images ?? [])].some((resource) => typeof resource.uri === 'string')) {
    throw new Error('모형의 그림 자료가 한 파일에 들어 있어야 해.');
  }
}
