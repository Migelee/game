/* Teste për vegla, konfigurim, privatësi, pretendime dhe plugin-et.
 * Ekzekutimi: npm test */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const fixture = (n) => fs.readFileSync(path.join(__dirname, "fixtures", n), "utf8");

/* ---------- package.json ---------- */
test("çdo script i package.json që thërret `node <skedar>` tregon skedar që ekziston", () => {
  const scripts = JSON.parse(read("package.json")).scripts;
  for (const [name, cmd] of Object.entries(scripts)) {
    for (const m of cmd.matchAll(/node\s+(\S+\.js)/g)) {
      assert.ok(fs.existsSync(path.join(ROOT, m[1])), `script "${name}" → ${m[1]} mungon`);
    }
  }
});

/* ---------- configure-native ---------- */
const cn = require("../tools/configure-native.js");
const count = (s, re) => (s.match(re) || []).length;

test("Info.plist (reklamat ON): portret, arm64, ID e AdMob, ATT, eksport — saktësisht një herë, idempotent", () => {
  const once = cn.patchPlist(fixture("Info.plist.generated"), { appId: "ca-app-pub-1~2", ads: true });
  const twice = cn.patchPlist(once, { appId: "ca-app-pub-1~2", ads: true });
  assert.equal(once, twice, "ekzekutimi i dytë ndryshoi skedarin");
  assert.equal(count(once, /<key>GADApplicationIdentifier<\/key>/g), 1);
  assert.match(once, /<string>ca-app-pub-1~2<\/string>/);
  assert.equal(count(once, /<key>NSUserTrackingUsageDescription<\/key>/g), 1);
  assert.equal(count(once, /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/g), 1);
  assert.equal(count(once, /UIInterfaceOrientationLandscape/g), 0, "landscape ka mbetur");
  assert.equal(count(once, /<string>arm64<\/string>/g), 1);
  assert.equal(count(once, /armv7/g), 0);
  assert.equal(count(once, /<key>UIRequiresFullScreen<\/key>/g), 1);
  // ruan çelësat origjinalë
  assert.match(once, /<key>CFBundleDisplayName<\/key>/);
  assert.match(once, /<key>UILaunchStoryboardName<\/key>/);
});

test("AndroidManifest (reklamat ON): APPLICATION_ID + portret, idempotent; strings.xml me admob_app_id", () => {
  const m1 = cn.patchManifest(fixture("AndroidManifest.xml.generated"), { ads: true });
  assert.equal(m1, cn.patchManifest(m1, { ads: true }));
  assert.equal(count(m1, /com\.google\.android\.gms\.ads\.APPLICATION_ID/g), 1);
  assert.equal(count(m1, /android:screenOrientation="portrait"/g), 1);
  assert.match(m1, /android:name="\.MainActivity"/);
  const s1 = cn.patchStrings(fixture("strings.xml.generated"), { appId: "ca-app-pub-1~3", ads: true });
  assert.equal(s1, cn.patchStrings(s1, { appId: "ca-app-pub-1~3", ads: true }));
  assert.equal(count(s1, /name="admob_app_id"/g), 1);
  // ndryshimi i ID-së e zëvendëson, nuk e dyfishon
  assert.equal(count(cn.patchStrings(s1, { appId: "ca-app-pub-9~9", ads: true }), /name="admob_app_id"/g), 1);
});

test("reklamat OFF (v1): asnjë çelës AdMob/ATT/APPLICATION_ID — dhe kalimi ON→OFF i pastron", () => {
  const plistOn = cn.patchPlist(fixture("Info.plist.generated"), { appId: "ca-app-pub-1~2", ads: true });
  const plistOff = cn.patchPlist(plistOn, { appId: "ca-app-pub-1~2", ads: false });
  for (const k of ["GADApplicationIdentifier", "GADIsAdManagerApp", "SKAdNetworkItems", "NSUserTrackingUsageDescription"]) {
    assert.equal(count(plistOff, new RegExp(`<key>${k}</key>`, "g")), 0, k);
  }
  assert.equal(plistOff, cn.patchPlist(fixture("Info.plist.generated"), { ads: false }), "ON→OFF ≠ OFF direkt");
  // mbetet çka duhet për çdo publikim
  assert.equal(count(plistOff, /UIInterfaceOrientationLandscape/g), 0);
  assert.equal(count(plistOff, /<key>ITSAppUsesNonExemptEncryption<\/key>/g), 1);
  assert.equal(count(plistOff, /<string>arm64<\/string>/g), 1);
  const mOff = cn.patchManifest(cn.patchManifest(fixture("AndroidManifest.xml.generated"), { ads: true }), { ads: false });
  assert.equal(count(mOff, /APPLICATION_ID/g), 0);
  assert.equal(count(mOff, /android:screenOrientation="portrait"/g), 1);
  assert.equal(mOff, cn.patchManifest(mOff, { ads: false }));
  const sOff = cn.patchStrings(cn.patchStrings(fixture("strings.xml.generated"), { appId: "x", ads: true }), { ads: false });
  assert.equal(count(sOff, /admob_app_id/g), 0);
});

