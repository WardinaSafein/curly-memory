import { createRequire } from 'node:module';
import { createServer } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const server = await createServer({ root: '/home/user/curly-memory', server: { port: 5197 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (m: any) => console.log('console:', m.text()));
await page.goto(`http://localhost:5197/?scene=riglab&nosave`);
await page.waitForTimeout(3000);
const info = await page.evaluate(() => {
  const g = (globalThis as any).game;
  const s = g.scene.getScene('riglab');
  const rig = s.small;
  return { renderer: g.renderer.type, maxTex: g.renderer.maxTextures, units: g.renderer.glTextureUnits?.units?.length,
    imgs: rig.list.map((i: any) => `${i.texture.key} ${i.frame.width}x${i.frame.height} vis=${i.visible} a=${i.alpha}`) };
});
console.log(JSON.stringify(info, null, 1));
await page.evaluate(() => { const s = (globalThis as any).game.scene.getScene('riglab'); s.backdrop.setFillStyle(0x203040); });
await page.waitForTimeout(800);
await page.screenshot({ path: process.argv[2], clip: { x: 900, y: 540, width: 220, height: 500 } });
await browser.close(); await server.close();
