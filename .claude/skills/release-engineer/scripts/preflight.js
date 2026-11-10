#!/usr/bin/env node
/* preflight.js — ekzekuton TË GJITHA portat automatike para një publikimi
 * dhe printon një tabelë + listën e asaj që duhet bërë dorazi.
 *
 *   node .claude/skills/release-engineer/scripts/preflight.js            # plotë
 *   node .../preflight.js --quick      # pa testet e shfletuesit (~6 min më pak)
 *   node .../preflight.js --release    # audit me --release: vendmbajtëset BLLOKOJNË
 *   node .../preflight.js --sync       # edhe npm run ios:sync/android:sync (përditëson ios/ dhe android/)
 *
 * Kodi i daljes 1 nëse dështon ndonjë portë e detyrueshme.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const ROOT = path.join(__dirname, "..", "..", "..", "..");
const flag = (f) => process.argv.includes(f);
const SKILLS = path.join(ROOT, ".claude/skills");

const steps = [
  { name: "validate (të gjitha nivelet)", cmd: ["npm", "run", "-s", "validate"], required: true },
  { name: "teste: të dhëna, vegla, konfigurim", cmd: ["npm", "test", "--silent"], required: true },
  { name: "teste shfletuesi (lojë, native-mock)", cmd: ["npm", "run", "-s", "test:browser"], required: true, skip: flag("--quick") },
  { name: flag("--release") ? "audit --release" : "audit", cmd: ["npm", "run", "-s", flag("--release") ? "audit:release" : "audit"], required: true },
  { name: "capacitor-mobile-qa/native-qa", cmd: ["node", path.join(SKILLS, "capacitor-mobile-qa/scripts/native-qa.js")], required: true },
  { name: "albanian-language-reviewer/lang-check", cmd: ["node", path.join(SKILLS, "albanian-language-reviewer/scripts/lang-check.js")], required: true },
  { name: "ios:sync + android:sync", cmd: ["sh", "-c", "npm run -s ios:sync && npm run -s android:sync"], required: true, skip: !flag("--sync") },
];

const rows = [];
for (const s of steps) {
  if (s.skip) { rows.push({ name: s.name, status: "SKIP", sec: 0 }); continue; }
  const t0 = Date.now();
  process.stdout.write(`▶ ${s.name} … `);
  const r = spawnSync(s.cmd[0], s.cmd.slice(1), { cwd: ROOT, encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0" } });
  const ok = r.status === 0;
  const sec = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(ok ? `ok (${sec}s)` : `DËSHTOI (${sec}s)`);
  if (!ok) console.log((r.stdout + r.stderr).split("\n").filter((l) => /not ok|✗|DËSHTIME|BLLOKUES|Error|gabim|fail/i.test(l)).slice(0, 12).map((l) => "    " + l).join("\n"));
  rows.push({ name: s.name, status: ok ? "PASS" : "FAIL", sec });
}

console.log("\n┌─ PREFLIGHT ───────────────────────────────────────────");
for (const r of rows) console.log(`│ ${r.status.padEnd(4)}  ${r.name}${r.sec ? `  (${r.sec}s)` : ""}`);
console.log("└───────────────────────────────────────────────────────");

const cfg = require(path.join(ROOT, "www/js/config.js")).APP_CONFIG;
const plat = [fs.existsSync(path.join(ROOT, "ios")) ? "ios/ ✓" : "ios/ ✗ (kërkon macOS)", fs.existsSync(path.join(ROOT, "android")) ? "android/ ✓" : "android/ ✗"].join(", ");
console.log(`\nVersioni ${cfg.version} · reklama ${cfg.features.ads ? "ON" : "OFF"} · blerje ${cfg.features.purchases ? "ON" : "OFF"} · projekte: ${plat}`);

console.log(`
ÇFARË MBETET DORAZI (asnjë portë automatike s'e mbulon):
  [ ] Ndërtim Android (./gradlew assembleDebug) dhe provë në pajisje reale
  [ ] Ndërtim iOS (Xcode Archive) — vetëm macOS; provë në iPhone real dhe TestFlight
  [ ] Rishikimi i fjalëve nga një folës shqip (tools/lexicon-review.md)
  [ ] Emri i aplikacionit të lirë te App Store Connect/Play Console; bundle ID final
  [ ] GitHub Pages i aktivizuar dhe privacyUrl i hapshëm publikisht
  [ ] Pamjet e ekranit (6.7", 6.5", 5.5" iPhone; 12.9" iPad; telefon Android), përshkrimi, fjalët kyçe
  [ ] Pyetësori i moshës, "App Privacy" (v1: Data Not Collected) dhe Data Safety (Play)
  [ ] Llogaritë: Apple Developer ($99/vit), Google Play ($25 një herë)
`);
process.exit(rows.some((r) => r.status === "FAIL") ? 1 : 0);
