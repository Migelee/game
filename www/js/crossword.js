/* =========================================================================
 * Gjenerator i rrjetës së fjalëkryqit
 *
 * Merr listën e fjalëve të një niveli dhe i vendos ato në një rrjetë
 * të lidhur (si "Words of Wonders"): fjala e parë vendoset horizontalisht,
 * çdo fjalë tjetër kryqëzohet me një shkronjë të përbashkët.
 * Gjenerimi është determinist (i njëjti nivel jep gjithmonë të njëjtën
 * rrjetë) falë një RNG-je me farë (seed).
 * ========================================================================= */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function attemptLayout(order, rng) {
  const cells = new Map(); // "x,y" -> shkronjë
  const placements = [];
  const key = (x, y) => x + "," + y;

  function canPlace(word, x, y, dir) {
    const dx = dir === 0 ? 1 : 0;
    const dy = dir === 0 ? 0 : 1;
    // qeliza para dhe pas fjalës duhet të jenë bosh
    if (cells.has(key(x - dx, y - dy))) return false;
    if (cells.has(key(x + dx * word.length, y + dy * word.length))) return false;
    let crosses = 0;
    for (let i = 0; i < word.length; i++) {
      const cx = x + dx * i;
      const cy = y + dy * i;
      const existing = cells.get(key(cx, cy));
      if (existing !== undefined) {
        if (existing !== word[i]) return false;
        crosses++;
      } else if (dir === 0) {
        if (cells.has(key(cx, cy - 1)) || cells.has(key(cx, cy + 1))) return false;
      } else {
        if (cells.has(key(cx - 1, cy)) || cells.has(key(cx + 1, cy))) return false;
      }
    }
    return crosses > 0;
  }

  function place(word, x, y, dir) {
    const dx = dir === 0 ? 1 : 0;
    const dy = dir === 0 ? 0 : 1;
    for (let i = 0; i < word.length; i++) {
      cells.set(key(x + dx * i, y + dy * i), word[i]);
    }
    placements.push({ word, x, y, dir });
  }

  place(order[0], 0, 0, 0);

  for (let w = 1; w < order.length; w++) {
    const word = order[w];
    const candidates = [];
    for (const p of placements) {
      const pdx = p.dir === 0 ? 1 : 0;
      const pdy = p.dir === 0 ? 0 : 1;
      const ndir = p.dir === 0 ? 1 : 0;
      for (let i = 0; i < p.word.length; i++) {
        for (let j = 0; j < word.length; j++) {
          if (p.word[i] !== word[j]) continue;
          const crossX = p.x + pdx * i;
          const crossY = p.y + pdy * i;
          const nx = ndir === 0 ? crossX - j : crossX;
          const ny = ndir === 0 ? crossY : crossY - j;
          if (canPlace(word, nx, ny, ndir)) {
            candidates.push({ x: nx, y: ny, dir: ndir });
          }
        }
      }
    }
    if (candidates.length === 0) return null;
    // zgjidh kandidatin: rastësor kur jepet rng (për riprovime),
    // përndryshe ai që mban rrjetën sa më kompakte
    let best = null;
    if (rng) {
      best = candidates[Math.floor(rng() * candidates.length)];
      place(word, best.x, best.y, best.dir);
      continue;
    }
    let bestScore = Infinity;
    for (const c of candidates) {
      const cdx = c.dir === 0 ? 1 : 0;
      const cdy = c.dir === 0 ? 0 : 1;
      let minX = c.x, maxX = c.x + cdx * (word.length - 1);
      let minY = c.y, maxY = c.y + cdy * (word.length - 1);
      for (const [k] of cells) {
        const [px, py] = k.split(",").map(Number);
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
      const wSpan = maxX - minX + 1;
      const hSpan = maxY - minY + 1;
      const score = wSpan * hSpan + Math.abs(wSpan - hSpan) * 2;
      if (score < bestScore) { bestScore = score; best = c; }
    }
    place(word, best.x, best.y, best.dir);
  }
  return placements;
}

/**
 * Gjeneron rrjetën për një nivel.
 * @param {string[]} words fjalët e nivelit
 * @param {number} seed fara për RNG determinist
 * @returns {{placements: Array, cols: number, rows: number}}
 */
function generateGrid(words, seed) {
  const sorted = words.slice().sort((a, b) => b.length - a.length);
  const rng = mulberry32(seed);
  let layout = attemptLayout(sorted, null);
  let tries = 0;
  while (!layout && tries < 2000) {
    const rest = shuffled(sorted.slice(1), rng);
    layout = attemptLayout([sorted[0]].concat(rest), rng);
    tries++;
  }
  if (!layout) {
    throw new Error("Nuk u gjenerua rrjeta për: " + words.join(", "));
  }
  // normalizo koordinatat në (0,0)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of layout) {
    const dx = p.dir === 0 ? 1 : 0;
    const dy = p.dir === 0 ? 0 : 1;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + dx * (p.word.length - 1));
    maxY = Math.max(maxY, p.y + dy * (p.word.length - 1));
  }
  for (const p of layout) {
    p.x -= minX;
    p.y -= minY;
  }
  return { placements: layout, cols: maxX - minX + 1, rows: maxY - minY + 1 };
}

if (typeof module !== "undefined") {
  module.exports = { generateGrid };
}
