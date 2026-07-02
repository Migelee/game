/* Verifikon të dhënat e niveleve:
 * 1. Çdo fjalë formohet nga shkronjat e rrotës (multiset).
 * 2. Nuk ka fjalë të përsëritura brenda një niveli.
 * 3. Rrjeta gjenerohet me sukses për çdo nivel.
 */
const { PACKS } = require("../www/js/levels.js");
const { generateGrid } = require("../www/js/crossword.js");

function counts(str) {
  const c = {};
  for (const ch of str) c[ch] = (c[ch] || 0) + 1;
  return c;
}

function isSubset(word, letters) {
  const need = counts(word);
  const have = counts(letters);
  return Object.keys(need).every((ch) => (have[ch] || 0) >= need[ch]);
}

let errors = 0;
let levelNo = 0;
for (const pack of PACKS) {
  for (const level of pack.levels) {
    levelNo++;
    const seen = new Set();
    for (const w of level.words) {
      if (!isSubset(w, level.letters)) {
        console.error(`Niveli ${levelNo} (${level.letters}): "${w}" nuk formohet nga shkronjat`);
        errors++;
      }
      if (seen.has(w)) {
        console.error(`Niveli ${levelNo} (${level.letters}): "${w}" e përsëritur`);
        errors++;
      }
      seen.add(w);
    }
    try {
      const grid = generateGrid(level.words, levelNo * 7919);
      console.log(
        `Niveli ${levelNo} (${pack.name} · ${level.letters}): OK — ` +
        `${level.words.length} fjalë, rrjeta ${grid.cols}x${grid.rows}`
      );
    } catch (e) {
      console.error(`Niveli ${levelNo} (${level.letters}): DËSHTOI — ${e.message}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} gabime!`);
  process.exit(1);
}
console.log(`\nTë gjitha ${levelNo} nivelet janë në rregull.`);
