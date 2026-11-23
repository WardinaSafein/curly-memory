/**
 * Smoke test: starts the dev server, opens every scene in headless Chromium,
 * fails on console errors and saves screenshots.
 *
 *   npm run smoke [-- --out <dir>]
 *
 * Needs Playwright with Chromium installed (`npx playwright install chromium` locally).
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
// Playwright is an optional, globally installed tool here (not a project dependency), so it is typed loosely.
interface PwPage {
  on(event: 'console', fn: (m: { type(): string; text(): string }) => void): void;
  on(event: 'pageerror', fn: (e: Error) => void): void;
  goto(url: string): Promise<unknown>;
  waitForTimeout(ms: number): Promise<void>;
  screenshot(opts: { path: string }): Promise<unknown>;
  close(): Promise<void>;
}
interface PwBrowser { newPage(opts: { viewport: { width: number; height: number } }): Promise<PwPage>; close(): Promise<void> }
const { chromium } = require('playwright') as { chromium: { launch(): Promise<PwBrowser> } };

const outArg = process.argv.indexOf('--out');
const OUT = outArg > 0 ? process.argv[outArg + 1] : join(import.meta.dirname, '..', 'dist', 'smoke');
mkdirSync(OUT, { recursive: true });

const SCENES: { name: string; query: string; settle: number }[] = [
  { name: 'title', query: 'scene=title', settle: 1200 },
  { name: 'riglab', query: 'scene=riglab', settle: 1500 },
  { name: 'bedroom', query: 'scene=bedroom', settle: 1500 },
  { name: 'portal', query: 'scene=portal', settle: 3200 },
  { name: 'cybertown', query: 'scene=cybertown&entry=portal', settle: 2500 },
];

const server = await createServer({ root: join(import.meta.dirname, '..'), server: { port: 5199, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
let failures = 0;
try {
  for (const s of SCENES) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://localhost:5199/?${s.query}&nosave`);
    await page.waitForTimeout(s.settle);
    await page.screenshot({ path: join(OUT, `${s.name}.png`) });
    if (errors.length) {
      failures++;
      console.error(`✗ ${s.name}\n  ${errors.join('\n  ')}`);
    } else {
      console.log(`✓ ${s.name}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`screenshots: ${OUT}`);
process.exit(failures ? 1 : 0);
