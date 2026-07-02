/* =========================================================================
 * Gjeneratori i niveleve — prodhon mijëra nivele nga leksiku shqip.
 *
 * Si punon:
 * 1. Merr çdo fjalë bazë 4–7 shkronjash nga leksiku si "rrotë".
 * 2. Për rrotat 5–7 shkronjash krijon edhe rrota të zgjeruara me një
 *    shkronjë shtesë të zakonshme (A, E, I, R, T, N, U) — si lojërat e
 *    mëdha, ku rrota s'është gjithmonë vetë një fjalë.
 * 3. Gjen të gjitha fjalët e leksikut që formohen nga shkronjat e rrotës.
 * 4. Zgjedh nën-bashkësi fjalësh objektiv (disa variante për rrotë),
 *    duke VERIFIKUAR me gjeneratorin real të rrjetës (crossword.js) se
 *    fjalët vendosen në një fjalëkryq të lidhur; ruan farën (seed) që
 *    funksionon, të cilën e përdor edhe loja në ekzekutim.
 * 5. Rendit gjithçka nga më e lehta te më e vështira dhe i ndan në
 *    paketa me nga 12 nivele me emra vendesh shqiptare.
 *
 * Përdorimi:  node tools/generate-levels.js
 * Prodhon:    www/js/levels-gen.js
 * ========================================================================= */

const fs = require("fs");
const path = require("path");
const { LEXICON } = require("./lexicon.js");
const { generateGrid } = require("../www/js/crossword.js");
const { PACKS } = require("../www/js/levels.js");

/* ---------- RNG determinist ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- ndihmës për shumësi shkronjash ---------- */
function counts(str) {
  const c = {};
  for (const ch of str) c[ch] = (c[ch] || 0) + 1;
  return c;
}
function fitsIn(word, pool) {
  const need = counts(word);
  for (const ch in need) if ((pool[ch] || 0) < need[ch]) return false;
  return true;
}

/* ---------- fjalët që formohen nga një rrotë ---------- */
const byLen = LEXICON.slice().sort((a, b) => a.length - b.length);
function formable(wheel) {
  const pool = counts(wheel);
  return byLen.filter((w) => w.length >= 2 && w.length <= wheel.length && fitsIn(w, pool));
}

/* ---------- nënshkrimet e niveleve ekzistuese (pa dublime) ---------- */
const usedSignatures = new Set();
for (const pack of PACKS) {
  for (const lv of pack.levels) {
    usedSignatures.add(lv.words.slice().sort().join("|"));
  }
}

/* ---------- provo të ndërtosh një nivel të vlefshëm ---------- */
function tryBuildLevel(wheel, targets) {
  // gjej një farë me të cilën rrjeta gjenerohet — e njëjta farë
  // përdoret pastaj nga loja në ekzekutim
  for (let seed = 1; seed <= 40; seed++) {
    try {
      const grid = generateGrid(targets, seed * 104729);
      if (grid.cols <= 11 && grid.rows <= 11) return seed * 104729;
    } catch (e) { /* provo farën tjetër */ }
  }
  return null;
}

/* ---------- zgjedhja e fjalëve objektiv për një variant ---------- */
function pickTargets(base, pool, count, rng) {
  // gjithmonë përfshihet fjala më e gjatë (baza); pastaj përzierje
  // fjalësh të tjera, me shumicë 3+ shkronja dhe më së shumti dy
  // fjalë 2-shkronjëshe — si nivelet e punuara me dorë
  const rest = pool.filter((w) => w !== base);
  const long = rest.filter((w) => w.length >= 3);
  const short = rest.filter((w) => w.length === 2);
  const chosen = [base];
  const shuffledLong = long.slice();
  for (let i = shuffledLong.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledLong[i], shuffledLong[j]] = [shuffledLong[j], shuffledLong[i]];
  }
  for (const w of shuffledLong) {
    if (chosen.length >= count) break;
    chosen.push(w);
  }
  let shortUsed = 0;
  for (let i = short.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [short[i], short[j]] = [short[j], short[i]];
  }
  for (const w of short) {
    if (chosen.length >= count || shortUsed >= 2) break;
    chosen.push(w);
    shortUsed++;
  }
  return chosen;
}