test("App ID: testMode→ID shembull; publikim me vendmbajtëse→GABIM; publikim me ID reale→ajo", () => {
  const base = (testMode, ios, android) => ({ testMode, admob: { appId: { ios, android } } });
  const t = cn.resolveAppIds(base(true, "ca-app-pub-XXXXXXXXXXXXXXXX~Y", "ca-app-pub-XXXXXXXXXXXXXXXX~Z"));
  assert.equal(t.ios, cn.SAMPLE_APP_IDS.ios);
  assert.throws(() => cn.resolveAppIds(base(false, "ca-app-pub-XXXXXXXXXXXXXXXX~Y", "ca-app-pub-1~2")), /vendmbajtëse/);
  const r = cn.resolveAppIds(base(false, "ca-app-pub-1~1", "ca-app-pub-1~2"));
  assert.deepEqual(r, { ios: "ca-app-pub-1~1", android: "ca-app-pub-1~2" });
});

/* ---------- verify-lexicon (me server të simuluar) ---------- */
test("verify-lexicon: ndan fjalët e gjetura nga ato pa faqe, me grupe prej 40", async () => {
  const { checkOnline } = require("../tools/verify-lexicon.js");
  const known = new Set(["mal", "det"]);
  let requests = 0;
  const srv = http.createServer((req, res) => {
    requests++;
    const titles = decodeURIComponent(new URL(req.url, "http://x").searchParams.get("titles")).split("|");
    const pages = {};
    titles.forEach((t, i) => { pages[i] = known.has(t) ? { title: t } : { title: t, missing: "" }; });
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ query: { pages } }));
  });
  await new Promise((r) => srv.listen(0, r));
  try {
    const words = ["MAL", "DET", "XYZQ", ...Array.from({ length: 45 }, (_, i) => "W" + i)];
    const res = await checkOnline(words, `http://127.0.0.1:${srv.address().port}`);
    assert.equal(res.get("MAL"), true);
    assert.equal(res.get("DET"), true);
    assert.equal(res.get("XYZQ"), false);
    assert.equal(requests, 2, "48 fjalë = 2 grupe");
  } finally { srv.close(); }
});

/* ---------- pretendime, privatësi, konfigurim ---------- */
test("asnjë skedar nuk pretendon 'verifikuar sipas fjalorit' pa verifikim", () => {
  for (const f of ["README.md", "tools/lexicon.js", "www/js/levels.js", "www/index.html", "www/js/game.js", "www/js/ads.js"]) {
    assert.doesNotMatch(read(f), /verifikuar[a-z]* sipas|sipas Fjalorit të Gjuhës/i, f);
  }
});

test("politika e privatësisë: kontakt, datë, pa vendmbajtëse", () => {
  const p = read("www/privacy.html");
  assert.match(p, /mailto:[^"]+@[^"]+/);
  assert.match(p, /Përditësuar më \d{1,2} [a-zë]+ 20\d\d/);
  assert.doesNotMatch(p, /XXXX|TODO|example\.com/);
});

test("config: bundle ID = capacitor appId; URL e privatësisë nuk është vendmbajtëse", () => {
  const { APP_CONFIG } = require("../www/js/config.js");
  assert.equal(JSON.parse(read("capacitor.config.json")).appId, APP_CONFIG.bundleId);
  assert.doesNotMatch(APP_CONFIG.privacyUrl, /X{4,}|example\.com/);
});

