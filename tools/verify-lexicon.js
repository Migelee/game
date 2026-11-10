#!/usr/bin/env node
/* =========================================================================
 * verify-lexicon.js — ndihmon të kontrollohet leksiku kundrejt një
 * fjalori në internet dhe shkruan tools/lexicon-review.md.
 *
 *   node tools/verify-lexicon.js            # kontrollon online (nëse ka qasje)
 *   node tools/verify-lexicon.js --offline  # vetëm raporti, pa internet
 *
 * RËNDËSISHME: ky kontroll NUK është verifikim. "U gjet në Wiktionary"
 * është shenjë e mirë; "nuk u gjet" do të thotë vetëm "kërkon sy njeriu"
 * (trajtat e shquara, format foljore e fjalët e rralla shpesh s'kanë faqe).
 * Verifikimi i vërtetë = një folës shqip ose fjalori i besueshëm.
 *
 * Nga mjedisi me proxy: NODE_USE_ENV_PROXY=1 node tools/verify-lexicon.js
 * BASE mund të ndryshohet (për teste): BASE_URL=http://localhost:PORT
 * ========================================================================= */

const fs = require("fs");
const path = require("path");
const { LEXICON } = require("./lexicon.js");
const { GENERATED_PACKS } = require("../www/js/levels-gen.js");
const { PACKS, GLOSSES } = require("../www/js/levels.js");

// Fjalët për të cilat nuk jam i sigurt — të kontrollohen të parat.
const CHECK_FIRST = [
  "LYP", "NAM", "TRU", "UJËRA", "LAG", "NIP", "FIK", "FLE", "VEL", "LEH",
  "LUG", "POL", "QAJ", "VAJ", "PUS", "MUZG", "VAPA", "THEM", "PULLA",
  "BALTA", "BARKU", "BUJKU", "PRAGU", "FTUA", "ZANA", "HOV", "KEQ",
];

const BASE = process.env.BASE_URL || "https://sq.wiktionary.org";

function usage() {
  const use = {};
  for (const pk of PACKS.concat(GENERATED_PACKS)) {
    for (const lv of pk.levels) for (const w of lv.words) use[w] = (use[w] || 0) + 1;
  }
  return use;
}

/** Kthen Map(fjala -> true/false/null): u gjet / nuk u gjet / s'u kontrollua. */
async function checkOnline(words, base = BASE) {
  const result = new Map(words.map((w) => [w, null]));
  for (let i = 0; i < words.length; i += 40) {
    const chunk = words.slice(i, i + 40);
    const titles = chunk.map((w) => w.toLowerCase());
    const url = `${base}/w/api.php?action=query&format=json&redirects=1&titles=${encodeURIComponent(titles.join("|"))}`;
    const res = await fetch(url, { headers: { "User-Agent": "fjale-shqip-lexicon-check/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} nga ${base}`);
    const data = await res.json();
    const missing = new Set();
    for (const p of Object.values((data.query && data.query.pages) || {})) {
      if ("missing" in p) missing.add(p.title.toLowerCase());
    }
    for (const w of chunk) result.set(w, !missing.has(w.toLowerCase()));
  }
  return result;
}

function buildReport(online, onlineNote) {
  const use = usage();
  const mark = (w) => (online ? (online.get(w) === true ? "gjetur" : online.get(w) === false ? "NUK u gjet" : "—") : "—");
  const lines = [];
  lines.push("# Rishikimi i leksikut shqip");
  lines.push("");
  lines.push("**Statusi: NUK është verifikuar me fjalor.** Fjalët dhe shpjegimet u përpiluan nga një asistent AI.");
  lines.push(`Kontrolli online: ${onlineNote}`);
  lines.push("");
  lines.push("## 0. Ndikimi më i madh: fjalët e përdorura në më shumë nivele");
  lines.push("");
  lines.push("Një gabim këtu dëmton qindra nivele. Rishikoji të parat.");
  lines.push("");
  lines.push("| Fjala | Nivele | Ka shpjegim | Wiktionary | Rishikimi |");
  lines.push("|---|---:|---|---|---|");
  for (const [w, n] of Object.entries(use).sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    lines.push(`| ${w} | ${n} | ${GLOSSES[w] ? "po" : "jo"} | ${mark(w)} |  |`);
  }
  lines.push("");
  lines.push("## 1. Kontrollo të parat (jam më pak i sigurt)");
  lines.push("");
  lines.push("| Fjala | Përdorur në nivele | Ka shpjegim | Wiktionary |");
  lines.push("|---|---:|---|---|");
  for (const w of CHECK_FIRST.filter((x) => LEXICON.includes(x))) {
    lines.push(`| ${w} | ${use[w] || 0} | ${GLOSSES[w] ? "po" : "jo"} | ${mark(w)} |`);
  }
  lines.push("");
  lines.push(`## 2. Të gjitha fjalët e leksikut (${LEXICON.length})`);
  lines.push("");
  lines.push("Shëno për çdo fjalë: ✓ e saktë · ✗ hiqe · ? pa kuptim/trajtë e gabuar. Pasi të rishikohet, hiq fjalët ✗ nga `tools/lexicon.js` dhe rigjenero me `npm run generate`.");
  lines.push("");
  lines.push("| Fjala | Nivele | Shpjegim | Wiktionary | Rishikimi |");
  lines.push("|---|---:|---|---|---|");
  for (const w of LEXICON.slice().sort((a, b) => a.length - b.length || a.localeCompare(b, "sq"))) {
    lines.push(`| ${w} | ${use[w] || 0} | ${GLOSSES[w] ? "po" : "jo"} | ${mark(w)} |  |`);
  }
  lines.push("");
  lines.push("## 3. Shpjegimet (GLOSSES) — të gjitha të paverifikuara");
  lines.push("");
  lines.push(`${Object.keys(GLOSSES).length} shpjegime në \`www/js/levels.js\`. Fjalët pa shpjegim shfaqin në lojë \"Shpjegimi nuk është shtuar ende\".`);
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const offline = process.argv.includes("--offline");
  let online = null;
  let note = "nuk u ekzekutua (--offline).";
  if (!offline) {
    try {
      online = await checkOnline(LEXICON);
      const nf = [...online.values()].filter((v) => v === false).length;
      note = `u krye kundrejt ${BASE} — ${nf} fjalë pa faqe (kjo NUK do të thotë gabim; kërkon sy njeriu).`;
    } catch (e) {
      note = `DËSHTOI (${e.message}). Rezultatet më poshtë janë pa kontroll online.`;
    }
  }
  const out = path.join(__dirname, "lexicon-review.md");
  fs.writeFileSync(out, buildReport(online, note));
  console.log("U shkrua " + path.relative(process.cwd(), out) + " — " + note);
}

if (require.main === module) main();
module.exports = { checkOnline, buildReport, CHECK_FIRST };
