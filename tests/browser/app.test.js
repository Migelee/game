/* Teste të shfletuesit (Playwright + Chromium) për Fjalë Shqip.
 * Ekzekutimi: npm run test:browser
 *
 * Dy grupe:
 *  1) WEB — loja si PWA (reklama të simuluara).
 *  2) NATIVE-MOCK — një `window.Capacitor` i simuluar me plugin-e të rreme
 *     (AdMob, Purchases, Haptics, InAppReview, App). Provon KODIN TONË:
 *     radhën e thirrjeve, parametrat, rrjedhat e shpërblimit/blerjes, back
 *     button. NUK provon SDK-të e vërteta, as iOS, as reklama/blerje reale.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");

const WWW = path.join(__dirname, "..", "..", "www");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };

let server, browser, BASE;
const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

test.before(async () => {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(WWW, p);
    if (!file.startsWith(WWW) || !fs.existsSync(file)) { res.statusCode = 404; return res.end("nuk u gjet"); }
    res.setHeader("content-type", MIME[path.extname(file)] || "application/octet-stream");
    res.end(fs.readFileSync(file));
  });
  await new Promise((r) => server.listen(0, r));
  BASE = `http://localhost:${server.address().port}/`;
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
  browser = await chromium.launch({ executablePath: exe });
});
test.after(async () => { await browser.close(); server.close(); });

/* ---------- ndihmës ---------- */
function nativeInit(platform) {
  return `(() => {
    const calls = [], handlers = {};
    window.__calls = calls; window.__handlers = handlers;
    window.__mock = { rewardMode: "reward", interstitialFill: true, rewardedFill: true, purchase: "ok", premiumActive: false };
    const rec = (p, m, args) => calls.push({ p, m, args });
    const wait = (ms) => new Promise((r) => setTimeout(r, ms)); // SDK-të e vërteta nuk përgjigjen në çast
    const fire = (ev, d) => (handlers[ev] || []).slice().forEach((f) => f(d));
    const listen = (p) => (ev, fn) => { rec(p, "addListener", [ev]); (handlers[ev] = handlers[ev] || []).push(fn);
      return Promise.resolve({ remove: () => { handlers[ev] = (handlers[ev] || []).filter((x) => x !== fn); } }); };
    const info = (a) => ({ entitlements: { active: a ? { remove_ads: {} } : {}, all: {} } });
    const plugins = {
      AdMob: {
        initialize: async (o) => { await wait(80); rec("AdMob", "initialize", [o]); },
        requestTrackingAuthorization: async () => rec("AdMob", "requestTrackingAuthorization", []),
        requestConsentInfo: async () => { rec("AdMob", "requestConsentInfo", []); return { status: "REQUIRED", isConsentFormAvailable: true }; },
        showConsentForm: async () => rec("AdMob", "showConsentForm", []),
        prepareInterstitial: async (o) => { rec("AdMob", "prepareInterstitial", [o]); if (!__mock.interstitialFill) throw new Error("no fill"); return {}; },
        prepareRewardVideoAd: async (o) => { rec("AdMob", "prepareRewardVideoAd", [o]); if (!__mock.rewardedFill) throw new Error("no fill"); return {}; },
        showInterstitial: async () => { rec("AdMob", "showInterstitial", []); setTimeout(() => fire("interstitialAdDismissed"), 20); },
        showRewardVideoAd: async () => { rec("AdMob", "showRewardVideoAd", []);
          setTimeout(() => { if (__mock.rewardMode === "reward") fire("onRewardedVideoAdReward", { amount: 1 }); fire("onRewardedVideoAdDismissed"); }, 20); return {}; },
        showBanner: async (o) => rec("AdMob", "showBanner", [o]),
        hideBanner: async () => rec("AdMob", "hideBanner", []),
        addListener: listen("AdMob"),
      },
      Purchases: {
        configure: async (o) => { await wait(80); rec("Purchases", "configure", [o]); },
        getOfferings: async () => { rec("Purchases", "getOfferings", []); return { current: { availablePackages: [{ identifier: "$rc_lifetime" }] } }; },
        purchasePackage: async (o) => { rec("Purchases", "purchasePackage", [o]);
          if (__mock.purchase === "cancel") { const e = new Error("cancelled"); e.userCancelled = true; throw e; }
          return { customerInfo: info(true) }; },
        restorePurchases: async () => { rec("Purchases", "restorePurchases", []); return { customerInfo: info(__mock.premiumActive) }; },
        getCustomerInfo: async () => { rec("Purchases", "getCustomerInfo", []); return { customerInfo: info(__mock.premiumActive) }; },
      },
      Haptics: { impact: async (o) => rec("Haptics", "impact", [o]), notification: async (o) => rec("Haptics", "notification", [o]) },
      InAppReview: { requestReview: async () => rec("InAppReview", "requestReview", []) },
      App: { addListener: listen("App"), exitApp: async () => rec("App", "exitApp", []) },
    };
    window.__registered = [];
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "${platform}", registerPlugin: (n) => { window.__registered.push(n); return plugins[n]; } };
  })();`;
}

