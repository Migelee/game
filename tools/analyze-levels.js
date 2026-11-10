#!/usr/bin/env node
/* =========================================================================
 * analyze-levels.js — raport vetëm-për-lexim mbi kurbën e vështirësisë dhe
 * përsëritjen e rrotave. NUK ndryshon asnjë nivel.
 *     node tools/analyze-levels.js
 * ========================================================================= */

const { PACKS } = require("../www/js/levels.js");
const { GENERATED_PACKS } = require("../www/js/levels-gen.js");

// e njëjta formulë me gjeneratorin (tools/generate-levels.js)
const difficulty = (l) => {
  const avgLen = l.words.reduce((s, w) => s + w.length, 0) / l.words.length;
  return l.letters.length * 3 + l.words.length * 1.4 + avgLen;
};

function flatten() {
  const out = [];
  for (const pk of PACKS) for (const lv of pk.levels) out.push({ ...lv, src: "story", pack: pk.name });
  for (const pk of GENERATED_PACKS) for (const lv of pk.levels) out.push({ ...lv, src: "gen", pack: pk.name });
  return out.map((l, i) => ({ ...l, index: i, d: difficulty(l) }));
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sig = (l) => l.letters.split("").sort().join("");

function analyze(levels) {
  const story = levels.filter((l) => l.src === "story");
  const gen = levels.filter((l) => l.src === "gen");

  // 1) kurba: mesatarja e vështirësisë për çdo 100 nivele
  const curve = [];
  for (let i = 0; i < levels.length; i += 100) {
    const s = levels.slice(i, i + 100);
    curve.push({ from: i + 1, to: i + s.length, d: mean(s.map((l) => l.d)), wheel: mean(s.map((l) => l.letters.length)), words: mean(s.map((l) => l.words.length)) });
  }

  // 2) çarje në kalimin story -> gjeneruar
  const lastStoryPack = PACKS[PACKS.length - 1].levels.map((l) => difficulty(l));
  const storyEnd = mean(lastStoryPack);
  const firstGenPack = gen.slice(0, 12);
  const genStart = mean(firstGenPack.map((l) => l.d));
  const genBelowStoryEnd = gen.filter((l) => l.d < storyEnd);
  const genBelowIdx = genBelowStoryEnd.length ? Math.max(...genBelowStoryEnd.map((l) => l.index)) + 1 : 0;

  // 3) rrotat e përsëritura
  const byWheel = {};
  for (const l of gen) (byWheel[sig(l)] = byWheel[sig(l)] || []).push(l.index);
  const counts = Object.values(byWheel).map((a) => a.length);
  const hist = {};
  counts.forEach((c) => (hist[c] = (hist[c] || 0) + 1));
  let close12 = 0, close50 = 0, pairs = 0;
  for (const idxs of Object.values(byWheel)) {
    for (let i = 1; i < idxs.length; i++) {
      pairs++;
      const gap = idxs[i] - idxs[i - 1];
      if (gap <= 12) close12++;
      if (gap <= 50) close50++;
    }
  }

  // 4) rënie të menjëhershme të vështirësisë (nivel shumë më i lehtë se mesatarja e 10 të mëparshmeve)
  let drops = 0;
  for (let i = 10; i < levels.length; i++) {
    if (levels[i].d < mean(levels.slice(i - 10, i).map((l) => l.d)) - 4) drops++;
  }

  return { curve, storyEnd, genStart, genBelowStoryEnd: genBelowStoryEnd.length, genBelowIdx, totalGen: gen.length,
    distinctWheels: counts.length, hist, repeatPairs: pairs, close12, close50, drops, totalLevels: levels.length };
}

function print(r) {
  console.log(`Nivele: ${r.totalLevels} (story ${PACKS.reduce((s, p) => s + p.levels.length, 0)}, të gjeneruara ${r.totalGen})\n`);
  console.log("Vështirësia mesatare për çdo 100 nivele (rrota / fjalë):");
  for (const c of r.curve) console.log(`  ${String(c.from).padStart(4)}–${String(c.to).padEnd(4)} d=${c.d.toFixed(1).padStart(5)}  rrota ${c.wheel.toFixed(1)}  fjalë ${c.words.toFixed(1)}`);
  console.log(`\nKalimi story → të gjeneruara: story mbaron me d≈${r.storyEnd.toFixed(1)}, e gjeneruara fillon me d≈${r.genStart.toFixed(1)}`);
  console.log(`  ${r.genBelowStoryEnd} nivele të gjeneruara (${Math.round(100 * r.genBelowStoryEnd / r.totalGen)}%) janë më të lehta se fundi i story-t; i fundit është te niveli ${r.genBelowIdx}`);
  console.log(`\nRrota të përsëritura: ${r.distinctWheels} rrota të ndryshme për ${r.totalGen} nivele`);
  console.log("  nivele për rrotë → sa rrota:", Object.entries(r.hist).map(([k, v]) => `${k}×:${v}`).join("  "));
  console.log(`  ${r.repeatPairs} çifte të së njëjtës rrotë; ${r.close12} brenda 12 niveleve, ${r.close50} brenda 50`);
  console.log(`\nRënie të menjëhershme (≥4 pikë nën mesataren e 10 të mëparshmeve): ${r.drops}`);
}

if (require.main === module) print(analyze(flatten()));
module.exports = { analyze, flatten, difficulty };
