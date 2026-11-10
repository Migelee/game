#!/usr/bin/env node
/* =========================================================================
 * audit.js — kontroll i gatishmërisë për publikim.
 *     npm run audit              # raport (vendmbajtëset janë paralajmërime)
 *     npm run audit -- --release # vendmbajtëset/testMode bëhen BLLOKUES (exit 1)
 *
 * Kupton features.ads / features.purchases (config.js): VERSIONI 1 del pa
 * reklama dhe pa blerje, ndaj çelësat e AdMob/RevenueCat s'janë të nevojshëm.
 * Kontrollon vetëm atë që mund të dihet nga skedarët. NUK provon reklamat/
 * blerjet në pajisje, NUK ndërton iOS, dhe NUK verifikon fjalorin.
 * ========================================================================= */

const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const release = process.argv.includes("--release");
const { APP_CONFIG: C } = require("../www/js/config.js");

const out = { block: [], warn: [], ok: [] };
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const add = (kind, msg) => out[kind].push(msg);
const releaseOnly = release ? "block" : "warn"; // vendmbajtëset bllokojnë vetëm te --release
const ADS = !!C.features.ads, BUY = !!C.features.purchases;
const pkg = JSON.parse(read("package.json"));
const hasDep = (n) => !!((pkg.dependencies || {})[n] || (pkg.devDependencies || {})[n]);

// ---- fushëveprimi
add("ok", `fushëveprimi: reklama ${ADS ? "ON" : "OFF"}, blerje ${BUY ? "ON" : "OFF"}${!ADS && !BUY ? " (versioni 1: pa monetizim)" : ""}`);

// ---- konfigurimi (vetëm çka duhet për veçoritë e aktivizuara)
const needed = {};
if (ADS) needed.admob = C.admob;
if (BUY) needed.revenuecat = C.revenuecat;
const phCount = (JSON.stringify(needed).match(/X{4,}/g) || []).length;
if (phCount) add(releaseOnly, `config.js ka ${phCount} vlera vendmbajtëse për veçoritë e aktivizuara — plotëso para publikimit`);
else add("ok", "config.js: asnjë vendmbajtëse e nevojshme");
if (ADS && C.testMode) add(releaseOnly, "config.js: testMode=true (reklama testuese) — kaloje false vetëm për ndërtimin e publikimit");
if (C.version !== pkg.version) add("block", `versioni ndryshon: config.js=${C.version}, package.json=${pkg.version}`);
else add("ok", `versioni i njëjtë (${C.version})`);

const cap = JSON.parse(read("capacitor.config.json"));
if (cap.appId === C.bundleId) add("ok", `bundle ID i njëjtë në capacitor.config.json dhe config.js (${C.bundleId})`);
else add("block", `bundle ID ndryshon: capacitor.config.json=${cap.appId}, config.js=${C.bundleId}`);
add("warn", `bundle ID "${C.bundleId}" është i përkohshëm — konfirmoje para se ta krijosh te App Store Connect (s'ndryshohet më vonë)`);
add("warn", `emri "${cap.appName}": disponueshmëria te App Store kontrollohet vetëm te App Store Connect`);
const sb = cap.plugins && cap.plugins.SystemBars;
if (sb && sb.insetsHandling === "css" && sb.style === "DARK") add("ok", "SystemBars: insetsHandling=css, style=DARK");
else add("block", "capacitor.config.json: SystemBars mungon (zonat e sigurta/ikonat e status bar-it në Android)");

// ---- plugin-et: lidhja me veçoritë
const pluginRule = (dep, on, label) => {
  if (on && !hasDep(dep)) add("block", `${label} është ON por ${dep} s'është te package.json`);
  else if (!on && hasDep(dep)) add("block", `${label} është OFF por ${dep} është ende te package.json — do të futej në aplikacion`);
  else add("ok", `${dep} ${on ? "i nevojshëm dhe i instaluar" : "i hequr (veçoria OFF)"}`);
};
pluginRule("@capacitor-community/admob", ADS, "features.ads");
pluginRule("@revenuecat/purchases-capacitor", BUY, "features.purchases");

