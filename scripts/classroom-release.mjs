import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { collectAssetInventory, digest } from './asset-inventory.mjs';
import { verifyClassroomRelease } from './classroom-integrity.mjs';

/** Keep source artwork on disk while shipping only resources reachable from the current application. */
export function classroomRelease() {
  let root = process.cwd();
  return {
    name: 'classroom-release',
    enforce: 'post',
    configResolved(config) { root = config.root; },
    // Vite's import-analysis hook rewrites dynamic-import chunks during generateBundle.
    // A post-ordered hook hashes those final bytes rather than the earlier chunk objects.
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
      const inventory = collectAssetInventory(root);
      if (inventory.missing.length) this.error(`Missing runtime assets:\n${inventory.missing.join('\n')}`);
      const publicPaths = new Set([
        ...inventory.assets.map((asset) => asset.url), '/manifest.webmanifest', '/og-career-team.jpg',
        '/assets/fonts/Jua-OFL.txt', '/assets/fonts/Pretendard-OFL.txt',
      ]);
      for (const url of publicPaths) {
        this.emitFile({ type: 'asset', fileName: url.slice(1), source: fs.readFileSync(path.join(root, 'public', url)) });
      }
      const required = new Map(inventory.assets.map((asset) => [asset.url, { url: asset.url, bytes: asset.bytes, sha256: asset.sha256 }]));
      for (const url of ['/manifest.webmanifest', '/assets/fonts/Jua-OFL.txt', '/assets/fonts/Pretendard-OFL.txt']) {
        const body = fs.readFileSync(path.join(root, 'public', url));
        required.set(url, { url, bytes: body.length, sha256: digest(body) });
      }
      for (const item of Object.values(bundle)) {
        if (!/\.(?:js|css|html|woff2)$/.test(item.fileName)) continue;
        const body = item.type === 'chunk' ? item.code : item.source;
        const buffer = typeof body === 'string' ? Buffer.from(body) : body;
        required.set(`/${item.fileName}`, { url: `/${item.fileName}`, bytes: buffer.length, sha256: digest(buffer) });
      }
      if (!required.has('/index.html')) this.error('The classroom manifest requires the generated index.html.');
      const files = [...required.values()].sort((a, b) => a.url.localeCompare(b.url));
      const swSource = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
      const version = digest(JSON.stringify(files) + swSource).slice(0, 16);
      const release = { version, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), files };
      const htmlAsset = bundle['index.html'];
      const html = htmlAsset?.type === 'asset' ? String(htmlAsset.source) : '';
      // Only the shell code and fonts. Home artwork is cached when displayed; BGM, Phaser and later media wait.
      const shell = ['/index.html', ...[...html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)]
        .map((match) => match[1]).filter((url) => /\.(?:js|css|woff2)$/.test(url))];
      const worker = swSource.replace('/* CLASSROOM_RELEASE */ null', JSON.stringify(release))
        .replace('/* CLASSROOM_SHELL */ []', JSON.stringify([...new Set(shell)]));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: worker });
      this.emitFile({ type: 'asset', fileName: 'classroom-assets.json', source: JSON.stringify(release, null, 2) });
      this.emitFile({ type: 'asset', fileName: 'asset-build-report.json', source: JSON.stringify({ version, shipped: [...publicPaths].sort(), excluded: inventory.unused }, null, 2) });
      },
    },
    writeBundle: {
      order: 'post',
      sequential: true,
      handler(output) {
        const report = verifyClassroomRelease(path.resolve(root, output.dir ?? 'dist'));
        if (report.errors.length) this.error(`Classroom release integrity failed:\n${report.errors.join('\n')}`);
        this.info(`Classroom release verified: ${report.files} written files, ${report.bytes} bytes.`);
      },
    },
  };
}
