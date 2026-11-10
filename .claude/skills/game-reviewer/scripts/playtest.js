#!/usr/bin/env node
/* playtest.js — luan nivele të zgjedhur duke zvarritur shkronjat si lojtar
 * i vërtetë (mouse në Chromium me madhësi telefoni) dhe raporton çdo fjalë që
 * loja nuk e pranoi. Gjen gabime që testet njësi nuk i shohin: zona goditjeje
 * të shkronjave, kalimi mes shkronjave fqinje, rrjetë që s'plotësohet.
 *
 *   node .claude/skills/game-reviewer/scripts/playtest.js            # 24 nivele
 *   node .../playtest.js --sample 60                               # më shumë
 *   node .../playtest.js --levels 1,500,1500,2388                  # specifike
 *   node .../playtest.js --wheel 7                                 # vetëm rrota 7-shkronjëshe
 *
 * Kërkon `npm install` (Playwright). Pas rreth 2–5 min printon përmbledhjen.
 * Ngjyrat e daljes: PASS/FAIL për çdo nivel; kodi i daljes 1 nëse ka dështime.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const ROOT = path.join(__dirname, "..", "..", "..", "..");
const { chromium } = require(path.join(ROOT, "node_modules", "playwright"));
const { PACKS } = require(path.join(ROOT, "www/js/levels.js"));
const { GENERATED_PACKS } = require(path.join(ROOT, "www/js/levels-gen.js"));

const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > -1 ? process.argv[i + 1] : d; };
const all = PACKS.concat(GENERATED_PACKS).flatMap((p) => p.levels);

function pickLevels() {
  if (arg("levels")) return arg("levels").split(",").map((x) => parseInt(x, 10) - 1);
  const wheel = arg("wheel") ? parseInt(arg("wheel"), 10) : null;
  const pool = all.map((l, i) => ({ l, i })).filter((x) => !wheel || x.l.letters.length === wheel);
  const n = Math.min(parseInt(arg("sample", "24"), 10), pool.length);
  return Array.from({ length: n }, (_, k) => pool[Math.floor((k * (pool.length - 1)) / Math.max(1, n - 1))].i);
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json", ".webmanifest": "application/manifest+json" };
const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

(async () => {
  const WWW = path.join(ROOT, "www");
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
    const f = path.join(WWW, p);
    if (!f.startsWith(WWW) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
    res.setHeader("content-type", MIME[path.extname(f)] || "application/octet-stream"); res.end(fs.readFileSync(f));
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
  const browser = await chromium.launch({ executablePath: exe });
  const levels = pickLevels();
  const results = [];
  const viewport = { width: 390, height: parseInt(arg("height", "800"), 10) };

  for (const idx of levels) {
    const lv = all[idx];
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(([i, day]) => {
      localStorage.setItem("fs_completed", String(i)); localStorage.setItem("fs_last_daily", day);
      localStorage.setItem("fs_music", "0"); localStorage.setItem("fs_sound", "0");
    }, [idx, localDay()]);
    await page.goto(base);
    await page.waitForSelector("#splash", { state: "detached", timeout: 8000 });
    await page.click("#btn-play"); await page.waitForTimeout(400);

    const res = { index: idx + 1, wheel: lv.letters, words: lv.words.length, failures: [], won: false, ms: 0, errors };
    const t0 = Date.now();
    const found = async () => parseInt((await page.textContent("#level-num")).match(/(\d+)\/\d+/)[1], 10);
    for (const word of lv.words.slice().sort((a, b) => b.length - a.length)) {
      if (await page.locator("#overlay-win.show").count()) break;
      const before = await found();
      const nodes = await page.evaluate(() => [...document.querySelectorAll(".wheel-letter")].map((el) => {
        const r = el.getBoundingClientRect(); return { ch: el.textContent, x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }));
      const used = new Set(), pts = [];
      for (const ch of word) { const k = nodes.findIndex((n, j) => n.ch === ch && !used.has(j)); used.add(k); pts.push(nodes[k]); }
      await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
      for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i].x, pts[i].y, { steps: 14 });
      const picked = (await page.locator(".cw-letter").allTextContents()).join("");
      await page.mouse.up();
      // numruesi rritet pasi shkronjat mbarojnë fluturimin (~0.5s + 60ms/shkronjë):
      // pritet deri 3s në vend të një kohe fikse (që jepte dështime të rreme)
      let won = 0, now = before;
      for (let t = 0; t < 30; t++) {
        await page.waitForTimeout(100);
        won = await page.locator("#overlay-win.show").count();
        now = await found();
        if (won || now > before) break;
      }
      // "E gjetur tashmë" = fjala u plotësua tërthorazi nga fjalët që e kryqëzojnë: e saktë
      const already = /E gjetur tashmë/.test((await page.textContent("#toast")) || "");
      if (!won && now <= before && !already) res.failures.push({ word, picked });
    }
    // sekuenca e festës zgjat ~1.5s para dritares së fitores
    res.won = await page.locator("#overlay-win.show").waitFor({ timeout: 5000 }).then(() => true, () => false);
    res.ms = Date.now() - t0;
    results.push(res);
    const ok = res.failures.length === 0 && res.won && errors.length === 0;
    console.log(`${ok ? "PASS" : "FAIL"}  #${String(res.index).padStart(4)}  ${lv.letters.padEnd(8)} ${String(lv.words.length).padStart(2)} fjalë  ${(res.ms / 1000).toFixed(1)}s` +
      (res.failures.length ? "  ✗ " + res.failures.map((f) => `${f.word}→"${f.picked}"`).join(" ") : "") + (res.won ? "" : "  (nuk fitoi)") + (errors.length ? "  JS: " + errors[0] : ""));
    await ctx.close();
  }
  await browser.close(); server.close();

  const failed = results.filter((r) => r.failures.length || !r.won || r.errors.length);
  const byWheel = {};
  for (const r of results) { const k = r.wheel.length; (byWheel[k] = byWheel[k] || { n: 0, bad: 0 }).n++; if (r.failures.length || !r.won) byWheel[k].bad++; }
  console.log(`\nPËRMBLEDHJE: ${results.length - failed.length}/${results.length} nivele u fituan pa gabime`);
  console.log("sipas madhësisë së rrotës (dështuar/gjithsej):", Object.entries(byWheel).map(([k, v]) => `${k} shkronja: ${v.bad}/${v.n}`).join("  |  "));
  const totalWords = results.reduce((s, r) => s + r.words, 0), badWords = results.reduce((s, r) => s + r.failures.length, 0);
  console.log(`fjalë të refuzuara gabimisht: ${badWords}/${totalWords} (${(100 * badWords / totalWords).toFixed(1)}%)`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("playtest GABIM:", e); process.exit(2); });