const ALL = { ads: true, purchases: true };
const { APP_CONFIG } = require("../../www/js/config.js");
const V1 = !APP_CONFIG.features.ads && !APP_CONFIG.features.purchases; // testet "V1" vlejnë vetëm kur dërgohet v1

/** Faqe e re. opts: {native:'ios'|'android', state:{...localStorage}, realKeys:true, tz, time} */
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, timezoneId: opts.tz, serviceWorkers: "allow" });
  const page = await ctx.newPage();
  page.errors = []; page.external = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("request", (r) => { if (!r.url().startsWith(BASE)) page.external.push(r.url()); });
  if (opts.time) await page.clock.setFixedTime(opts.time);
  if (opts.native) await page.addInitScript(nativeInit(opts.native));
  const state = { fs_last_daily: localDay(), ...(opts.state || {}) };
  await page.addInitScript((s) => {
    if (localStorage.getItem("__seeded")) return;
    localStorage.setItem("__seeded", "1");
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, String(v));
  }, state);
  // regjistron lidhjet e jashtme (mailto:) në vend që t'i hapë
  await page.addInitScript(() => { HTMLAnchorElement.prototype.click = function () { (window.__opened = window.__opened || []).push(this.href); }; });
  if (opts.wordlist) {
    // lista e madhe e simuluar (VETËM për test: vargje shkronjash arbitrare)
    await page.route("**/js/wordlist-sq.js", (route) =>
      route.fulfill({ contentType: "text/javascript", body: `const WORDLIST_SQ = ${JSON.stringify(opts.wordlist.join("\n"))};` }));
  }
  if (opts.realKeys || opts.features) {
    // rishkruan config.js: çelësa të rremë RevenueCat dhe/ose veçoritë ON (v1 i ka të dyja OFF)
    await page.route("**/js/config.js", async (route) => {
      const r = await route.fetch();
      let body = await r.text();
      if (opts.realKeys) body = body.replace("appl_XXXXXXXXXXXXXXXX", "appl_testkey").replace("goog_XXXXXXXXXXXXXXXX", "goog_testkey");
      if (opts.features) {
        assert.match(body, /features:\s*\{[^}]*\}/, "formati i features ndryshoi te config.js");
        body = body.replace(/features:\s*\{[^}]*\}/, `features: ${JSON.stringify(opts.features)}`);
      }
      await route.fulfill({ response: r, body });
    });
  }
  await page.goto(BASE);
  await page.waitForSelector("#splash", { state: "detached", timeout: 8000 });
  page.ctx = ctx;
  return page;
}
const close = (page) => page.ctx.close();
const text = (page, sel) => page.textContent(sel);
const coins = async (page) => parseInt(await text(page, "#coins-game"), 10);
const calls = (page) => page.evaluate(() => window.__calls);
const sig = (c) => `${c.p}.${c.m}`;

