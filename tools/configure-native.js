#!/usr/bin/env node
/* =========================================================================
 * configure-native.js — i përshtat projektet native të gjeneruara nga
 * `npx cap add ios|android` me atë që kërkon loja për të nisur dhe për
 * t'u pranuar në dyqane. Idempotent: mund të ekzekutohet sa herë të duash
 * (ios:add, ios:sync, android:add, android:sync e thërrasin vetë).
 *
 * Çfarë bën:
 *  iOS      Info.plist: vetëm portret (+ UIRequiresFullScreen për iPad), arm64,
 *           ITSAppUsesNonExemptEncryption=false. VETËM me features.ads=true:
 *           App ID i AdMob (GADApplicationIdentifier), teksti ATT, SKAdNetwork.
 *  Android  AndroidManifest.xml: orientimi portret. VETËM me features.ads=true:
 *           meta-data APPLICATION_ID + strings.xml (admob_app_id).
 *
 * Versioni 1 del dhe pa reklama: çelësat e AdMob/ATT NUK shtohen (dhe hiqen
 * nëse ishin shtuar më parë) — pa SDK reklamash nuk ka nevojë për to dhe
 * s'ka çfarë të deklarohet për ndjekje në App Store.
 *
 * App ID: me testMode=true përdoren ID-të EMËR të Google (e sigurt për
 * zhvillim). Me testMode=false dhe ID vendmbajtëse, skripti NDALET me gabim —
 * që të mos dërgosh kurrë një ndërtim publikimi me ID testuese/boshe.
 * ========================================================================= */

const fs = require("fs");
const path = require("path");
const { APP_CONFIG } = require("../www/js/config.js");

const ROOT = path.join(__dirname, "..");

// ID-të e aplikacionit-shembull të Google (dokumentacioni zyrtar AdMob)
const SAMPLE_APP_IDS = {
  ios: "ca-app-pub-3940256099942544~1458002511",
  android: "ca-app-pub-3940256099942544~3347511713",
};

const ATT_TEXT =
  "Ky identifikues përdoret për t'ju shfaqur reklama më të përshtatshme. " +
  "Mund ta refuzoni dhe loja funksionon njësoj.";

const isPlaceholder = (s) => !s || /X{4,}/.test(s);

/** Zgjedh App ID-të; hedh gabim për publikim me vlera vendmbajtëse. */
function resolveAppIds(cfg) {
  const out = {};
  for (const p of ["ios", "android"]) {
    const configured = cfg.admob.appId[p];
    if (cfg.testMode) {
      out[p] = SAMPLE_APP_IDS[p];
    } else if (isPlaceholder(configured)) {
      throw new Error(
        `testMode=false por admob.appId.${p} është ende vendmbajtëse. ` +
        "Vendos App ID-në reale te www/js/config.js."
      );
    } else {
      out[p] = configured;
    }
  }
  return out;
}

/* ---------- iOS: Info.plist ---------- */

// heq një çelës (me vlerën e tij) nëse ekziston — baza e idempotencës
function removePlistKey(xml, key) {
  const re = new RegExp(
    `[ \\t]*<key>${key.replace(/[~.]/g, "\\$&")}</key>\\s*(?:<array>[\\s\\S]*?</array>|<string>[\\s\\S]*?</string>|<true/>|<false/>)[ \\t]*\\n?`,
    "g"
  );
  return xml.replace(re, "");
}

function patchPlist(xml, { appId, ads }) {
  const managed = [
    "GADIsAdManagerApp", "GADApplicationIdentifier", "SKAdNetworkItems",
    "NSUserTrackingUsageDescription", "ITSAppUsesNonExemptEncryption",
    "UIRequiresFullScreen", "UISupportedInterfaceOrientations",
    "UISupportedInterfaceOrientations~ipad", "UIRequiredDeviceCapabilities",
  ];
  let out = xml;
  for (const k of managed) out = removePlistKey(out, k);

  const adsBlock = ads ? [
    "\t<key>GADIsAdManagerApp</key>\n\t<true/>",
    `\t<key>GADApplicationIdentifier</key>\n\t<string>${appId}</string>`,
    "\t<key>SKAdNetworkItems</key>\n\t<array>\n\t\t<dict>\n\t\t\t<key>SKAdNetworkIdentifier</key>\n\t\t\t<string>cstr6suwn9.skadnetwork</string>\n\t\t</dict>\n\t</array>",
    `\t<key>NSUserTrackingUsageDescription</key>\n\t<string>${ATT_TEXT}</string>`,
  ] : [];
  const block = [
    ...adsBlock,
    "\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>",
    "\t<key>UIRequiresFullScreen</key>\n\t<true/>",
    "\t<key>UISupportedInterfaceOrientations</key>\n\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>",
    "\t<key>UISupportedInterfaceOrientations~ipad</key>\n\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>",
    "\t<key>UIRequiredDeviceCapabilities</key>\n\t<array>\n\t\t<string>arm64</string>\n\t</array>",
  ].join("\n");

  const idx = out.lastIndexOf("</dict>");
  if (idx === -1) throw new Error("Info.plist pa </dict> — format i papritur");
  return out.slice(0, idx) + block + "\n" + out.slice(idx);
}

