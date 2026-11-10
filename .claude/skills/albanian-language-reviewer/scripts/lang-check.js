#!/usr/bin/env node
/* lang-check.js — kontrolle AUTOMATIKE të cilësisë gjuhësore të të dhënave.
 *
 * ⚠ Ky skript NUK verifikon fjalë dhe NUK gjykon kuptime. Gjen vetëm çfarë
 * mund të gjendet me kod: shkronja jashtë alfabetit, çifte Ë/E që duhen parë
 * nga njeriu, shpjegime të pambaruara a rrethore, mbulim, digrafë. Verifikimi
 * i vërtetë = folës shqip ose fjalor i besueshëm.
 *
 *   node .claude/skills/albanian-language-reviewer/scripts/lang-check.js
 * Kodi i daljes 1 vetëm për gabime të vështira (shkronja të pavlefshme).
 */
const path = require("path");
const ROOT = path.join(__dirname, "..", "..", "..", "..");
const { PACKS, GLOSSES, BONUS_WORDS } = require(path.join(ROOT, "www/js/levels.js"));
const { GENERATED_PACKS } = require(path.join(ROOT, "www/js/levels-gen.js"));
const { LEXICON } = require(path.join(ROOT, "tools/lexicon.js"));

const levels = PACKS.concat(GENERATED_PACKS).flatMap((p) => p.levels);
const targets = new Set(levels.flatMap((l) => l.words));
const usage = {};
levels.forEach((l) => l.words.forEach((w) => (usage[w] = (usage[w] || 0) + 1)));
const hard = [], soft = [], info = [];

// alfabeti shqip: 36 shkronja (A B C Ç D DH E Ë F G GJ H I J K L LL M N NJ O P Q R RR S SH T TH U V X XH Y Z ZH).
// Shkronja të vetme të lejuara këtu: ato pa W; digrafët përbëhen nga shkronja të lejuara.
const ALPHABET = /^[ABCÇDEËFGHIJKLMNOPQRSTUVXYZ]+$/;
for (const w of new Set([...LEXICON, ...BONUS_WORDS, ...targets])) {
  if (!ALPHABET.test(w)) hard.push(`shkronjë jashtë alfabetit: "${w}"`);
}

// Ë ↔ E: harresa e Ë-së është gabimi më i zakonshëm; lista është për sy njeriu
const lexSet = new Set(LEXICON);
const pairs = LEXICON.filter((w) => w.includes("Ë")).map((w) => [w, w.replace(/Ë/g, "E")]).filter(([, b]) => lexSet.has(b));
if (pairs.length) soft.push(`çifte që ndryshojnë vetëm te Ë/E — të dyja duhet të jenë fjalë të ndryshme të vërteta: ${pairs.map(([a, b]) => `${a}/${b}`).join(", ")}`);
// fjalë të pakta pa asnjë Ë që shpesh kërkojnë Ë (vetëm sinjalizim për rishikim)
const maybeMissingE = LEXICON.filter((w) => !w.includes("Ë") && /(?:^|[^A-Z])(?:KENG|ZEMER|NENA|NJERI|MESI|DERI|VERE)/.test(w));
if (maybeMissingE.length) soft.push(`mund t'u mungojë Ë: ${maybeMissingE.join(", ")}`);

// digrafët: në shqip DH GJ LL NJ RR SH TH XH ZH janë SHKRONJA TË VETME; loja i ndan në dy pllaka
const DIGRAPHS = ["DH", "GJ", "LL", "NJ", "RR", "SH", "TH", "XH", "ZH"];
const withDi = [...targets].filter((w) => DIGRAPHS.some((d) => w.includes(d)));
info.push(`digrafët: ${withDi.length}/${targets.size} fjalë të niveleve përmbajnë një digraf (SH, GJ, LL, DH…). Loja i trajton si 2 pllaka të veçanta (S+H), por alfabeti shqip i ka shkronja të vetme — vendim dizajni për të marrë (shih skill).`);

// shpjegimet
for (const [w, g] of Object.entries(GLOSSES)) {
  const bad = [];
  if (!/[.!?»]$/.test(g)) bad.push("pa pikë në fund");
  if (/\s{2,}/.test(g)) bad.push("hapësira të dyfishta");
  if (/^[a-zë]/.test(g)) bad.push("fillon me shkronjë të vogël");
  if (g.length > 90) bad.push(`e gjatë (${g.length})`);
  if (new RegExp(`\\b${w}\\b`, "i").test(g.replace(/«[^»]*»/g, ""))) bad.push("rrethore (përmban vetë fjalën)");
  if (/"/.test(g)) bad.push('thonjëza të drejta " (përdor «»)');
  if (bad.length) soft.push(`shpjegimi i ${w}: ${bad.join(", ")} → "${g}"`);
}

// mbulimi
const noGloss = [...targets].filter((w) => !GLOSSES[w]);
const slots = levels.reduce((s, l) => s + l.words.length, 0), slotsNo = levels.reduce((s, l) => s + l.words.filter((w) => !GLOSSES[w]).length, 0);
const allNo = levels.filter((l) => l.words.every((w) => !GLOSSES[w])).length;
info.push(`shpjegime: ${targets.size - noGloss.length}/${targets.size} fjalë unike kanë shpjegim; ${slotsNo}/${slots} vende fjalësh (${Math.round((100 * slotsNo) / slots)}%) s'kanë; ${allNo} nivele s'kanë asnjë shpjegim`);
const top = noGloss.sort((a, b) => (usage[b] || 0) - (usage[a] || 0)).slice(0, 15).map((w) => `${w}(${usage[w]})`).join(" ");
info.push(`fjalët më të përdorura pa shpjegim (shtoji të parat, nga fjalori): ${top}`);

// pranimi i fjalëve
const accepted = new Set([...LEXICON, ...BONUS_WORDS]);
info.push(`fjalë të pranuara gjithsej: ${accepted.size}. Fjalorët e vërtetë kanë dhjetëra mijëra — lojtarët do të provojnë fjalë të vlefshme që loja s'i njeh; kjo është kufizimi më i madh i cilësisë gjuhësore.`);
const bonusOutside = [...BONUS_WORDS].filter((w) => !lexSet.has(w));
info.push(`fjalë bonus jashtë leksikut (nga lista e dorës, të paverifikuara): ${bonusOutside.length}`);
// përdorim: fjalët që shfaqen në shumë nivele peshojnë më shumë te cilësia
const heavy = Object.entries(usage).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w, n]) => `${w}:${n}`).join(" ");
info.push(`fjalët më të përdorura në nivele (gabimi këtu dëmton më shumë nivele): ${heavy}`);

const sec = (t, a) => { if (a.length) { console.log(`\n${t} (${a.length})`); a.forEach((x) => console.log("  - " + x)); } };
console.log("LANG-CHECK — kontrolle automatike. ⚠ NUK verifikon fjalë/kuptime me fjalor.");
sec("GABIME TË VËSHTIRA", hard); sec("PËR SY NJERIU", soft); sec("INFORMACION", info);
console.log("\nStatusi i leksikut: i PAVERIFIKUAR. Vazhdo me tools/lexicon-review.md.");
process.exit(hard.length ? 1 : 0);