/* ---------- gjenerimi kryesor ---------- */
const EXTRAS = ["A", "E", "I", "R", "T", "N", "U", "L", "S", "H", "K", "M", "O"];
const levels = [];
const bases = LEXICON.filter((w) => w.length >= 4 && w.length <= 7);
const seenWheels = new Set(); // shmang rrota me të njëjtën shumësi shkronjash

function wheelSig(w) { return w.split("").sort().join(""); }

let wheelId = 0;
for (const base of bases) {
  // rrotat: vetë fjala + zgjerime me një (dhe për bazat e shkurtra, dy)
  // shkronja shtesë — rrota s'duhet të jetë medoemos vetë një fjalë
  const wheels = [base];
  const basePool = formable(base);
  if (base.length >= 4 && base.length <= 6) {
    let extrasAdded = 0;
    for (const ex of EXTRAS) {
      if (extrasAdded >= 5) break;
      const wheel = base + ex;
      const pool = formable(wheel);
      if (pool.length >= basePool.length + 2) { // shkronja shtesë duhet të sjellë fjalë të reja
        wheels.push(wheel);
        extrasAdded++;
      }
    }
  }
  if (base.length >= 4 && base.length <= 5) {
    let pairsAdded = 0;
    for (const ex1 of EXTRAS.slice(0, 7)) {
      if (pairsAdded >= 4) break;
      for (const ex2 of EXTRAS.slice(0, 7)) {
        if (pairsAdded >= 4) break;
        const wheel = base + ex1 + ex2;
        const pool = formable(wheel);
        if (pool.length >= basePool.length + 5) {
          wheels.push(wheel);
          pairsAdded++;
        }
      }
    }
  }

  for (const wheel of wheels) {
    const sig = wheelSig(wheel);
    if (seenWheels.has(sig)) continue;
    seenWheels.add(sig);

    wheelId++;
    const rng = mulberry32(wheelId * 7919 + wheel.length);
    const pool = formable(wheel);
    // fjala më e gjatë e formueshme është "kreu" i nivelit
    const longest = pool.reduce((a, b) => (b.length > a.length ? b : a), pool[0] || "");
    if (!longest || longest.length < 4) continue;

    const minTargets = wheel.length <= 4 ? 3 : wheel.length === 5 ? 4 : 5;
    const maxTargets = wheel.length <= 4 ? 4 : wheel.length === 5 ? 6 : 8;
    if (pool.length < minTargets) continue;

    const maxVariants = wheel.length <= 4 ? 3 : wheel.length === 5 ? 4 : 6;
    const variants = Math.min(maxVariants, Math.floor(pool.length / minTargets));
    const seenHere = [];

    for (let v = 0; v < variants * 6 && seenHere.length < variants; v++) {
      const count = minTargets + Math.floor(rng() * (maxTargets - minTargets + 1));
      const targets = pickTargets(longest, pool, Math.min(count, pool.length), rng);
      if (targets.length < minTargets) continue;

      const sig = targets.slice().sort().join("|");
      if (usedSignatures.has(sig)) continue;
      // variantet e së njëjtës rrotë duhet të ndryshojnë ndjeshëm
      const tooSimilar = seenHere.some((prev) => {
        const overlap = targets.filter((w) => prev.includes(w)).length;
        return overlap / Math.max(targets.length, prev.length) > 0.65;
      });
      if (tooSimilar) continue;

      const seed = tryBuildLevel(wheel, targets);
      if (seed === null) continue;

      usedSignatures.add(sig);
      seenHere.push(targets);
      const avgLen = targets.reduce((s, w) => s + w.length, 0) / targets.length;
      levels.push({
        letters: wheel,
        words: targets,
        seed,
        difficulty: wheel.length * 3 + targets.length * 1.4 + avgLen,
      });
    }
  }
}

/* ---------- renditja nga më i lehti te më i vështiri ---------- */
levels.sort((a, b) => a.difficulty - b.difficulty);