/* ---------- Android: manifest + strings ---------- */

function patchManifest(xml, { ads }) {
  let out = xml;
  // heq meta-data ekzistuese të AdMob (që kalimi ads true→false të jetë i pastër)
  out = out.replace(/[ \t]*<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^>]*\/>[ \t]*\n?/g, "");
  if (ads) {
    const meta =
      '        <meta-data\n' +
      '            android:name="com.google.android.gms.ads.APPLICATION_ID"\n' +
      '            android:value="@string/admob_app_id" />\n';
    const idx = out.lastIndexOf("</application>");
    if (idx === -1) throw new Error("AndroidManifest pa </application>");
    const lineStart = out.lastIndexOf("\n", idx) + 1; // fillimi i rreshtit, jo pas indentimit
    out = out.slice(0, lineStart) + meta + out.slice(lineStart);
  }
  // orientim portret në aktivitetin kryesor
  out = out.replace(/\s+android:screenOrientation="[^"]*"/g, "");
  out = out.replace(/<activity\b/, '<activity\n            android:screenOrientation="portrait"');
  return out;
}

function patchStrings(xml, { appId, ads }) {
  if (!ads) return xml.replace(/[ \t]*<string name="admob_app_id">[^<]*<\/string>[ \t]*\n?/g, "");
  const line = `    <string name="admob_app_id">${appId}</string>`;
  if (/name="admob_app_id"/.test(xml)) {
    return xml.replace(/[ \t]*<string name="admob_app_id">[^<]*<\/string>/, line);
  }
  const idx = xml.lastIndexOf("</resources>");
  if (idx === -1) throw new Error("strings.xml pa </resources>");
  return xml.slice(0, idx) + line + "\n" + xml.slice(idx);
}

/* ---------- kontrolle konsistence ---------- */
function checkConsistency() {
  const cap = JSON.parse(fs.readFileSync(path.join(ROOT, "capacitor.config.json"), "utf8"));
  if (cap.appId !== APP_CONFIG.bundleId) {
    throw new Error(
      `capacitor.config.json appId (${cap.appId}) ≠ config.js bundleId (${APP_CONFIG.bundleId}).`
    );
  }
}

function patchFile(file, fn, label) {
  if (!fs.existsSync(file)) return false;
  const before = fs.readFileSync(file, "utf8");
  const after = fn(before);
  if (after !== before) fs.writeFileSync(file, after);
  console.log(`  ${after !== before ? "përditësuar" : "pa ndryshim"}  ${label}`);
  return true;
}

function main() {
  checkConsistency();
  const ads = !!APP_CONFIG.features.ads;
  // ID-të e AdMob kërkohen/validohen VETËM kur reklamat janë aktive
  const ids = ads ? resolveAppIds(APP_CONFIG) : {};
  console.log(ads
    ? `configure-native: reklamat ON, testMode=${APP_CONFIG.testMode} (${APP_CONFIG.testMode ? "ID-të emër të Google" : "ID-të reale"})`
    : "configure-native: reklamat OFF (v1) — pa çelësa AdMob/ATT");

  const iosDir = path.join(ROOT, "ios");
  const androidDir = path.join(ROOT, "android");
  let touched = false;

  if (fs.existsSync(iosDir)) {
    touched = patchFile(path.join(iosDir, "App/App/Info.plist"),
      (x) => patchPlist(x, { appId: ids.ios, ads }), "ios/App/App/Info.plist") || touched;
  }
  if (fs.existsSync(androidDir)) {
    touched = patchFile(path.join(androidDir, "app/src/main/AndroidManifest.xml"),
      (x) => patchManifest(x, { ads }), "android/.../AndroidManifest.xml") || touched;
    touched = patchFile(path.join(androidDir, "app/src/main/res/values/strings.xml"),
      (x) => patchStrings(x, { appId: ids.android, ads }), "android/.../strings.xml") || touched;
  }
  if (!touched) console.log("  (s'ka projekt ios/ ose android/ — ekzekuto së pari `npm run ios:add` / `android:add`)");
}

if (require.main === module) {
  try { main(); } catch (e) { console.error("configure-native GABIM: " + e.message); process.exit(1); }
}

module.exports = { patchPlist, patchManifest, patchStrings, resolveAppIds, SAMPLE_APP_IDS };
