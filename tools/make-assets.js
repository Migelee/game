#!/usr/bin/env node
/* =========================================================================
 * make-assets.js — prodhon PNG-të e ikonës dhe të splash-it nga
 * www/icons/icon.svg, pastaj `npm run assets` i kalon te @capacitor/assets
 * që gjeneron të gjitha madhësitë iOS/Android.
 *
 * Rregulla të dyqaneve që respektohen këtu:
 *  - ikona iOS 1024×1024, KATRORE, PA transparencë dhe PA cepa të rrumbullakët
 *    (iOS i rrumbullakos vetë) — prandaj heqim rx nga SVG-ja;
 *  - splash 2732×2732 me përmbajtjen në qendër (zona e sigurt ~1200px).
 *
 * Kërkon Chromium (Playwright). Zgjedh vetë: CHROMIUM_PATH, /opt/pw-browsers
 * ose shfletuesin që instalon Playwright.
 * ========================================================================= */

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const svg = fs.readFileSync(path.join(ROOT, "www/icons/icon.svg"), "utf8");
// fonti si data-URI: Chromium bllokon file:// nga faqet e brendshme (do binte fallback)
const fontUrl = (w) =>
  "data:font/woff2;base64," + fs.readFileSync(path.join(ROOT, `www/fonts/nunito-latin-${w}-normal.woff2`)).toString("base64");

// ikona e dyqanit: katrore e plotë, e errët poshtë — pa cepa transparentë
const squareSvg = svg.replace(/rx="\d+"/, 'rx="0"');

function executablePath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  return fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
}

const splashHtml = (dark) => `<!doctype html><html><head><style>
@font-face{font-family:Nunito;font-weight:900;src:url("${fontUrl(900)}")}
html,body{margin:0;width:2732px;height:2732px;overflow:hidden}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:90px;
 background:${dark ? "linear-gradient(170deg,#4a0a10,#2a0509 65%,#190205)" : "linear-gradient(170deg,#8f1119,#5c0a12 62%,#33050b)"};
 font-family:Nunito,sans-serif;color:#fdf6ec}
.logo{width:620px;height:620px;border-radius:140px;overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.55)}
.logo svg{width:100%;height:100%;display:block}
h1{margin:0;font-size:230px;font-weight:900;letter-spacing:4px;text-shadow:0 8px 0 rgba(0,0,0,.35)}
h1 span{color:#e8b64c}
</style></head><body><div class="logo">${svg}</div><h1>Fjalë <span>Shqip</span></h1></body></html>`;

async function main() {
  fs.mkdirSync(ASSETS, { recursive: true });
  const browser = await chromium.launch({ executablePath: executablePath() });
  try {
    const shot = async (html, w, h, file, opts = {}) => {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: file, omitBackground: false, ...opts });
      await page.close();
      console.log("  " + path.relative(ROOT, file));
    };
    const iconHtml = (size) => `<!doctype html><body style="margin:0;width:${size}px;height:${size}px;background:#6d0b14">${squareSvg.replace("<svg", `<svg width="${size}" height="${size}"`)}</body>`;

    await shot(iconHtml(1024), 1024, 1024, path.join(ASSETS, "icon.png"));
    await shot(splashHtml(false), 2732, 2732, path.join(ASSETS, "splash.png"));
    await shot(splashHtml(true), 2732, 2732, path.join(ASSETS, "splash-dark.png"));
    // ikonat e PWA (shfletues)
    fs.mkdirSync(path.join(ROOT, "www/icons"), { recursive: true });
    await shot(iconHtml(192), 192, 192, path.join(ROOT, "www/icons/icon-192.png"));
    await shot(iconHtml(512), 512, 512, path.join(ROOT, "www/icons/icon-512.png"));
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error("make-assets GABIM: " + e.message); process.exit(1); });
