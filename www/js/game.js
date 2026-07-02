/* =========================================================================
 * Fjalë Shqip — Logjika e lojës
 * Mekanika: zgjidh shkronjat në rrotë duke i lidhur me gisht (ose mi)
 * për të formuar fjalë shqipe që mbushin rrjetën e fjalëkryqit.
 * ========================================================================= */

(function () {
  "use strict";

  /* ---------- Nivelet e sheshuara ---------- */
  const LEVELS = [];
  PACKS.forEach((pack, pi) => {
    pack.levels.forEach((lv, li) => {
      LEVELS.push({ pack, packIndex: pi, indexInPack: li, letters: lv.letters, words: lv.words });
    });
  });

  /* ---------- Gjendja e ruajtur ---------- */
  const store = {
    get completed() { return parseInt(localStorage.getItem("fs_completed") || "0", 10); },
    set completed(v) { localStorage.setItem("fs_completed", String(v)); },
    get coins() { return parseInt(localStorage.getItem("fs_coins") || "60", 10); },
    set coins(v) { localStorage.setItem("fs_coins", String(v)); },
  };

  const HINT_COST = 25;
  const BONUS_REWARD = 5;
  const LEVEL_REWARD = 20;

  /* ---------- Gjendja e nivelit aktual ---------- */
  let current = null; // { index, grid, cellEls, foundWords, revealed, bonusFound, wheelNodes, letters }

  /* ---------- Ndihmës DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const screens = {
    home: $("screen-home"),
    packs: $("screen-packs"),
    game: $("screen-game"),
  };

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function updateCoins() {
    $("coins-packs").textContent = store.coins;
    $("coins-game").textContent = store.coins;
  }

  let toastTimer = null;
  function toast(msg, ms = 1400) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), ms);
  }

  /* ---------- Ekrani i paketave ---------- */
  function renderPacks() {
    const list = $("packs-list");
    list.innerHTML = "";
    let globalIndex = 0;
    PACKS.forEach((pack) => {
      const card = document.createElement("div");
      card.className = "pack-card";
      const head = document.createElement("div");
      head.className = "pack-head";
      head.innerHTML =
        `<span class="pack-name">${pack.name}</span>` +
        `<span class="pack-sub">${pack.subtitle}</span>`;
      card.appendChild(head);
      const grid = document.createElement("div");
      grid.className = "pack-levels";
      pack.levels.forEach(() => {
        const idx = globalIndex++;
        const dot = document.createElement("button");
        dot.className = "level-dot";
        dot.textContent = idx + 1;
        if (idx < store.completed) dot.classList.add("done");
        else if (idx === store.completed) dot.classList.add("current");
        else dot.classList.add("locked");
        if (idx <= store.completed) {
          dot.addEventListener("click", () => startLevel(idx));
        }
        grid.appendChild(dot);
      });
      card.appendChild(grid);
      list.appendChild(card);
    });
    updateCoins();
  }

  /* ---------- Ngarkimi i nivelit ---------- */
  function startLevel(index) {
    if (index >= LEVELS.length) index = LEVELS.length - 1;
    const level = LEVELS[index];
    const grid = generateGrid(level.words, (index + 1) * 7919);

    current = {
      index,
      level,
      grid,
      foundWords: new Set(),
      bonusFound: new Set(),
      revealed: new Set(), // "x,y" të zbuluara
      cellEls: new Map(),
      letters: level.letters.split(""),
    };

    $("level-city").textContent = level.pack.name + " · " + level.pack.subtitle;
    $("level-num").textContent = "Niveli " + (index + 1);

    // ekrani duhet të jetë i dukshëm para se të maten përmasat
    showScreen("game");
    renderGrid();
    renderWheel();
    updateCoins();
  }

  function renderGrid() {
    const { grid } = current;
    const gridEl = $("grid");
    gridEl.innerHTML = "";
    current.cellEls.clear();

    // llogarit madhësinë e qelizës që rrjeta të nxërë në ekran
    const wrap = $("grid-wrap");
    const availW = wrap.clientWidth - 24;
    const availH = wrap.clientHeight - 16;
    const size = Math.max(
      26,
      Math.min(52, Math.floor(availW / grid.cols) - 5, Math.floor(availH / grid.rows) - 5)
    );
    gridEl.style.setProperty("--cell-size", size + "px");
    gridEl.style.gridTemplateColumns = `repeat(${grid.cols}, ${size}px)`;

    // harta e qelizave të zëna
    const occupied = new Map(); // "x,y" -> shkronjë
    for (const p of grid.placements) {
      const dx = p.dir === 0 ? 1 : 0;
      const dy = p.dir === 0 ? 0 : 1;
      for (let i = 0; i < p.word.length; i++) {
        occupied.set((p.x + dx * i) + "," + (p.y + dy * i), p.word[i]);
      }
    }

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const k = x + "," + y;
        const cell = document.createElement("div");
        cell.className = "cell";
        if (occupied.has(k)) {
          cell.textContent = occupied.get(k);
          cell.addEventListener("click", () => onCellTap(k));
          current.cellEls.set(k, cell);
        } else {
          cell.classList.add("blank");
        }
        gridEl.appendChild(cell);
      }
    }
  }

  function wordCells(placement) {
    const dx = placement.dir === 0 ? 1 : 0;
    const dy = placement.dir === 0 ? 0 : 1;
    const keys = [];
    for (let i = 0; i < placement.word.length; i++) {
      keys.push((placement.x + dx * i) + "," + (placement.y + dy * i));
    }
    return keys;
  }

  function onCellTap(key) {
    // trego kuptimin e fjalës së gjetur që përmban këtë qelizë
    for (const p of current.grid.placements) {
      if (!current.foundWords.has(p.word)) continue;
      if (wordCells(p).includes(key)) {
        showGloss(p.word);
        return;
      }
    }
  }

  function showGloss(word) {
    const gloss = GLOSSES[word];
    if (!gloss) return;
    $("gloss-word").textContent = word;
    $("gloss-text").textContent = gloss;
    $("overlay-gloss").classList.add("show");
  }

  /* ---------- Rrota e shkronjave ---------- */
  const wheelEl = $("wheel");
  const linesEl = $("wheel-lines");
  let selection = []; // indekset e nyjeve të zgjedhura
  let dragging = false;

  function renderWheel() {
    // hiq nyjet e vjetra (mbaj svg-në e vijave)
    wheelEl.querySelectorAll(".wheel-letter").forEach((n) => n.remove());
    selection = [];
    drawLines();
    updateCurrentWord();

    const letters = current.letters;
    const R = wheelEl.clientWidth / 2;
    const r = R - 40; // rrezja e vendosjes së shkronjave
    current.wheelNodes = letters.map((ch, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / letters.length;
      const x = R + r * Math.cos(angle);
      const y = R + r * Math.sin(angle);
      const node = document.createElement("div");
      node.className = "wheel-letter";
      node.textContent = ch;
      node.style.left = x + "px";
      node.style.top = y + "px";
      wheelEl.appendChild(node);
      return { ch, x, y, el: node };
    });
  }

  function shuffleWheel() {
    for (let i = current.letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [current.letters[i], current.letters[j]] = [current.letters[j], current.letters[i]];
    }
    renderWheel();
  }

  function updateCurrentWord() {
    const el = $("current-word");
    el.innerHTML = "";
    for (const idx of selection) {
      const span = document.createElement("span");
      span.className = "cw-letter";
      span.textContent = current.wheelNodes ? current.wheelNodes[idx].ch : "";
      el.appendChild(span);
    }
  }

  function drawLines(pointer) {
    const pts = selection.map((i) => current.wheelNodes[i]);
    let svg = "";
    if (pts.length > 0) {
      const coords = pts.map((p) => `${p.x},${p.y}`);
      if (pointer) coords.push(`${pointer.x},${pointer.y}`);
      svg = `<polyline points="${coords.join(" ")}" fill="none" stroke="#e8b64c" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
    }
    linesEl.setAttribute("viewBox", `0 0 ${wheelEl.clientWidth} ${wheelEl.clientHeight}`);
    linesEl.innerHTML = svg;
  }

  function wheelPoint(ev) {
    const rect = wheelEl.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  function hitNode(pt) {
    const hitR = 34;
    let best = -1;
    let bestD = hitR;
    current.wheelNodes.forEach((n, i) => {
      const d = Math.hypot(n.x - pt.x, n.y - pt.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function selectNode(i) {
    if (selection.includes(i)) {
      // kthim pas: nëse preket nyja e parafundit, hiq të fundit
      if (selection.length >= 2 && selection[selection.length - 2] === i) {
        const removed = selection.pop();
        current.wheelNodes[removed].el.classList.remove("selected");
      }
      return;
    }
    selection.push(i);
    current.wheelNodes[i].el.classList.add("selected");
    updateCurrentWord();
  }

  wheelEl.addEventListener("pointerdown", (ev) => {
    if (!current) return;
    dragging = true;
    wheelEl.setPointerCapture(ev.pointerId);
    const pt = wheelPoint(ev);
    const i = hitNode(pt);
    if (i >= 0) selectNode(i);
    drawLines(pt);
  });

  wheelEl.addEventListener("pointermove", (ev) => {
    if (!dragging || !current) return;
    const pt = wheelPoint(ev);
    const i = hitNode(pt);
    if (i >= 0) {
      selectNode(i);
      updateCurrentWord();
    }
    drawLines(pt);
  });

  function endDrag() {
    if (!dragging || !current) return;
    dragging = false;
    const word = selection.map((i) => current.wheelNodes[i].ch).join("");
    selection.forEach((i) => current.wheelNodes[i].el.classList.remove("selected"));
    selection = [];
    drawLines();
    updateCurrentWord();
    if (word.length >= 2) submitWord(word);
  }
  wheelEl.addEventListener("pointerup", endDrag);
  wheelEl.addEventListener("pointercancel", endDrag);

  /* ---------- Kontrolli i fjalës ---------- */
  function submitWord(word) {
    const { level } = current;

    if (level.words.includes(word)) {
      if (current.foundWords.has(word)) {
        toast("E gjetur tashmë");
        return;
      }
      revealWord(word);
      return;
    }

    if (BONUS_WORDS.has(word) && canFormFromWheel(word)) {
      if (current.bonusFound.has(word)) {
        toast("Bonus i marrë tashmë");
        return;
      }
      current.bonusFound.add(word);
      store.coins += BONUS_REWARD;
      updateCoins();
      toast(`✨ Fjalë bonus: ${word} (+${BONUS_REWARD} 🪙)`);
      return;
    }

    toast("Nuk është fjalë e nivelit");
  }

  function canFormFromWheel(word) {
    const pool = {};
    for (const ch of current.level.letters) pool[ch] = (pool[ch] || 0) + 1;
    for (const ch of word) {
      if (!pool[ch]) return false;
      pool[ch]--;
    }
    return true;
  }

  function revealWord(word, viaHint) {
    current.foundWords.add(word);
    const placement = current.grid.placements.find((p) => p.word === word);
    const keys = wordCells(placement);
    keys.forEach((k, i) => {
      if (current.revealed.has(k)) return;
      current.revealed.add(k);
      const cell = current.cellEls.get(k);
      setTimeout(() => {
        cell.classList.add("revealed", "pop");
      }, i * 70);
    });
    if (!viaHint) {
      const gloss = GLOSSES[word];
      toast(gloss ? `${word} — ${gloss}` : word, 2200);
    }
    // fjalë të tjera që u plotësuan tërthorazi nga zbulimi
    checkIndirectlyCompleted();
    setTimeout(checkWin, keys.length * 70 + 450);
  }

  function checkIndirectlyCompleted() {
    for (const p of current.grid.placements) {
      if (current.foundWords.has(p.word)) continue;
      if (wordCells(p).every((k) => current.revealed.has(k))) {
        current.foundWords.add(p.word);
      }
    }
  }

  function useHint() {
    const unrevealed = [];
    for (const p of current.grid.placements) {
      for (const k of wordCells(p)) {
        if (!current.revealed.has(k) && !unrevealed.includes(k)) unrevealed.push(k);
      }
    }
    if (unrevealed.length === 0) return;
    if (store.coins < HINT_COST) {
      toast("S'ke monedha të mjaftueshme");
      return;
    }
    store.coins -= HINT_COST;
    updateCoins();
    const k = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    current.revealed.add(k);
    const cell = current.cellEls.get(k);
    cell.classList.add("revealed", "pop");
    checkIndirectlyCompleted();
    setTimeout(checkWin, 450);
  }

  /* ---------- Fitorja ---------- */
  function checkWin() {
    if (!current || current.won) return;
    const all = current.grid.placements.every((p) => current.foundWords.has(p.word));
    if (!all) return;
    current.won = true;

    store.coins += LEVEL_REWARD;
    if (current.index === store.completed) {
      store.completed = current.index + 1;
    }
    updateCoins();

    const bonusCount = current.bonusFound.size;
    const isLast = current.index === LEVELS.length - 1;
    $("win-text").textContent =
      `Zbulove të gjitha fjalët e nivelit ${current.index + 1}! +${LEVEL_REWARD} 🪙` +
      (bonusCount ? ` · ${bonusCount} fjalë bonus` : "") +
      (isLast ? " — Përfundove gjithë lojën! 🇦🇱" : "");
    $("btn-next").style.display = isLast ? "none" : "";
    $("overlay-win").classList.add("show");
  }

  /* ---------- Lidhjet e butonave ---------- */
  $("btn-play").addEventListener("click", () => startLevel(Math.min(store.completed, LEVELS.length - 1)));
  $("btn-packs").addEventListener("click", () => { renderPacks(); showScreen("packs"); });
  $("btn-packs-back").addEventListener("click", () => showScreen("home"));
  $("btn-game-back").addEventListener("click", () => { renderPacks(); showScreen("packs"); });
  $("btn-shuffle").addEventListener("click", shuffleWheel);
  $("btn-hint").addEventListener("click", useHint);
  $("btn-next").addEventListener("click", () => {
    $("overlay-win").classList.remove("show");
    startLevel(current.index + 1);
  });
  $("btn-win-menu").addEventListener("click", () => {
    $("overlay-win").classList.remove("show");
    renderPacks();
    showScreen("packs");
  });
  $("btn-gloss-close").addEventListener("click", () => $("overlay-gloss").classList.remove("show"));

  window.addEventListener("resize", () => {
    if (current && screens.game.classList.contains("active")) {
      renderGrid();
      // rikthe qelizat e zbuluara pas ri-vizatimit
      current.revealed.forEach((k) => {
        const cell = current.cellEls.get(k);
        if (cell) cell.classList.add("revealed");
      });
      renderWheel();
    }
  });

  /* ---------- Nisja ---------- */
  updateCoins();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