/* ---------- ndarja në paketa me emra vendesh shqiptare ---------- */
const PLACES = [
  ["Valbona", "🏞️"], ["Thethi", "🗻"], ["Dajti", "⛰️"], ["Tomorri", "🌄"],
  ["Llogaraja", "🌲"], ["Prespa", "🌊"], ["Karavastaja", "🦩"], ["Divjaka", "🌳"],
  ["Ksamili", "🏝️"], ["Dhërmiu", "🏖️"], ["Himara", "⛵"], ["Borshi", "🌴"],
  ["Përmeti", "🌸"], ["Tepelena", "🏯"], ["Këlcyra", "🏞️"], ["Erseka", "🌿"],
  ["Pogradeci", "🚣"], ["Peshkopia", "♨️"], ["Kukësi", "🏔️"], ["Puka", "🌲"],
  ["Mirdita", "⛏️"], ["Lezha", "🦅"], ["Kurbini", "🌾"], ["Kavaja", "🏛️"],
  ["Lushnja", "🌻"], ["Fieri", "🏺"], ["Apolonia", "🏛️"], ["Bylisi", "🏺"],
  ["Amantia", "🏟️"], ["Antigonea", "🏛️"], ["Zvërneci", "🕊️"], ["Narta", "🦢"],
  ["Voskopoja", "⛪"], ["Dardha", "🎿"], ["Lin", "🐟"], ["Shirgji", "🌅"],
  ["Rrësheni", "🍇"], ["Ulza", "💧"], ["Bovilla", "🚵"], ["Pëllumbasi", "🕳️"],
  ["Gjipeja", "🏞️"], ["Osumi", "🛶"], ["Langarica", "♨️"], ["Vjosa", "🌊"],
  ["Shala", "🛶"], ["Komani", "⛴️"], ["Fierza", "🌉"], ["Vermoshi", "🏔️"],
  ["Lëpusha", "🌼"], ["Razma", "🌲"], ["Bogë", "❄️"], ["Jezerca", "🗻"],
];
const COLORS = ["#2e9e5b", "#2f7fd1", "#3aa6a0", "#b0771f", "#5b7fd4",
  "#a3403c", "#7a4fa3", "#28a08c", "#5e8d4e", "#d4a017", "#c26a4a", "#4f7ea3"];

const PACK_SIZE = 12;
const packs = [];
for (let i = 0; i < levels.length; i += PACK_SIZE) {
  const chunk = levels.slice(i, i + PACK_SIZE).map((l) => ({
    letters: l.letters, words: l.words, seed: l.seed,
  }));
  if (chunk.length < 4) break; // paketa e fundit shumë e vogël — lëre
  const pi = packs.length;
  const [place, emoji] = PLACES[pi % PLACES.length];
  const round = Math.floor(pi / PLACES.length);
  packs.push({
    name: round === 0 ? place : `${place} ${["II", "III", "IV", "V"][round - 1] || round + 1}`,
    subtitle: `Kapitulli ${pi + 1}`,
    emoji,
    color: COLORS[pi % COLORS.length],
    levels: chunk,
  });
}

/* ---------- shkrimi i skedarit ---------- */
const out =
  "/* =========================================================================\n" +
  " * NIVELE TË GJENERUARA — prodhuar nga tools/generate-levels.js\n" +
  " * MOS e edito me dorë; ndrysho leksikun a gjeneratorin dhe rigjenero:\n" +
  " *   node tools/generate-levels.js\n" +
  " * Fjalët burojnë nga tools/lexicon.js (verifikuar sipas FGJSSH).\n" +
  " * ========================================================================= */\n\n" +
  "const GENERATED_PACKS = " + JSON.stringify(packs) + ";\n\n" +
  "/* Leksiku i plotë — çdo fjalë e vlefshme shqipe jep monedha bonus. */\n" +
  "const LEXICON_WORDS = " + JSON.stringify(LEXICON) + ";\n\n" +
  "if (typeof module !== \"undefined\") {\n" +
  "  module.exports = { GENERATED_PACKS, LEXICON_WORDS };\n" +
  "}\n";

const outPath = path.join(__dirname, "..", "www", "js", "levels-gen.js");
fs.writeFileSync(outPath, out);

const totalLevels = packs.reduce((s, p) => s + p.levels.length, 0);
console.log(`U gjeneruan ${totalLevels} nivele në ${packs.length} paketa (${Math.round(out.length / 1024)} KB).`);
console.log(`Bashkë me 66 nivelet e punuara me dorë: ${66 + totalLevels} nivele gjithsej.`);
