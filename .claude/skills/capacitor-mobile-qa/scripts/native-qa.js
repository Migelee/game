#!/usr/bin/env node
/* native-qa.js — kontrolle statike për Capacitor 8 / iOS / Android.
 *
 *   node .claude/skills/capacitor-mobile-qa/scripts/native-qa.js
 *
 * Kontrollon: plugin-et e lidhura në ios/ dhe android/ = ato të package.json,
 * orientimi, zonat e sigurta, ciklin e jetës (sfond, back, service worker),
 * sjellje të rrezikshme të WebView-t (window.open, http://, alert) dhe SDK-të.
 * NUK e zëvendëson provën në pajisje reale — raporton çfarë mbetet të provohet.
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..", "..", "..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const has = (p) => fs.existsSync(path.join(ROOT, p));
const res = { fail: [], warn: [], pass: [], todo: [] };
const ok = (m) => res.pass.push(m), bad = (m) => res.fail.push(m), warn = (m) => res.warn.push(m);

const pkg = JSON.parse(rd("package.json"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const NOT_PLUGINS = new Set(["@capacitor/core", "@capacitor/cli", "@capacitor/ios", "@capacitor/android", "@capacitor/assets"]);
const expected = Object.keys(deps).filter((d) => (/^@capacitor(-community)?\//.test(d) || /revenuecat/.test(d)) && !NOT_PLUGINS.has(d)).sort();
ok(`plugin-et e pritura (nga package.json): ${expected.join(", ") || "—"}`);

// ---- plugin-et e lidhura
if (has("android/app/src/main/assets/capacitor.plugins.json")) {
  const linked = JSON.parse(rd("android/app/src/main/assets/capacitor.plugins.json")).map((p) => p.pkg).sort();
  if (JSON.stringify(linked) === JSON.stringify(expected)) ok("Android: plugin-et e lidhur = ato të pritura");
  else bad(`Android: lidhur [${linked}] ≠ pritur [${expected}] — ekzekuto npm run android:sync`);
} else warn("android/ s'është gjeneruar — s'u kontrolluan plugin-et Android");
if (has("ios/App/CapApp-SPM/Package.swift")) {
  const linked = [...rd("ios/App/CapApp-SPM/Package.swift").matchAll(/node_modules\/(@[^/]+\/[^"]+)"/g)].map((m) => m[1]).sort();
  if (JSON.stringify(linked) === JSON.stringify(expected)) ok("iOS: plugin-et e lidhur = ato të pritura");
  else bad(`iOS: lidhur [${linked}] ≠ pritur [${expected}] — ekzekuto npm run ios:sync`);
} else warn("ios/ s'është gjeneruar — s'u kontrolluan plugin-et iOS");

// ---- konfigurimi i Capacitor
const cap = JSON.parse(rd("capacitor.config.json"));
if (cap.webDir === "www") ok("webDir=www"); else bad(`webDir=${cap.webDir}`);
const sb = cap.plugins && cap.plugins.SystemBars;
if (sb && sb.insetsHandling === "css" && sb.style === "DARK") ok("SystemBars: insetsHandling=css, style=DARK (ikonat e çelëta mbi sfond të errët)");
else bad("SystemBars nuk është konfiguruar (Android e vjetër: env(safe-area) = 0; status bar-i i pa-lexueshëm)");

// ---- orientimi dhe SDK-të e platformave
if (has("ios/App/App/Info.plist")) {
  const p = rd("ios/App/App/Info.plist");
  if (!/UIInterfaceOrientationLandscape/.test(p)) ok("iOS: vetëm portret"); else bad("iOS: lejon landscape");
  if (/<key>UIRequiresFullScreen<\/key>\s*<true\/>/.test(p)) ok("iOS: UIRequiresFullScreen (iPad vetëm portret)"); else bad("iOS: UIRequiresFullScreen mungon");
  if (/<key>UIViewControllerBasedStatusBarAppearance<\/key>\s*<true\/>/.test(p)) ok("iOS: status bar sipas kontrollorit (kërkohet nga SystemBars)"); else bad("iOS: UIViewControllerBasedStatusBarAppearance≠true");
  const m = rd("ios/App/App.xcodeproj/project.pbxproj").match(/IPHONEOS_DEPLOYMENT_TARGET = ([\d.]+)/);
  warn(`iOS deployment target ${m ? m[1] : "?"} — kontrollo minimumet aktuale të Apple për Xcode/SDK të kërkuar nga App Store`);
}
if (has("android/app/src/main/AndroidManifest.xml")) {
  const m = rd("android/app/src/main/AndroidManifest.xml");
  if (/screenOrientation="portrait"/.test(m)) ok("Android: portret"); else bad("Android: pa kyç portreti");
  const v = rd("android/variables.gradle");
  warn(`Android min/target/compileSdk: ${(v.match(/minSdkVersion = (\d+)/) || [])[1]}/${(v.match(/targetSdkVersion = (\d+)/) || [])[1]}/${(v.match(/compileSdkVersion = (\d+)/) || [])[1]} — kontrollo kërkesën aktuale të Google Play për targetSdk`);
  if (/android\.permission\.(?!INTERNET|ACCESS_NETWORK_STATE)/.test(m)) warn("Android: leje shtesë në manifest — secila duhet të justifikohet te Play Console");
}

// ---- kodi i faqes: cikli i jetës dhe sjellje të rrezikshme në WebView
const html = rd("www/index.html"), game = rd("www/js/game.js"), native = rd("www/js/native.js");
const src = { "index.html": html, "game.js": game, "native.js": native, "ads.js": rd("www/js/ads.js") };
if (/viewport-fit=cover/.test(html)) ok("viewport-fit=cover"); else bad("viewport-fit=cover mungon (zonat e sigurta nuk punojnë)");
if (/visibilitychange/.test(game) && /Music\.stop\(\)/.test(game)) ok("cikli i jetës: muzika ndalet kur aplikacioni shkon në sfond"); else bad("muzika s'ndalet në sfond");
if (/onBackButton\(handleBack\)/.test(game)) ok("Android: butoni mbrapa i trajtuar"); else bad("Android: butoni mbrapa s'është i trajtuar");
if (/isNative\(\)[\s\S]{0,240}unregister/.test(game)) ok("service worker çregjistrohet në native"); else bad("service worker mund të shërbejë skedarë të vjetër në native");
for (const [f, t] of Object.entries(src)) {
  if (/window\.open\s*\(/.test(t)) bad(`${f}: window.open — mund ta zëvendësojë WebView-n pa rrugë kthimi`);
  if (/\balert\s*\(|\bconfirm\s*\(|\bprompt\s*\(/.test(t)) bad(`${f}: alert/confirm/prompt (bllokojnë, duken jo-native)`);
  const urls = [...t.matchAll(/["'`](https?:\/\/[^"'`\s]+)/g)].map((m) => m[1]).filter((u) => !/localhost|w3\.org|apple\.com\/DTDs|policies\.google|revenuecat|migelee\.github\.io/.test(u));
  if (urls.length) warn(`${f}: URL të jashtme: ${[...new Set(urls)].join(", ")}`);
  if (/\bfetch\(|XMLHttpRequest/.test(t)) warn(`${f}: kërkesa rrjeti — loja duhet të punojë offline`);
}
if (/navigator\.vibrate/.test(game) && /Native\.haptic\(kind\)/.test(game)) ok("dridhjet: Haptics native me rezervë navigator.vibrate"); else bad("dridhjet mund të mos punojnë në iOS");
if (/LS\.get\(/.test(game) && !/[^.]localStorage\.(get|set)Item\(/.test(game.replace(/const LS = \{[\s\S]*?\n  \};/, ""))) ok("ruajtja kalon vetëm nga mbështjellësi i sigurt LS"); else bad("localStorage përdoret drejtpërdrejt jashtë LS");

// ---- çfarë s'mund të kontrollohet këtu
res.todo.push("Provë në iPhone/iPad real: notch/Dynamic Island, rrotullimi, dridhjet, audio me çelësin e heshtjes, kthimi nga sfondi");
res.todo.push("Provë në Android real (WebView i vjetër dhe i ri): zonat e sigurta, edge-to-edge, butoni mbrapa, lëvizja me gjeste");
res.todo.push("Ndërtim: `./gradlew assembleDebug` (Android) dhe Xcode Archive (iOS) — s'bëhen dot pa SDK/macOS");
res.todo.push("Shpërndarja e memories/baterisë dhe nisja e ftohtë (e matshme vetëm në pajisje)");

const show = (t, a, i) => { if (a.length) { console.log(`\n${t} (${a.length})`); a.forEach((x) => console.log(`  ${i} ${x}`)); } };
console.log("NATIVE-QA — Capacitor 8");
show("DËSHTIME", res.fail, "✗"); show("PARALAJMËRIME", res.warn, "!"); show("NË RREGULL", res.pass, "✓"); show("MBETET PËR PAJISJE REALE", res.todo, "→");
process.exit(res.fail.length ? 1 : 0);
