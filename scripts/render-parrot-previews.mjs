/* global document, customElements, requestAnimationFrame */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

// Render the delivered GLBs themselves; no remote image generation or API key is used.
const base = process.env.PARROT_PREVIEW_BASE ?? 'http://127.0.0.1:4185';
const output = path.resolve(process.argv[2] ?? 'public/assets/meshy');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1.5 });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto(base);
  for (const state of ['sick', 'healthy']) {
    const title = state === 'sick' ? '돌봄이 필요한 두 친구' : '돌봄 후의 두 친구';
    await page.setContent(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
      @font-face{font-family:Pretendard;src:url('${base}/assets/fonts/Pretendard-Regular.sub.woff2')}
      @font-face{font-family:Pretendard;src:url('${base}/assets/fonts/Pretendard-Bold.sub.woff2');font-weight:700}
      *{box-sizing:border-box}body{margin:0;background:#f5f3e9;color:#163d38;font-family:Pretendard,sans-serif}
      main{width:1600px;height:1100px;padding:52px 76px 40px;position:relative}
      header{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid #c4d2c4;padding-bottom:23px}
      .eyebrow{font-size:18px;letter-spacing:3px;font-weight:700;color:#4c6b5d}h1{font-size:46px;margin:12px 0 0;font-weight:700;letter-spacing:-1.5px}
      .state{font-size:22px;color:#557366;margin-bottom:4px}section{display:grid;grid-template-columns:1fr 1fr;height:780px;gap:40px}
      figure{margin:0;position:relative;border-bottom:1px solid #d4dccf}model-viewer{width:100%;height:710px;background:transparent;--poster-color:transparent}
      figcaption{font-weight:700;font-size:31px;text-align:center;margin-top:-5px}.dot{display:inline-block;width:12px;height:12px;border-radius:50%;margin:0 12px 4px 0;background:#508b40}.red{background:#b34644}
      footer{font-size:19px;line-height:1.6;color:#537064;margin-top:24px;display:flex;justify-content:space-between}
      /* Keep the runtime image free of baked-in small type; the game supplies accessible labels. */
      main{padding:36px 70px}header,footer,figcaption{display:none}section{height:1028px;gap:72px}figure{border:0}model-viewer{height:1028px}
    </style><script type="module" src="${base}/node_modules/@google/model-viewer/dist/model-viewer.min.js"></script></head><body><main>
      <header><div><div class="eyebrow">FUTURE CAREER LAB</div><h1>${title}</h1></div><div class="state">꾸꾸와 앵자 · 눈·깃털·자세</div></header>
      <section>${[['jigu','꾸꾸',''],['jelly','앵자','red']].map(([id,label,css]) => `<figure><model-viewer id="${id}" src="${base}/assets/meshy/${id}-${state}.glb" alt="${label} ${state === 'sick' ? '돌봄 전' : '돌봄 후'}의 3D 모습" camera-orbit="20deg 82deg 105%" camera-target="auto auto auto" field-of-view="30deg" environment-image="neutral" exposure="1" shadow-intensity="0.7" shadow-softness="1" interaction-prompt="none" loading="eager"></model-viewer><figcaption><span class="dot ${css}"></span>${label}</figcaption></figure>`).join('')}</section>
      <footer><span>자세히 보고 달라진 점을 찾아봐.</span><span>주변 소리와 물그릇은 관찰 카드에서 확인해.</span></footer>
    </main></body></html>`);
    await page.evaluate(async () => {
      await customElements.whenDefined('model-viewer');
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll('model-viewer')].map(model => new Promise((resolve, reject) => {
        if (model.loaded) resolve();
        else { model.addEventListener('load', resolve, { once: true }); model.addEventListener('error', reject, { once: true }); }
      })));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await page.waitForTimeout(1500);
    const destination = path.join(output, `${state}-pair.png`);
    await page.screenshot({ path: destination });
    console.log(JSON.stringify({ state, output: destination, bytes: (await fs.stat(destination)).size }));
  }
  if (failures.length) throw new Error(failures.join('\n'));
} finally { await browser.close(); }