// ---- privatësia: politika duhet të përputhet me veçoritë
const priv = read("www/privacy.html");
const mentions = (re) => re.test(priv);
if (ADS !== mentions(/admob/i)) add("block", `privacy.html ${ADS ? "nuk përmend" : "përmend"} AdMob por reklamat janë ${ADS ? "ON" : "OFF"}`);
else add("ok", "privacy.html përputhet me reklamat");
if (BUY !== mentions(/revenuecat/i)) add("block", `privacy.html ${BUY ? "nuk përmend" : "përmend"} RevenueCat por blerjet janë ${BUY ? "ON" : "OFF"}`);
else add("ok", "privacy.html përputhet me blerjet");
if (/mailto:[^"]+@/.test(priv)) add("ok", "privacy.html ka adresë kontakti"); else add("block", "privacy.html pa adresë kontakti");
if (/X{4,}|example\.com/.test(C.privacyUrl)) add(releaseOnly, "privacyUrl është vendmbajtëse");
else add("warn", `privacyUrl (${C.privacyUrl}) — verifiko dorazi që hapet publikisht (GitHub Pages i aktivizuar?)`);

// ---- pretendime pa bazë
const claimFiles = ["README.md", "tools/lexicon.js", "www/js/levels.js", "www/index.html", "www/js/game.js"];
const badClaim = claimFiles.filter((f) => /verifikuar[a-z]* sipas|sipas Fjalorit të Gjuhës/i.test(read(f)));
if (badClaim.length) add("block", `pretendim i paverifikuar për fjalorin te: ${badClaim.join(", ")}`);
else add("ok", "asnjë pretendim 'verifikuar sipas fjalorit' i paverifikuar");
add("warn", "leksiku dhe shpjegimet NUK janë verifikuar me fjalor (shih tools/lexicon-review.md)");

// ---- lista e madhe e fjalëve të pranuara
const wl = read("www/js/wordlist-sq.js");
const wlHead = (k) => (wl.match(new RegExp(`\\* ${k}: (.*)`)) || [])[1] || "";
const wlCount = parseInt(wlHead("count"), 10) || 0;
if (wlCount === 0) {
  add("warn", "lista e madhe e fjalëve është BOSH — pranohen vetëm fjalët e leksikut (~365); lojtarët do të provojnë fjalë të vlefshme që nuk njihen. Shih tools/build-wordlist.js");
} else {
  add("ok", `lista e madhe: ${wlCount} fjalë, burimi: ${wlHead("source")}, licenca: ${wlHead("license")}`);
  if (/^unreviewed/i.test(wlHead("review")) || !wlHead("review") || /asnjë/.test(wlHead("review"))) {
    add(releaseOnly, "lista e madhe NUK është rishikuar nga një folës shqip (review: " + (wlHead("review") || "—") + ") — rishiko tools/wordlist-review-sample.md");
  } else add("ok", `lista e madhe e rishikuar: ${wlHead("review")}`);
}

// ---- aseti
for (const f of ["assets/icon.png", "assets/splash.png"]) {
  if (exists(f)) add("ok", `${f} ekziston`); else add(releaseOnly, `${f} mungon — ekzekuto npm run assets`);
}

// ---- service worker
const sw = read("www/sw.js");
const assets = [...sw.matchAll(/^\s+"([^"]+)",?$/gm)].map((m) => m[1]).filter((f) => /\.\w+$/.test(f));
const missing = assets.filter((f) => !exists("www/" + f));
if (missing.length) add("block", `sw.js liston skedarë që s'ekzistojnë: ${missing.join(", ")}`);
else add("ok", `sw.js: ${assets.length} skedarë, të gjithë ekzistojnë`);

// ---- scripts e package.json
const broken = [];
for (const [k, v] of Object.entries(pkg.scripts)) {
  for (const m of v.matchAll(/node\s+(\S+\.js)/g)) if (!exists(m[1])) broken.push(`${k} → ${m[1]}`);
}
if (broken.length) add("block", `scripts të prishura: ${broken.join("; ")}`); else add("ok", "package.json: të gjitha scripts tregojnë skedarë ekzistues");

// ---- projektet native (nëse janë gjeneruar)
if (exists("ios/App/App/Info.plist")) {
  const p = read("ios/App/App/Info.plist");
  const has = (k) => p.includes(`<key>${k}</key>`);
  const adKeys = ["GADApplicationIdentifier", "NSUserTrackingUsageDescription", "SKAdNetworkItems"];
  if (ADS) {
    const lacking = adKeys.filter((k) => !has(k));
    if (lacking.length) add("block", `Info.plist mungon: ${lacking.join(", ")} — ekzekuto npm run ios:sync`);
    else add("ok", "Info.plist ka çelësat e AdMob/ATT");
  } else {
    const extra = adKeys.filter(has);
    if (extra.length) add("block", `Info.plist ka çelësa reklamash por reklamat janë OFF: ${extra.join(", ")} — ekzekuto npm run ios:sync`);
    else add("ok", "Info.plist: pa çelësa AdMob/ATT (reklamat OFF)");
  }
  if (has("ITSAppUsesNonExemptEncryption")) add("ok", "Info.plist: ITSAppUsesNonExemptEncryption i vendosur"); else add("block", "Info.plist pa ITSAppUsesNonExemptEncryption");
  const land = (p.match(/UIInterfaceOrientationLandscape/g) || []).length;
  if (land) add("block", "Info.plist lejon landscape — loja është portret"); else add("ok", "Info.plist: vetëm portret");
} else add("warn", "ios/ nuk është gjeneruar (npm run ios:add — kërkon macOS)");
if (exists("android/app/src/main/AndroidManifest.xml")) {
  const m = read("android/app/src/main/AndroidManifest.xml");
  const hasId = m.includes("com.google.android.gms.ads.APPLICATION_ID");
  if (ADS && !hasId) add("block", "AndroidManifest pa APPLICATION_ID — aplikacioni do të rrëzohet në nisje me reklama");
  else if (!ADS && hasId) add("block", "AndroidManifest ka APPLICATION_ID por reklamat janë OFF — ekzekuto npm run android:sync");
  else add("ok", `AndroidManifest: APPLICATION_ID ${ADS ? "i pranishëm" : "mungon siç duhet (reklamat OFF)"}`);
  if (m.includes('screenOrientation="portrait"')) add("ok", "AndroidManifest: portret"); else add("block", "AndroidManifest pa kyç portreti");
  const gradle = exists("android/app/capacitor.build.gradle") ? read("android/app/capacitor.build.gradle") : "";
  if (!ADS && /admob/i.test(gradle)) add("block", "android/ lidh ende AdMob — ekzekuto npm run android:sync");
} else add("warn", "android/ nuk është gjeneruar (npm run android:add)");

// ---- raporti
const show = (title, arr, icon) => { if (arr.length) { console.log(`\n${title} (${arr.length})`); arr.forEach((x) => console.log(`  ${icon} ${x}`)); } };
console.log(`AUDIT${release ? " (--release)" : ""} — Fjalë Shqip v${C.version}`);
show("BLLOKUES", out.block, "✗");
show("PARALAJMËRIME", out.warn, "!");
show("NË RREGULL", out.ok, "✓");
console.log("\nKUJDES: ky audit nuk provon reklamat/blerjet në pajisje reale, as iOS, as fjalorin.");
process.exit(out.block.length ? 1 : 0);
