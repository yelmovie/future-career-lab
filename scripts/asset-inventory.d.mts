export interface RuntimeAsset { url: string; bytes: number; sha256: string; references: string[] }
export function digest(value: string | Uint8Array): string;
export function collectAssetInventory(root: string): { assets: RuntimeAsset[]; missing: string[]; unused: { url: string; bytes: number }[] };
