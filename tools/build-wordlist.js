#!/usr/bin/env node
/* =========================================================================
 * build-wordlist.js — ndërton www/js/wordlist-sq.js (lista e madhe e fjalëve
 * të pranuara) nga një skedar BURIM që ti e jep.
 *
 *   npm run wordlist -- --input fjalet.txt --source "Wiktionary sq (titujt)" \
 *        --license "CC BY-SA 4.0" [--review "..."] [--sample 300]
 *
 * ⚠ KY SKRIPT NUK SJELL FJALË. Filtron një listë që e ke marrë nga një burim i
 * vërtetë (fjalor, Wiktionary, folës shqip). Kërkon --source dhe --license që
 * të mbetet gjurmë se nga vjen çdo fjalë. Pa to ndalet.
 *
 * Filtrat: vetëm alfabeti shqip (pa W), pa shifra/vija/hapësira/pika, jo fjalë
 * që nisin me shkronjë të madhe në burim (emra të përveçëm; --keep-capitalized
 * i lë), jo 3+ shkronja të njëjta radhazi, gjatësi MIN–MAX (default 2–9: rrota
 * ka më së shumti 7 shkronja), jo në bllokim (tools/wordlist-blocklist.txt).
 * Shkruan edhe një MOSTËR të rastësishme (tools/wordlist-review-sample.md) që
 * një folës shqip ta kontrollojë PARA se lista të dërgohet.
 * ========================================================================= */

const fs = require("fs");
const path = require("path");

const ALPHABET = /^[ABCÇDEËFGHIJKLMNOPQRSTUVXYZ]+$/;

function parseArgs(argv) {
  const a = { min: 2, max: 9, sample: 300, review: "unreviewed — mos e dërgo pa rishikim nga një folës shqip" };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--keep-capitalized") a.keepCapitalized = true;
    else if (k.startsWith("--")) a[k.slice(2)] = argv[++i];
  }
  a.min = parseInt(a.min, 10); a.max = parseInt(a.max, 10); a.sample = parseInt(a.sample, 10);
  return a;
}

/** Kthen {words, stats}. Funksion i pastër — i testuar. */
function filterWords(lines, opts, blocklist = new Set()) {
  const stats = { input: 0, kept: 0, comment: 0, capitalized: 0, chars: 0, length: 0, repeated: 0, blocked: 0, duplicate: 0 };
  const seen = new Set();
  for (const raw of lines) {
    const line = String(raw).split("\t")[0].trim();
    if (!line) continue;
    if (line.startsWith("#")) { stats.comment++; continue; }
    stats.input++;
    // emër i përveçëm = Title-case ("Tirana"); një listë me gjithë shkronja të mëdha ("MAL") është normale
    const titleCase = line.length > 1 && line[0] !== line[0].toLowerCase() && line.slice(1) === line.slice(1).toLowerCase();
    if (!opts.keepCapitalized && titleCase) { stats.capitalized++; continue; }
    const w = line.toUpperCase();
    if (!ALPHABET.test(w)) { stats.chars++; continue; }
    if (w.length < opts.min || w.length > opts.max) { stats.length++; continue; }
    if (/(.)\1\1/.test(w)) { stats.repeated++; continue; }
    if (blocklist.has(w)) { stats.blocked++; continue; }
    if (seen.has(w)) { stats.duplicate++; continue; }
    seen.add(w);
  }
  const words = [...seen].sort((a, b) => a.length - b.length || a.localeCompare(b, "sq"));
  stats.kept = words.length;
  return { words, stats };
}

/** Zgjedh k fjalë me RNG me farë (rezultat i përsëritshëm). */
function sampleWords(words, k, seed = 20260101) {
  let a = seed >>> 0;
  const rng = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pool = words.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, Math.min(k, pool.length)).sort((x, y) => x.localeCompare(y, "sq"));
}

function render(words, meta) {
  return [
    "/* =========================================================================",
    " * Lista e madhe e fjalëve të pranuara (fjalë bonus). E gjeneruar nga",
    " * tools/build-wordlist.js — MOS e edito me dorë.",
    " *",
    ` * source: ${meta.source}`,
    ` * license: ${meta.license}`,
    ` * review: ${meta.review}`,
    ` * count: ${words.length}`,
    ` * generated: ${meta.date}`,
    " * ========================================================================= */",
    `const WORDLIST_SQ = ${JSON.stringify(words.join("\n"))};`,
    "",
  ].join("\n");
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  const fail = (m) => { console.error("build-wordlist GABIM: " + m); process.exit(1); };
  if (!a.input) fail("duhet --input <skedar me një fjalë për rresht>");
  if (!a.source) fail("duhet --source \"<emri/URL i burimit>\" — pa burim nuk ka listë");
  if (!a.license) fail("duhet --license \"<licenca>\" — pa licencë s'mund ta përdorim");
  if (!fs.existsSync(a.input)) fail("skedari s'ekziston: " + a.input);

  const blPath = a.blocklist || path.join(__dirname, "wordlist-blocklist.txt");
  const blocklist = new Set(fs.existsSync(blPath) ? fs.readFileSync(blPath, "utf8").split("\n").map((s) => s.trim().toUpperCase()).filter((s) => s && !s.startsWith("#")) : []);
  const { words, stats } = filterWords(fs.readFileSync(a.input, "utf8").split("\n"), a, blocklist);
  if (!words.length) fail("asnjë fjalë nuk kaloi filtrat: " + JSON.stringify(stats));

  const out = a.out || path.join(__dirname, "..", "www", "js", "wordlist-sq.js");
  const date = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(out, render(words, { source: a.source, license: a.license, review: a.review, date }));

  const samplePath = a.samplefile || path.join(__dirname, "wordlist-review-sample.md");
  const sample = sampleWords(words, a.sample);
  fs.writeFileSync(samplePath, [
    "# Mostër për rishikim nga një folës shqip",
    "",
    `Burimi: ${a.source} · Licenca: ${a.license} · Gjithsej ${words.length} fjalë · mostra ${sample.length}`,
    "",
    "Për çdo fjalë shëno: ✓ fjalë e vlefshme shqipe · ✗ jo fjalë / emër i përveçëm / e shkruar gabim · ? s'jam i sigurt.",
    "**Rregulli:** nëse më shumë se 2% janë ✗, lista NUK dërgohet — rregullo filtrat/burimin dhe rigjenero.",
    "Pas rishikimit, ndrysho `--review` te komanda (p.sh. `\"mostër 300, 3 gabime (1.0%), rishikuar nga <emri>\"`) dhe rigjenero.",
    "",
    "| Fjala | Rishikimi |", "|---|---|", ...sample.map((w) => `| ${w} |  |`), "",
  ].join("\n"));

  const hist = {}; words.forEach((w) => (hist[w.length] = (hist[w.length] || 0) + 1));
  console.log(`U shkruan ${path.relative(process.cwd(), out)}: ${words.length} fjalë (${JSON.stringify(hist)})`);
  console.log("Filtrat:", JSON.stringify(stats));
  console.log(`Mostra për rishikim: ${path.relative(process.cwd(), samplePath)} (${sample.length} fjalë) — KY HAP ËSHTË I DETYRUESHËM para publikimit.`);
}

if (require.main === module) main();
module.exports = { filterWords, sampleWords, render, ALPHABET };