test("plugin-et e lidhur me veçoritë: ON ⇒ të instaluar dhe me emrat që thërret loja; OFF ⇒ të hequr nga package.json", () => {
  const { APP_CONFIG } = require("../www/js/config.js");
  const pkg = JSON.parse(read("package.json"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const idx = (p) => fs.readFileSync(path.join(ROOT, "node_modules", p, "dist/esm/index.js"), "utf8");
  const native = read("www/js/native.js"), ads = read("www/js/ads.js"), game = read("www/js/game.js");
  const always = { Haptics: "@capacitor/haptics", InAppReview: "@capacitor-community/in-app-review", App: "@capacitor/app" };
  for (const [name, p] of Object.entries(always)) {
    assert.ok(deps[p], `${p} mungon nga package.json`);
    assert.ok(idx(p).includes(`registerPlugin('${name}'`), `${p} nuk regjistron '${name}'`);
    assert.ok((native + game).includes(`"${name}"`), `loja nuk e thërret ${name}`);
  }
  const optional = [
    ["AdMob", "@capacitor-community/admob", APP_CONFIG.features.ads],
    ["Purchases", "@revenuecat/purchases-capacitor", APP_CONFIG.features.purchases],
  ];
  for (const [name, p, on] of optional) {
    if (!on) { assert.equal(deps[p], undefined, `${p} duhet hequr kur veçoria është OFF`); continue; }
    assert.ok(deps[p], `${p} mungon por veçoria është ON`);
    assert.ok(idx(p).includes(`registerPlugin('${name}'`), `${p} nuk regjistron '${name}'`);
    assert.ok(ads.includes(`"${name}"`) || read("www/js/native.js").includes(name), `loja nuk e thërret ${name}`);
  }
  if (APP_CONFIG.features.ads) {
    const enums = ["interstitial/interstitial-ad-plugin-events.enum.d.ts", "reward/reward-ad-plugin-events.enum.d.ts"]
      .map((f) => fs.readFileSync(path.join(ROOT, "node_modules/@capacitor-community/admob/dist/esm", f), "utf8")).join("\n");
    for (const ev of ["interstitialAdDismissed", "onRewardedVideoAdReward", "onRewardedVideoAdDismissed"]) {
      assert.ok(enums.includes(`"${ev}"`), `ngjarja ${ev} nuk ekziston në AdMob`);
    }
  }
});

test("politika e privatësisë përputhet me veçoritë (reklama/blerje) dhe shablloni me reklama i mban të dyja", () => {
  const { APP_CONFIG } = require("../www/js/config.js");
  const p = read("www/privacy.html");
  assert.equal(/AdMob/.test(p), !!APP_CONFIG.features.ads, "AdMob në politikë ≠ features.ads");
  assert.equal(/RevenueCat/.test(p), !!APP_CONFIG.features.purchases, "RevenueCat në politikë ≠ features.purchases");
  const tpl = read("docs/privacy-with-ads.html");
  assert.match(tpl, /AdMob/); assert.match(tpl, /RevenueCat/);
  if (!APP_CONFIG.features.ads && !APP_CONFIG.features.purchases) {
    assert.match(p, /nuk mbledh asnjë të dhënë/);
  }
});

test("versioni: config.js = package.json; zonat e sigurta Android; SystemBars e konfiguruar", () => {
  const { APP_CONFIG } = require("../www/js/config.js");
  assert.equal(APP_CONFIG.version, JSON.parse(read("package.json")).version);
  // çdo env(safe-area-*) është vetëm te përkufizimi i --sat/--sab (Android WebView < 140 e ka 0)
  const css = read("www/css/style.css");
  for (const line of css.split("\n").filter((l) => /env\(safe-area-inset/.test(l))) {
    assert.match(line, /--sat:|--sab:/, "env(safe-area-*) i drejtpërdrejtë: " + line.trim());
  }
  assert.match(css, /var\(--safe-area-inset-top/);
  const sb = JSON.parse(read("capacitor.config.json")).plugins.SystemBars;
  assert.deepEqual([sb.insetsHandling, sb.style], ["css", "DARK"]);
});

/* ---------- aseti ---------- */
function pngInfo(file) {
  const d = fs.readFileSync(path.join(ROOT, file));
  assert.equal(d.subarray(1, 4).toString(), "PNG", file);
  return { w: d.readUInt32BE(16), h: d.readUInt32BE(20), colorType: d[25] };
}
test("ikona: 1024×1024 RGB pa alfa (kërkesë e App Store); splash 2732×2732", () => {
  const icon = pngInfo("assets/icon.png");
  assert.deepEqual([icon.w, icon.h, icon.colorType], [1024, 1024, 2]);
  for (const f of ["assets/splash.png", "assets/splash-dark.png"]) {
    const s = pngInfo(f);
    assert.deepEqual([s.w, s.h], [2732, 2732], f);
  }
});

test("service worker: çdo skedar i listuar ekziston", () => {
  const sw = read("www/sw.js");
  for (const m of sw.matchAll(/^\s+"([^"]+\.\w+)",?$/gm)) {
    assert.ok(fs.existsSync(path.join(ROOT, "www", m[1])), `sw.js liston ${m[1]} që s'ekziston`);
  }
});