async function spell(page, word, settle = 1100) {
  const nodes = await page.evaluate(() => [...document.querySelectorAll(".wheel-letter")].map((el) => {
    const r = el.getBoundingClientRect(); return { ch: el.textContent, x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }));
  const used = new Set(), path = [];
  for (const ch of word) {
    const i = nodes.findIndex((n, k) => n.ch === ch && !used.has(k));
    assert.ok(i >= 0, `shkronja ${ch} nuk është në rrotë për ${word}`);
    used.add(i); path.push(nodes[i]);
  }
  await page.mouse.move(path[0].x, path[0].y);
  await page.mouse.down();
  for (let i = 1; i < path.length; i++) { await page.mouse.move(path[i].x, path[i].y, { steps: 6 }); await page.waitForTimeout(40); }
  await page.mouse.up();
  await page.waitForTimeout(settle);
}
async function tap(page, ch) {
  const n = await page.evaluate((c) => { const all = [...document.querySelectorAll(".wheel-letter")].filter((e) => e.textContent === c);
    const el = all.find((e) => !e.classList.contains("selected")) || all[0];
    const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, ch);
  await page.mouse.click(n.x, n.y); await page.waitForTimeout(150);
}
async function winLevel(page, words) {
  for (const w of words) await spell(page, w);
  await page.waitForSelector("#overlay-win.show", { timeout: 8000 });
}
const play = async (page) => { await page.click("#btn-play"); await page.waitForTimeout(500); };

/* =========================================================================
 * 1) WEB
 * ========================================================================= */
test("WEB: ngarkohet pa gabime JS, pa kërkesa të jashtme, me Nunito të ngjitur", async () => {
  const p = await open();
  try {
    assert.deepEqual(p.errors, []);
    assert.deepEqual(p.external, [], "kërkesa drejt jashtë: " + p.external.join(", "));
    assert.ok(await p.evaluate(async () => { await document.fonts.ready; return document.fonts.check("800 20px Nunito"); }));
    assert.equal(await text(p, "#btn-play"), "LUAJ");
  } finally { await close(p); }
});

test("WEB: niveli 1 fitohet me zvarritje; yjet dhe dritarja e fitores shfaqen", async () => {
  const p = await open();
  try {
    await play(p);
    await winLevel(p, ["DET", "TE"]);
    assert.equal(await p.locator("#win-stars i.lit").count() >= 1, true);
    assert.deepEqual(p.errors, []);
  } finally { await close(p); }
});

test("WEB: mënyra me prekje (✓/✕), korrigjim me riprekje, pastrim", async () => {
  const p = await open();
  try {
    await play(p);
    await tap(p, "D"); await tap(p, "E");
    assert.ok(await p.locator("#wheel-center.show").count());
    await tap(p, "E"); // riprekja heq të fundit
    // pas heqjes E është prapë e prekshme (jo .selected)
    assert.equal(await p.locator(".cw-letter").allTextContents().then((a) => a.join("")), "D");
    await tap(p, "E"); await tap(p, "T");
    await p.click("#btn-submit-word"); await p.waitForTimeout(1100);
    assert.match(await text(p, "#level-num"), /1\/2/);
    await tap(p, "D"); await p.click("#btn-clear-word");
    assert.equal(await p.locator(".cw-letter").count(), 0);
  } finally { await close(p); }
});

test("WEB: rrota me 7 shkronja — zvarritja e drejtë mes shkronjash jo-fqinje zgjedh shkronjat e duhura", async () => {
  // niveli 2389 (SHQIPER): para rregullimit QESH jepte "QERSH" (kordi kapte R-në në mes)
  const p = await open({ state: { fs_completed: 2388 } });
  try {
    await play(p);
    for (const word of ["QESH", "PRES", "HIP"]) {
      const nodes = await p.evaluate(() => [...document.querySelectorAll(".wheel-letter")].map((el) => {
        const r = el.getBoundingClientRect(); return { ch: el.textContent, x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }));
      const used = new Set(), pts = [];
      for (const ch of word) { const k = nodes.findIndex((n, j) => n.ch === ch && !used.has(j)); used.add(k); pts.push(nodes[k]); }
      await p.mouse.move(pts[0].x, pts[0].y); await p.mouse.down();
      for (let i = 1; i < pts.length; i++) await p.mouse.move(pts[i].x, pts[i].y, { steps: 14 });
      const picked = (await p.locator(".cw-letter").allTextContents()).join("");
      await p.mouse.up(); await p.waitForTimeout(900);
      assert.equal(picked, word, `zvarritja e drejtë zgjodhi "${picked}" në vend të "${word}"`);
    }
  } finally { await close(p); }
});

test("WEB: fjala e gabuar skuq rrotën; fjala e përsëritur pulson qelizat e saj", async () => {
  const p = await open();
  try {
    await play(p);
    await spell(p, "DET");
    const wrong = p.evaluate(() => new Promise((res) => {
      const w = document.getElementById("wheel"); const t0 = Date.now();
      (function chk() { if (w.classList.contains("wrong")) return res(true); if (Date.now() - t0 > 1500) return res(false); requestAnimationFrame(chk); })();
    }));
    await spell(p, "ED", 100);
    assert.equal(await wrong, true);
    await spell(p, "DET", 150);
    assert.equal(await p.locator(".cell.locate").count(), 3);
  } finally { await close(p); }
});

test("WEB: fjalë pa shpjegim → mesazh i qartë; fjalë me shpjegim → shpjegimi", async () => {
  // gjej nivelin e parë të gjeneruar që ka një fjalë pa shpjegim
  const probe = await open();
  const target = await probe.evaluate(() => {
    let idx = 0;
    for (const pk of PACKS.concat(GENERATED_PACKS)) for (const l of pk.levels) {
      const w = l.words.find((x) => !GLOSSES[x]);
      if (w && idx >= 66) return { idx, word: w };
      idx++;
    }
  });
  await close(probe);
  assert.ok(target, "s'u gjet fjalë pa shpjegim");
  const p = await open({ state: { fs_completed: target.idx } });
  try {
    await play(p);
    await spell(p, target.word, 1500);
    await p.locator(".cell.revealed").first().click();
    await p.waitForTimeout(300);
    assert.equal(await text(p, "#gloss-word"), target.word);
    assert.match(await text(p, "#gloss-text"), /nuk është shtuar ende/);
    await p.click("#btn-gloss-close");
  } finally { await close(p); }
  const q = await open();
  try {
    await play(q); await spell(q, "DET", 1500);
    await q.locator(".cell.revealed").first().click(); await q.waitForTimeout(300);
    assert.match(await text(q, "#gloss-text"), /Hapësirë|det|ujë/i);
  } finally { await close(q); }
});

test("WEB: progresi → VAZHDO me vendndodhjen; harta çohet te paketa aktuale", async () => {
  const p = await open({ state: { fs_completed: 500 } });
  try {
    assert.equal(await text(p, "#btn-play"), "VAZHDO");
    assert.match(await text(p, "#home-progress"), /Niveli 501/);
    await p.click("#btn-packs"); await p.waitForTimeout(500);
    assert.ok(await p.evaluate(() => document.getElementById("packs-list").scrollTop) > 1000);
  } finally { await close(p); }
});

test("WEB: shpërblimi ditor përdor ditën LOKALE (rregullim i gabimit UTC)", async () => {
  // Auckland 11 mars 00:30 vendor = 10 mars 11:30 UTC → UTC dhe lokalja ndryshojnë
  const time = new Date("2026-03-10T11:30:00Z");
  const p = await open({ tz: "Pacific/Auckland", time, state: { fs_last_daily: "2026-03-11" } });
  try {
    assert.equal(await p.locator("#overlay-daily.show").count(), 0, "shpërblimi u dha dy herë në të njëjtën ditë lokale");
  } finally { await close(p); }
  const q = await open({ tz: "Pacific/Auckland", time, state: { fs_last_daily: "2026-03-10" } });
  try {
    assert.equal(await q.locator("#overlay-daily.show").count(), 1, "dita e re lokale duhet të japë shpërblim");
  } finally { await close(q); }
});

test("WEB: butoni mbrapa — mbyll dritaret, kthen ekranet, s'e kalon reklamën", async () => {
  const p = await open({ features: ALL });
  try {
    const back = () => p.evaluate(() => window.FjaleShqip.handleBack());
    await play(p);
    await p.click("#btn-settings"); assert.equal(await back(), "closed:overlay-settings");
    await p.click("#screen-game .shop-open"); assert.equal(await back(), "closed:overlay-shop");
    await p.click("#screen-game .shop-open"); await p.click("#btn-watch-ad"); await p.waitForTimeout(200);
    assert.equal(await back(), "ignored:ad");
    assert.equal(await p.locator("#overlay-ad.show").count(), 1);
    await p.waitForTimeout(5300); await p.click("#btn-ad-close"); await p.waitForTimeout(300);
    await p.click("#btn-shop-close");
    assert.equal(await back(), "game->packs");
    assert.equal(await back(), "packs->home");
  } finally { await close(p); }
});

test("WEB: politika e privatësisë hapet brenda aplikacionit, pa e larguar lojën", async () => {
  const p = await open();
  try {
    await p.click("#btn-settings-home");
    await p.click("#btn-privacy"); await p.waitForTimeout(500);
    assert.equal(await p.locator("#overlay-privacy.show").count(), 1);
    const frame = p.frameLocator("#privacy-frame");
    assert.match(await frame.locator("body").textContent(), V1 ? /nuk mbledh automatikisht asnjë të dhënë/ : /AdMob/); // politika duhet të përputhet me veçoritë
    assert.equal(new URL(p.url()).pathname, "/", "faqja kryesore u largua");
    await p.click("#btn-privacy-close");
    assert.equal(await p.locator("#overlay-privacy.show").count(), 0);
  } finally { await close(p); }
});

test("WEB: service worker regjistrohet (PWA)", async () => {
  const p = await open();
  try {
    await p.waitForTimeout(800);
    assert.equal(await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 1);
  } finally { await close(p); }
});

test("WEB: reklamat e simuluara — shpërblimi, ×2, interstitial me ftohje, banner vetëm te harta", async () => {
  const p = await open({ features: ALL,  state: { fs_completed: 10, fs_wins_ad: 2 } });
  try {
    // banner vetëm në hartë
    await p.click("#btn-packs"); await p.waitForTimeout(300);
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById("sim-banner")).display), "flex");
    await p.click("#btn-packs-back"); await p.waitForTimeout(200);
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById("sim-banner")).display), "none");
    await play(p);
    // shpërblimi te dyqani
    const c0 = await coins(p);
    await p.click("#screen-game .shop-open"); await p.click("#btn-watch-ad");
    await p.waitForTimeout(5300); await p.click("#btn-ad-close"); await p.waitForTimeout(900); await p.click("#btn-shop-close");
    assert.equal((await coins(p)) - c0, 30);
    // fitore → ×2 → interstitial pas të 3-ës
    await winLevel(p, ["SHIU", "SHI", "HIU", "HI"]);
    const c1 = await coins(p);
    await p.click("#btn-double"); await p.waitForTimeout(5300); await p.click("#btn-ad-close"); await p.waitForTimeout(900);
    assert.equal((await coins(p)) - c1, 20);
    assert.equal(await p.locator("#btn-double").isVisible(), false, "×2 duhet të fshihet pasi përdoret");
    await p.click("#btn-next"); await p.waitForTimeout(500);
    assert.equal(await p.locator("#overlay-ad.show").count(), 1, "interstitial pas fitores së 3-të");
    await p.waitForTimeout(3300); await p.click("#btn-ad-close"); await p.waitForTimeout(400);
    // ftohja 90 s: fitorja pasuese s'jep reklamë
    await p.evaluate(() => localStorage.setItem("fs_wins_ad", "5"));
    await winLevel(p, ["BESA", "BE", "SE", "SA"]);
    await p.click("#btn-next"); await p.waitForTimeout(500);
    assert.equal(await p.locator("#overlay-ad.show").count(), 0, "ftohja 90 s u shkel");
    assert.deepEqual(p.errors, []);
  } finally { await close(p); }
});

