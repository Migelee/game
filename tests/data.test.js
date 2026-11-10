/* Teste për të dhënat: nivelet, leksiku, shpjegimet.
 * Ekzekutimi: npm test */
const test = require("node:test");
const assert = require("node:assert/strict");
const { PACKS, GLOSSES, BONUS_WORDS } = require("../www/js/levels.js");
const { GENERATED_PACKS, LEXICON_WORDS } = require("../www/js/levels-gen.js");
const { generateGrid } = require("../www/js/crossword.js");
const { LEXICON } = require("../tools/lexicon.js");

const counts = (s) => [...s].reduce((c, ch) => ((c[ch] = (c[ch] || 0) + 1), c), {});
const fits = (w, wheel) => {
  const have = counts(wheel), need = counts(w);
  return Object.keys(need).every((ch) => (have[ch] || 0) >= need[ch]);
};

const story = PACKS.flatMap((p) => p.levels);
const gen = GENERATED_PACKS.flatMap((p) => p.levels);

test("të gjitha 2,389 nivelet ekzistojnë (66 story + 2,323 të gjeneruara, 205 paketa)", () => {
  assert.equal(story.length, 66);
  assert.equal(gen.length, 2323);
  assert.equal(PACKS.length + GENERATED_PACKS.length, 205);
});

test("çdo fjalë formohet nga shkronjat e rrotës dhe s'ka dublime në nivel", () => {
  [...story, ...gen].forEach((l, i) => {
    assert.equal(new Set(l.words).size, l.words.length, `dublim në nivelin ${i + 1}`);
    for (const w of l.words) assert.ok(fits(w, l.letters), `"${w}" s'formohet nga ${l.letters} (niveli ${i + 1})`);
  });
});

test("rrjeta gjenerohet për çdo nivel, me të njëjtën farë që përdor loja", () => {
  [...story, ...gen].forEach((l, i) => {
    const seed = l.seed || (i + 1) * 7919; // njësoj si startLevel() te game.js
    const g = generateGrid(l.words, seed);
    assert.equal(g.placements.length, l.words.length, `niveli ${i + 1}`);
  });
});

test("fjalët e niveleve të gjeneruara janë në leksik", () => {
  const lex = new Set(LEXICON);
  for (const l of gen) for (const w of l.words) assert.ok(lex.has(w), `"${w}" jashtë leksikut`);
});

test("leksiku: i pandashëm nga ai i dërguar në lojë, pa dublime, vetëm shkronja shqipe", () => {
  assert.equal(new Set(LEXICON).size, LEXICON.length);
  assert.deepEqual(LEXICON_WORDS, LEXICON);
  for (const w of LEXICON) assert.match(w, /^[ABCÇDEËFGHIJKLMNOPQRSTUVXYZ]+$/, w);
});

test("çdo çelës i GLOSSES i përket një fjale të njohur (pa shpjegime jetime)", () => {
  const known = new Set([...LEXICON, ...BONUS_WORDS, ...story.flatMap((l) => l.words), ...gen.flatMap((l) => l.words)]);
  const orphans = Object.keys(GLOSSES).filter((w) => !known.has(w));
  assert.deepEqual(orphans, []);
});

test("shpjegimet janë tekst jo i zbrazët", () => {
  for (const [w, g] of Object.entries(GLOSSES)) assert.ok(typeof g === "string" && g.trim().length > 5, w);
});
