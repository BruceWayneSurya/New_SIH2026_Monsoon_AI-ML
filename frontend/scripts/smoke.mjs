/**
 * Frontend smoke test.
 *
 * Renders the whole application in jsdom against recorded API fixtures and
 * asserts that the console, the verification page and the method page all
 * produce their key elements without throwing. This catches the class of bug
 * that a production build cannot: a component that compiles but crashes on the
 * first payload (undefined field, bad shape, missing guard).
 *
 * Record fixtures first:  PYTHONPATH=. python scripts/dump_api_fixtures.py
 * Then run:               npm run smoke
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { build } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const fixtureDir = join(root, 'fixtures');

if (!existsSync(join(fixtureDir, 'index.json'))) {
  console.error('No fixtures found. Run: PYTHONPATH=. python scripts/dump_api_fixtures.py');
  process.exit(2);
}

const index = JSON.parse(readFileSync(join(fixtureDir, 'index.json'), 'utf8'));
const fixtures = {};
for (const file of readdirSync(fixtureDir)) {
  if (file.endsWith('.json') && file !== 'index.json') {
    fixtures[file.replace('.json', '')] = JSON.parse(readFileSync(join(fixtureDir, file), 'utf8'));
  }
}

// --- bundle the app for node, then provide a browser-ish environment with a fetch stub
const outDir = join(root, '.smoke-build');
await build({
  root,
  logLevel: 'error',
  resolve: {
    // Leaflet needs layout + canvas, which jsdom does not provide.
    alias: { 'react-leaflet': join(root, 'scripts', 'leaflet-stub.jsx') },
  },
  mode: 'development',
  build: {
    ssr: true,
    minify: false,
    outDir,
    emptyOutDir: true,
    rollupOptions: { input: join(root, 'smoke-entry.jsx') },
  },
});

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://localhost:3000/',
  pretendToBeVisual: true,
});
const { window } = dom;
global.window = window;
global.document = window.document;
Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true });
global.HTMLElement = window.HTMLElement;
global.Element = window.Element;
global.Node = window.Node;
global.getComputedStyle = window.getComputedStyle;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = clearTimeout;
window.requestAnimationFrame = global.requestAnimationFrame;

const calls = [];
global.fetch = async (url) => {
  const path = String(url).replace(/^https?:\/\/[^/]+/, '');
  const clean = path.split('?')[0];
  calls.push(path);
  const name = index.paths[clean]
    || index.paths[path]
    || (clean.startsWith('/district/') ? 'district' : null)
    || (clean === '/console' ? 'console' : null)
    || (clean === '/bulletin' ? 'bulletin' : null);
  if (!name || !fixtures[name]) {
    return { ok: false, status: 404, text: async () => 'no fixture', json: async () => ({}) };
  }
  return { ok: true, status: 200, json: async () => fixtures[name], text: async () => '{}' };
};

const failures = [];
const origError = console.error;
console.error = (...args) => { failures.push(args.map(String).join(' ')); origError(...args); };

const { mount } = await import(join(outDir, 'smoke-entry.js'));
await mount(window.document.getElementById('root'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(1200);

const html = () => window.document.getElementById('root').innerHTML;
const checks = [];
const check = (label, condition) => checks.push({ label, ok: !!condition });

check('app mounted', html().length > 2000);
check('masthead + provenance chip', html().includes('MonsoonIQ') && html().includes('Provenance'));
check('command bar with lead selector', html().includes('Lead') && html().includes('D5'));
check('warning summary strip', html().includes('Districts warned'));
check('regime timeline rendered', html().includes('Regime and warning timeline'));
check('map legend present', html().includes('map-legend') || html().includes('Warning category'));
check('district table rows', html().includes('Warning table'));
check('rail placeholder or detail', html().includes('District detail'));
check('console fetched once per screen', calls.filter((c) => c.startsWith('/console')).length >= 1);

// --- tab navigation
const clickTab = (label) => {
  const btn = [...window.document.querySelectorAll('button.tab')].find((b) => b.textContent === label);
  if (!btn) return false;
  btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return true;
};

check('switched to Skill lab', clickTab('Skill lab'));
await wait(500);
check('skill lab honesty note', html().includes('Read this first'));
check('skill lab claim table', html().includes('Claims and their verdicts'));
check('skill lab categorical table', html().includes('Raw NWP'));

check('switched to Method', clickTab('Method'));
await wait(400);
check('method architecture section', html().includes('System architecture and module communication'));
check('method user flow section', html().includes('Operational user flow'));
check('method model card', html().includes('Model card') || html().includes('Stated limits'));

// --- keyboard navigation back on the console
clickTab('Today');
await wait(300);
const before = calls.filter((c) => c.startsWith('/console')).length;
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '2', bubbles: true }));
await wait(400);
check('lead shortcut triggers a reload', calls.filter((c) => c.startsWith('/console')).length > before);
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '?', bubbles: true }));
await wait(100);
check('shortcut help toast', html().includes('Shortcuts:'));

const realErrors = failures.filter((f) => !/Leaflet|jest|act\(|Warning: ReactDOM/.test(f));
const failed = checks.filter((c) => !c.ok);

console.log('\nFrontend smoke test');
for (const c of checks) console.log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.label}`);
if (realErrors.length) {
  console.log('\nConsole errors:');
  realErrors.slice(0, 8).forEach((e) => console.log(`  ! ${e.slice(0, 200)}`));
}
if (process.env.SMOKE_DEBUG) { console.log('\nAPI calls:', calls); console.log('\nHTML head:', html().slice(0, 1200)); }
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed, ${calls.length} API calls made`);

process.exit(failed.length || realErrors.length ? 1 : 0);