/* =========================================================================
 * 2) NATIVE-MOCK
 * ========================================================================= */
for (const platform of ["ios", "android"]) {
  test(`NATIVE(${platform}): nisja — RevenueCat, ATT(iOS), pëlqimi, SDK, parangarkimi me ID testuese`, async () => {
    const p = await open({ features: ALL,  native: platform, realKeys: true });
    try {
      await p.waitForTimeout(500);
      const c = await calls(p);
      const order = c.map(sig).filter((s) => !s.includes("addListener"));
      const at = (s) => order.indexOf(s);
      assert.ok(at("Purchases.configure") >= 0, "RevenueCat s'u konfigurua");
      assert.ok(at("AdMob.requestConsentInfo") > at("Purchases.configure") - 1);
      assert.ok(at("AdMob.showConsentForm") > at("AdMob.requestConsentInfo"));
      assert.ok(at("AdMob.initialize") > at("AdMob.showConsentForm"), "SDK u nis para pëlqimit");
      assert.ok(at("AdMob.prepareInterstitial") > at("AdMob.initialize"));
      assert.ok(at("AdMob.prepareRewardVideoAd") > at("AdMob.initialize"));
      if (platform === "ios") assert.ok(at("AdMob.requestTrackingAuthorization") >= 0 && at("AdMob.requestTrackingAuthorization") < at("AdMob.requestConsentInfo"));
      else assert.equal(at("AdMob.requestTrackingAuthorization"), -1, "ATT është vetëm iOS");
      assert.deepEqual(c.find((x) => sig(x) === "AdMob.initialize").args[0], { initializeForTesting: true });
      const unit = c.find((x) => sig(x) === "AdMob.prepareRewardVideoAd").args[0];
      assert.equal(unit.isTesting, true);
      assert.match(unit.adId, /^ca-app-pub-3940256099942544\//, "duhet ID testuese e Google");
      assert.equal(c.find((x) => sig(x) === "Purchases.configure").args[0].apiKey, platform === "ios" ? "appl_testkey" : "goog_testkey");
      assert.deepEqual(p.errors, []);
    } finally { await close(p); }
  });
}

test("NATIVE: reklamë me shpërblim — jep monedha vetëm kur ngjarja e shpërblimit u qëllua", async () => {
  const p = await open({ features: ALL,  native: "android", realKeys: true });
  try {
    await play(p);
    const c0 = await coins(p);
    await p.click("#screen-game .shop-open"); await p.click("#btn-watch-ad");
    await p.waitForTimeout(900);
    assert.equal((await coins(p)) - c0, 30);
    // rimbushja: pas shfaqjes parangarkohet përsëri
    const prepares = (await calls(p)).filter((x) => sig(x) === "AdMob.prepareRewardVideoAd").length;
    assert.ok(prepares >= 2, "reklama s'u parangarkua pas shfaqjes");
    // mbyllur PA shpërblim
    await p.evaluate(() => { window.__mock.rewardMode = "dismiss"; });
    const c1 = await coins(p);
    await p.click("#btn-watch-ad"); await p.waitForTimeout(900);
    assert.equal(await coins(p), c1, "monedha pa u parë reklama deri në fund");
    // pa mbushje (no fill) → mesazh, pa monedha
    await p.evaluate(() => { window.__mock.rewardedFill = false; });
    await p.click("#btn-watch-ad"); await p.waitForTimeout(300); // thirrja e parë parangarkon me dështim
    await p.click("#btn-watch-ad"); await p.waitForTimeout(300);
    assert.match(await text(p, "#toast"), /s'është gati/);
    assert.equal(await coins(p), c1);
  } finally { await close(p); }
});

test("NATIVE: interstitial pas 3 fitoresh; nëse s'ka mbushje, lojtari vazhdon pa pritje", async () => {
  const p = await open({ features: ALL,  native: "ios", realKeys: true, state: { fs_completed: 10, fs_wins_ad: 2 } });
  try {
    await play(p);
    await winLevel(p, ["SHIU", "SHI", "HIU", "HI"]);
    await p.click("#btn-next"); await p.waitForTimeout(800);
    assert.ok((await calls(p)).some((x) => sig(x) === "AdMob.showInterstitial"));
    assert.match(await text(p, "#level-num"), /Niveli 12/, "nuk vazhdoi pas reklamës");
  } finally { await close(p); }
  const q = await open({ features: ALL,  native: "ios", realKeys: true, state: { fs_completed: 10, fs_wins_ad: 2 } });
  try {
    await q.evaluate(() => { window.__mock.interstitialFill = false; });
    // parangarkimi ka ndodhur tashmë me sukses; ri-rrëzo gatishmërinë duke e shfaqur një herë dhe rifilluar pa mbushje
    await play(q);
    await winLevel(q, ["SHIU", "SHI", "HIU", "HI"]);
    await q.click("#btn-next"); await q.waitForTimeout(800);
    assert.match(await text(q, "#level-num"), /Niveli 12/);
  } finally { await close(q); }
});

test("NATIVE: banner vetëm te harta; dalja e shpejtë s'e lë të ngecur (gara e rregulluar)", async () => {
  const p = await open({ features: ALL,  native: "android", realKeys: true });
  try {
    await p.click("#btn-packs"); await p.waitForTimeout(300);
    let c = (await calls(p)).map(sig);
    assert.ok(c.includes("AdMob.showBanner"));
    const opts = (await calls(p)).find((x) => sig(x) === "AdMob.showBanner").args[0];
    assert.equal(opts.adSize, "ADAPTIVE_BANNER"); assert.equal(opts.isTesting, true);
    await p.click("#btn-packs-back"); await p.waitForTimeout(300);
    c = (await calls(p)).map(sig);
    assert.equal(c.filter((x) => x === "AdMob.hideBanner").length, 1);
  } finally { await close(p); }
  const q = await open({ features: ALL,  native: "android", realKeys: true });
  try {
    await q.evaluate(() => { document.getElementById("btn-packs").click(); document.getElementById("btn-packs-back").click(); });
    await q.waitForTimeout(400);
    const bn = (await calls(q)).map(sig).filter((x) => /Banner$/.test(x));
    assert.ok(bn.length === 0 || bn[bn.length - 1] === "AdMob.hideBanner", "banner u ngjit pas daljes: " + bn.join(","));
  } finally { await close(q); }
});

test("NATIVE: blerja — sukses, anulim, rikthim, sinkronizim (rimbursimi heq premium)", async () => {
  const p = await open({ features: ALL,  native: "ios", realKeys: true });
  try {
    await play(p);
    await p.click("#screen-game .shop-open"); await p.click("#btn-remove-ads"); await p.waitForTimeout(500);
    const c = (await calls(p)).map(sig);
    assert.ok(c.includes("Purchases.getOfferings") && c.includes("Purchases.purchasePackage"));
    assert.equal(await p.evaluate(() => localStorage.getItem("fs_premium")), "1");
  } finally { await close(p); }
  const q = await open({ features: ALL,  native: "ios", realKeys: true });
  try {
    await q.evaluate(() => { window.__mock.purchase = "cancel"; });
    await play(q);
    await q.click("#screen-game .shop-open"); await q.click("#btn-remove-ads"); await q.waitForTimeout(400);
    assert.match(await text(q, "#toast"), /Blerja nuk u krye/);
    assert.notEqual(await q.evaluate(() => localStorage.getItem("fs_premium")), "1");
    // rikthim
    await q.evaluate(() => { window.__mock.premiumActive = true; });
    await q.click("#btn-restore-shop"); await q.waitForTimeout(400);
    assert.equal(await q.evaluate(() => localStorage.getItem("fs_premium")), "1");
  } finally { await close(q); }
  // rimbursim: lokalisht premium, dyqani thotë jo → hiqet
  const r = await open({ features: ALL,  native: "ios", realKeys: true, state: { fs_premium: 1 } });
  try {
    await r.waitForTimeout(700);
    assert.equal(await r.evaluate(() => localStorage.getItem("fs_premium")), "0");
  } finally { await close(r); }
  // sinkronizimi në nisje funksionon (gara e rregulluar): premium aktiv në dyqan → mbetet 1
  const s = await open({ features: ALL,  native: "android", realKeys: true, state: { fs_premium: 0 } });
  try {
    await s.waitForTimeout(600);
    assert.ok((await calls(s)).some((x) => sig(x) === "Purchases.getCustomerInfo"), "syncPremium s'u ekzekutua pas configure()");
  } finally { await close(s); }
});

test("NATIVE: pa çelësa RevenueCat → blerja thotë 's'është gati', nuk rrëzohet", async () => {
  const p = await open({ features: ALL,  native: "ios" }); // pa realKeys: çelësat janë vendmbajtës
  try {
    await play(p);
    await p.click("#screen-game .shop-open"); await p.click("#btn-remove-ads"); await p.waitForTimeout(400);
    assert.match(await text(p, "#toast"), /s'është gati/);
    assert.deepEqual(p.errors, []);
  } finally { await close(p); }
});

test("NATIVE: service worker nuk regjistrohet dhe cache-t e vjetra pastrohen", async () => {
  const p = await open({ native: "android", realKeys: true });
  try {
    await p.waitForTimeout(600);
    assert.equal(await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
  } finally { await close(p); }
});

test("NATIVE: butoni mbrapa regjistrohet te plugin-i App; në ekranin kryesor del nga aplikacioni", async () => {
  const p = await open({ native: "android", realKeys: true });
  try {
    assert.equal(await p.evaluate(() => (window.__handlers.backButton || []).length), 1);
    await p.evaluate(() => window.__handlers.backButton[0]());
    assert.ok((await calls(p)).some((x) => sig(x) === "App.exitApp"));
    await play(p);
    await p.evaluate(() => window.__handlers.backButton[0]()); // lojë → hartë
    assert.equal(await p.locator("#screen-packs.active").count(), 1);
  } finally { await close(p); }
});

test("NATIVE: dridhjet përmes Haptics (jo navigator.vibrate); cilësimi i fik; Rate thërret InAppReview", async () => {
  const p = await open({ native: "ios", realKeys: true });
  try {
    await play(p);
    await spell(p, "DET");
    assert.ok((await calls(p)).some((x) => x.p === "Haptics"), "asnjë thirrje Haptics");
    await p.click("#btn-settings");
    await p.click("label.set-row:has(#tgl-vibration)");
    const n = (await calls(p)).filter((x) => x.p === "Haptics").length;
    await spell(p, "TE");
    assert.equal((await calls(p)).filter((x) => x.p === "Haptics").length, n, "dridhja ndodhi me cilësimin e fikur");
    await p.click("#btn-rate"); await p.waitForTimeout(200);
    assert.ok((await calls(p)).some((x) => sig(x) === "InAppReview.requestReview"));
  } finally { await close(p); }
});

/* =========================================================================
 * 3) VERSIONI 1 — pa reklama, pa blerje (konfigurimi i dërguar)
 * ========================================================================= */
test("V1 WEB: pa dyqan, pa ×2, pa banner, pa interstitial, pa 'Rikthe blerjet'", { skip: !V1 && "features janë ON (jo v1)" }, async () => {
  const p = await open({ state: { fs_completed: 10, fs_wins_ad: 2 } });
  try {
    // monedhat janë numërues, jo buton i gjallë
    assert.equal(await p.evaluate(() => [...document.querySelectorAll(".shop-open")].every((b) => b.disabled)), true);
    assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector(".shop-open .plus")).display), "none");
    // cilësimet: pa "Rikthe blerjet"
    await p.click("#btn-settings-home");
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById("btn-restore")).display), "none");
    await p.click("#btn-settings-close");
    // harta: pa banner
    await p.click("#btn-packs"); await p.waitForTimeout(300);
    assert.equal(await p.locator("#sim-banner").count(), 0);
    await p.click("#btn-packs-back");
    // fitore pas 2 fitoreve të "numëruara": pa ×2, pa reklamë të plotë
    await play(p);
    await winLevel(p, ["SHIU", "SHI", "HIU", "HI"]);
    assert.equal(await p.locator("#btn-double").isVisible(), false);
    await p.click("#btn-next"); await p.waitForTimeout(500);
    assert.equal(await p.locator("#overlay-ad.show").count(), 0);
    assert.match(await text(p, "#level-num"), /Niveli 12/);
    assert.deepEqual(p.errors, []);
  } finally { await close(p); }
});

test("V1 NATIVE: asnjë plugin reklamash/blerjesh nuk kërkohet fare dhe s'ka asnjë thirrje", { skip: !V1 && "features janë ON (jo v1)" }, async () => {
  const p = await open({ native: "ios", realKeys: true, state: { fs_completed: 10, fs_wins_ad: 2 } });
  try {
    await p.click("#btn-packs"); await p.waitForTimeout(300);
    await p.click("#btn-packs-back");
    await play(p);
    await winLevel(p, ["SHIU", "SHI", "HIU", "HI"]);
    await p.click("#btn-next"); await p.waitForTimeout(600);
    const reg = await p.evaluate(() => window.__registered);
    assert.ok(!reg.includes("AdMob") && !reg.includes("Purchases"), "u kërkuan plugin-e reklamash/blerjesh: " + reg);
    const c = await calls(p);
    assert.deepEqual(c.filter((x) => x.p === "AdMob" || x.p === "Purchases"), []);
    assert.equal(c.some((x) => x.m === "requestTrackingAuthorization"), false, "kërkesa ATT pa reklama");
    assert.match(await text(p, "#level-num"), /Niveli 12/);
  } finally { await close(p); }
});

/* =========================================================================
 * 4) FJALË TË REFUZUARA, RAPORTIMI DHE LISTA E MADHE
 * ========================================================================= */
test("FJALË: fjala e panjohur thotë të vërtetën, ruhet vetëm në pajisje dhe raportohet me email (pa dërgim automatik)", async () => {
  const p = await open();
  try {
    await play(p);
    await spell(p, "ED", 300);
    assert.match(await text(p, "#toast"), /S'e kemi këtë fjalë në listë/);
    assert.doesNotMatch(await text(p, "#toast"), /nuk është fjalë shqipe/i, "loja s'duhet të pretendojë se fjala është e pavlefshme");
    await spell(p, "ED", 300);
    assert.deepEqual(await p.evaluate(() => JSON.parse(localStorage.getItem("fs_rejected"))), { ED: 2 });
    // raporti shfaqet vetëm kur ka fjalë
    await p.click("#btn-settings");
    assert.equal(await p.locator("#btn-report-words").isVisible(), true);
    assert.match(await text(p, "#report-count"), /\(1\)/);
    await p.click("#btn-report-words");
    const opened = await p.evaluate(() => window.__opened);
    assert.equal(opened.length, 1);
    assert.match(opened[0], /^mailto:migelebishka05@icloud\.com\?/);
    assert.match(decodeURIComponent(opened[0]), /ED/);
    // asgjë s'dërgohet vetvetiu: vetëm një hapje lidhjeje të nisur nga lojtari, pa kërkesa rrjeti
    assert.deepEqual(p.external, []);
    // kalon edhe rifreskimin
    await p.reload(); await p.waitForSelector("#splash", { state: "detached" });
    assert.deepEqual(await p.evaluate(() => JSON.parse(localStorage.getItem("fs_rejected"))), { ED: 2 });
  } finally { await close(p); }
});

test("FJALË: pa fjalë të refuzuara s'ka rresht raportimi; lista ruan më së shumti 100 fjalë", async () => {
  const p = await open();
  try {
    await p.click("#btn-settings-home");
    assert.equal(await p.locator("#btn-report-words").isVisible(), false);
    await p.click("#btn-settings-close");
    await p.evaluate(() => localStorage.setItem("fs_rejected", JSON.stringify(Object.fromEntries(Array.from({ length: 100 }, (_, i) => ["W" + i, 1])))));
    await p.reload(); await p.waitForSelector("#splash", { state: "detached" });
    await play(p);
    await spell(p, "ED", 300); // fjala e 101-të
    const r = await p.evaluate(() => JSON.parse(localStorage.getItem("fs_rejected")));
    assert.equal(Object.keys(r).length, 100);
    assert.ok(r.ED === 1 && !("W0" in r), "më e vjetra duhet hequr");
  } finally { await close(p); }
});

test("FJALË: me listë të madhe pranohen më shumë fjalë, por vetëm 10 paguhen për nivel (pa fryrje të monedhave)", async () => {
  // gjej një nivel me rrotë 5-shkronjëshe dhe ndërto fjalë të panjohura prej shkronjave të tij (VETËM për test)
  const probe = await open();
  const lv = await probe.evaluate(() => {
    let i = 0; for (const pk of PACKS.concat(GENERATED_PACKS)) for (const l of pk.levels) { if (l.letters.length === 5 && i > 200) return { idx: i, letters: l.letters, words: l.words }; i++; }
  });
  await close(probe);
  const perm = (arr, n) => n === 0 ? [[]] : arr.flatMap((x, i) => perm([...arr.slice(0, i), ...arr.slice(i + 1)], n - 1).map((r) => [x, ...r]));
  const fake = [...new Set(perm([...lv.letters], 3).map((a) => a.join("")))].filter((w) => !lv.words.includes(w));
  assert.ok(fake.length >= 12, "s'ka mjaft fjalë testuese për këtë rrotë");
  const extra = fake.slice(0, 12);
  const p = await open({ state: { fs_completed: lv.idx }, wordlist: extra });
  try {
    await play(p);
    const deltas = [];
    for (const w of extra) {
      const c0 = await coins(p), j0 = await text(p, "#jar-count");
      await spell(p, w, 1700); // pret edhe +40 e kavanozit (ylli fluturon ~0.7s) para matjes tjetër
      deltas.push({ coins: (await coins(p)) - c0, jarMoved: (await text(p, "#jar-count")) !== j0, toast: await text(p, "#toast") });
    }
    // 10 të parat japin monedha; 11-ta dhe 12-ta pranohen (✓) por pa monedha, pa yll
    assert.ok(deltas.slice(0, 10).every((d) => d.coins >= 5), "10 të parat duhet të paguhen: " + JSON.stringify(deltas.map((d) => d.coins)));
    for (const d of deltas.slice(10)) {
      assert.equal(d.coins, 0, "fjala mbi kufi dha monedha");
      assert.match(d.toast, /pa monedha shtesë/);
    }
    // s'ka asnjë refuzim: të gjitha u pranuan
    assert.equal(await p.evaluate(() => localStorage.getItem("fs_rejected")), null);
    assert.deepEqual(p.errors, []);
  } finally { await close(p); }
});
