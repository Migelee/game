/* =========================================================================
 * Fjalë Shqip — Logjika e lojës
 *
 * Mekanika: zgjidh shkronjat në rrotë duke i lidhur me gisht (ose mi)
 * për të formuar fjalë shqipe që mbushin rrjetën e fjalëkryqit.
 *
 * Përmban: tri lloje ndihmash (💡 e rastit, 🎯 me zgjedhje, 💣 tri
 * shkronja), seri fitoresh 🔥, kavanozin e yjeve ⭐, vlerësim me yje
 * për çdo nivel, tinguj të sintetizuar (WebAudio) dhe dridhje.
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
  // Mbështjellës i sigurt: localStorage mund të hedhë përjashtim
  // (p.sh. Safari në modalitet privat) — loja s'duhet të rrëzohet kurrë.
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* vazhdo pa ruajtje */ } },
    remove(k) { try { localStorage.removeItem(k); } catch { /* s'prish punë */ } },
  };

  const store = {
    get completed() { return parseInt(LS.get("fs_completed", "0"), 10); },
    set completed(v) { LS.set("fs_completed", String(v)); },
    get coins() { return parseInt(LS.get("fs_coins", "60"), 10); },
    set coins(v) { LS.set("fs_coins", String(v)); },
    get jar() { return parseInt(LS.get("fs_jar", "0"), 10); },
    set jar(v) { LS.set("fs_jar", String(v)); },
    get sound() { return LS.get("fs_sound", "1") !== "0"; },
    set sound(v) { LS.set("fs_sound", v ? "1" : "0"); },
    get music() { return LS.get("fs_music", "1") !== "0"; },
    set music(v) { LS.set("fs_music", v ? "1" : "0"); },
    get vibration() { return LS.get("fs_vibration", "1") !== "0"; },
    set vibration(v) { LS.set("fs_vibration", v ? "1" : "0"); },
    get stars() { try { return JSON.parse(LS.get("fs_stars", "{}")); } catch { return {}; } },
    setStar(index, n) {
      const s = this.stars;
      s[index] = Math.max(s[index] || 0, n);
      LS.set("fs_stars", JSON.stringify(s));
    },
    get premium() { return LS.get("fs_premium", "0") === "1"; },
    set premium(v) { LS.set("fs_premium", v ? "1" : "0"); },
    get winsSinceAd() { return parseInt(LS.get("fs_wins_ad", "0"), 10); },
    set winsSinceAd(v) { LS.set("fs_wins_ad", String(v)); },
    get lastDaily() { return LS.get("fs_last_daily", ""); },
    set lastDaily(v) { LS.set("fs_last_daily", v); },
    get dailyStreak() { return parseInt(LS.get("fs_daily_streak", "0"), 10); },
    set dailyStreak(v) { LS.set("fs_daily_streak", String(v)); },
    get resume() { try { return JSON.parse(LS.get("fs_resume", "null")); } catch { return null; } },
    set resume(v) {
      if (v) LS.set("fs_resume", JSON.stringify(v));
      else LS.remove("fs_resume");
    },
  };

  const COST_HINT = 25;
  const COST_TARGET = 35;
  const COST_BOMB = 60;
  const BONUS_REWARD = 5;
  const LEVEL_REWARD = 20;
  const STREAK_REWARD = 3;   // monedha shtesë për çdo gjetje kur seria >= 3
  const JAR_SIZE = 10;
  const JAR_REWARD = 40;
  const AD_REWARD = 30;       // monedha për një reklamë me shpërblim
  const AD_EVERY_WINS = 3;    // reklamë e plotë çdo 3 nivele të fituara
  const AD_MIN_LEVEL = 4;     // asnjë reklamë para nivelit 4

  /* ---------- Gjendja e nivelit aktual ---------- */
  let current = null;

  /* ---------- Ndihmës DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const screens = { home: $("screen-home"), packs: $("screen-packs"), game: $("screen-game") };

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function vibrate(pattern) {
    if (store.vibration && navigator.vibrate) navigator.vibrate(pattern);
  }

  /* ---------- Tingujt (WebAudio, pa asnjë skedar) ---------- */
  const Sound = {
    ctx: null,
    ensureCtx() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    },
    ensure() {
      return store.sound ? this.ensureCtx() : null;
    },
    tone(freq, dur, type = "sine", gain = 0.14, delay = 0) {
      const ctx = this.ensure();
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    tick(n) { this.tone(440 * Math.pow(2, n / 12), 0.09, "triangle", 0.12); },
    untick(n) { this.tone(440 * Math.pow(2, n / 12), 0.07, "triangle", 0.07); },
    bad() { this.tone(150, 0.2, "sawtooth", 0.09); vibrate(80); },
    word() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.16, "triangle", 0.13, i * 0.07)); vibrate(25); },
    bonus() { [880, 1174, 1568].forEach((f, i) => this.tone(f, 0.1, "sine", 0.1, i * 0.06)); vibrate(15); },
    coin() { this.tone(1568, 0.09, "sine", 0.1); this.tone(2093, 0.12, "sine", 0.08, 0.07); },
    hint() { this.tone(700, 0.12, "sine", 0.12); this.tone(1050, 0.16, "sine", 0.1, 0.09); },
    win() {
      [523, 659, 784, 1046, 784, 1046].forEach((f, i) =>
        this.tone(f, 0.22, "triangle", 0.14, i * 0.13));
      vibrate([40, 60, 40, 60, 120]);
    },
  };

  /* ---------- Muzika e sfondit (arpezh i qetë pentatonik) ---------- */
  const Music = {
    timer: null,
    // Mi minor pentatonik në dy oktava — tingëllon i qetë e ballkanik
    notes: [164.81, 196.0, 220.0, 246.94, 293.66, 329.63, 392.0, 440.0],
    pluck(freq) {
      const ctx = Sound.ensureCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 850;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.045, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 1.9);
      osc.connect(lp).connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 2);
    },
    start() {
      if (this.timer || !store.music) return;
      this.timer = setInterval(() => {
        if (!store.music) return;
        if (Math.random() < 0.3) return; // pushime të rastit — frymëmarrje
        this.pluck(this.notes[Math.floor(Math.random() * this.notes.length)]);
      }, 1150);
    },
    stop() {
      clearInterval(this.timer);
      this.timer = null;
    },
  };

  // WebAudio zhbllokohet vetëm pas gjestit të parë të përdoruesit
  document.addEventListener("pointerdown", function unlock() {
    Sound.ensureCtx();
    Music.start();
    document.removeEventListener("pointerdown", unlock);
  });

  /* ---------- Monedhat, kavanozi, seria ---------- */
  function bump(el) {
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  function updateCoins() {
    $("coins-packs").textContent = store.coins;
    $("coins-game").textContent = store.coins;
  }

  function updateJar() {
    $("jar-count").textContent = store.jar;
  }

  function addCoins(n, fromEl) {
    store.coins += n;
    updateCoins();
    const chip = $("coins-game");
    if (fromEl) flyEmoji("🪙", fromEl, chip.parentElement, () => bump(chip.parentElement));
    else bump(chip.parentElement);
    Sound.coin();
  }

  function addJarStar(fromEl) {
    const chip = $("jar-chip");
    flyEmoji("⭐", fromEl, chip, () => {
      store.jar += 1;
      updateJar();
      bump(chip);
      if (store.jar >= JAR_SIZE) {
        store.jar = 0;
        updateJar();
        addCoins(JAR_REWARD, chip);
        toast(`⭐ Kavanozi u mbush! +${JAR_REWARD} 🪙`, 2000);
      }
    });
  }

  let streak = 0;
  function setStreak(n) {
    streak = n;
    const badge = $("streak-badge");
    $("streak-count").textContent = streak;
    badge.classList.toggle("show", streak >= 2);
  }

  /* ---------- Njoftimet ---------- */
  let toastTimer = null;
  function toast(msg, ms = 1500) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), ms);
  }

  /* ---------- Efektet fluturuese ---------- */
  const fx = $("fx-layer");

  function flyEmoji(emoji, fromEl, toEl, onDone) {
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const el = document.createElement("span");
    el.className = "fly-emoji";
    el.textContent = emoji;
    el.style.left = a.left + a.width / 2 - 10 + "px";
    el.style.top = a.top + a.height / 2 - 10 + "px";
    fx.appendChild(el);
    requestAnimationFrame(() => {
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      el.style.transform = `translate(${dx}px, ${dy}px) scale(0.6)`;
      el.style.opacity = "0.2";
    });
    setTimeout(() => { el.remove(); if (onDone) onDone(); }, 720);
  }

  function flyLetterTo(ch, fromRect, toRect, delay, onDone) {
    const size = Math.min(fromRect.width, 44);
    const el = document.createElement("span");
    el.className = "fly-letter";
    el.textContent = ch;
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.fontSize = size * 0.55 + "px";
    el.style.left = fromRect.left + fromRect.width / 2 - size / 2 + "px";
    el.style.top = fromRect.top + fromRect.height / 2 - size / 2 + "px";
    fx.appendChild(el);
    setTimeout(() => {
      requestAnimationFrame(() => {
        const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
        const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
        el.style.transform = `translate(${dx}px, ${dy}px) scale(${toRect.width / size})`;
      });
      setTimeout(() => { el.remove(); onDone(); }, 520);
    }, delay);
  }

  const CONFETTI_COLORS = ["#c8102e", "#e8b64c", "#fdf6ec", "#2e9e5b", "#ffd267", "#1a1a1d"];
  function confetti() {
    for (let i = 0; i < 60; i++) {
      const bit = document.createElement("i");
      bit.className = "confetti-bit";
      bit.style.left = Math.random() * 100 + "vw";
      bit.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      bit.style.setProperty("--dur", 2 + Math.random() * 1.6 + "s");
      bit.style.setProperty("--delay", Math.random() * 0.5 + "s");
      bit.style.setProperty("--spin", 360 + Math.random() * 540 + "deg");
      fx.appendChild(bit);
      setTimeout(() => bit.remove(), 4500);
    }
  }

  /* ---------- Sfondi me yje ---------- */
  (function starfield() {
    const wrap = $("stars");
    for (let i = 0; i < 46; i++) {
      const s = document.createElement("i");
      s.style.left = Math.random() * 100 + "vw";
      s.style.top = Math.random() * 100 + "vh";
      s.style.setProperty("--dur", 2.5 + Math.random() * 4 + "s");
      s.style.setProperty("--delay", Math.random() * 5 + "s");
      s.style.setProperty("--peak", 0.25 + Math.random() * 0.55);
      wrap.appendChild(s);
    }
  })();

  /* ---------- Ekrani i paketave ---------- */
  function renderPacks() {
    const list = $("packs-list");
    list.innerHTML = "";
    const stars = store.stars;
    let globalIndex = 0;
    PACKS.forEach((pack) => {
      const card = document.createElement("div");
      card.className = "pack-card";
      card.style.setProperty("--pack-color", pack.color);

      const done = pack.levels.reduce((acc, _, li) => {
        const idx = globalIndex + li;
        return acc + (idx < store.completed ? 1 : 0);
      }, 0);

      card.innerHTML =
        `<div class="pack-head">` +
        `<span class="pack-emoji">${pack.emoji}</span>` +
        `<span class="pack-name">${pack.name}</span>` +
        `<span class="pack-sub">${pack.subtitle}</span>` +
        `</div>` +
        `<div class="pack-progress"><b style="width:${(done / pack.levels.length) * 100}%"></b></div>`;

      const grid = document.createElement("div");
      grid.className = "pack-levels";
      pack.levels.forEach(() => {
        const idx = globalIndex++;
        const dot = document.createElement("button");
        dot.className = "level-dot";
        const starStr = stars[idx] ? "★".repeat(stars[idx]) : "";
        dot.innerHTML = `${idx + 1}${starStr ? `<span class="dot-stars">${starStr}</span>` : ""}`;
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
      revealed: new Set(),
      cellEls: new Map(),
      letters: level.letters.split(""),
      toolUses: 0,
      wrongGuesses: 0,
      won: false,
      targetMode: false,
      flying: 0,
    };
    setStreak(0);

    $("level-city").textContent = level.pack.emoji + " " + level.pack.name;
    screens.game.style.setProperty("--accent", level.pack.color);

    // udhëzuesi vetëm në nivelin e parë të lojës
    $("tutorial").classList.toggle("show", index === 0 && store.completed === 0);

    // ekrani duhet të jetë i dukshëm para se të maten përmasat
    showScreen("game");
    renderGrid();
    renderWheel();
    restoreProgress();
    updateWordCount();
    updateCoins();
    updateJar();
  }

  function updateWordCount() {
    $("level-num").textContent =
      `Niveli ${current.index + 1} · ${current.foundWords.size}/${current.grid.placements.length}`;
  }

  /* ---------- Vazhdimi i nivelit të lënë përgjysmë ---------- */
  function saveProgress() {
    if (!current || current.won) return;
    if (current.foundWords.size === 0 && current.revealed.size === 0) return;
    store.resume = {
      index: current.index,
      revealed: [...current.revealed],
      found: [...current.foundWords],
      bonus: [...current.bonusFound],
      toolUses: current.toolUses,
      wrongGuesses: current.wrongGuesses,
    };
  }

  function restoreProgress() {
    const saved = store.resume;
    if (!saved || saved.index !== current.index) return;
    saved.found.forEach((w) => current.foundWords.add(w));
    saved.bonus.forEach((w) => current.bonusFound.add(w));
    saved.revealed.forEach((k) => {
      current.revealed.add(k);
      const cell = current.cellEls.get(k);
      if (cell) cell.classList.add("revealed");
    });
    current.toolUses = saved.toolUses || 0;
    current.wrongGuesses = saved.wrongGuesses || 0;
  }

  function renderGrid() {
    const { grid } = current;
    const gridEl = $("grid");
    gridEl.innerHTML = "";
    current.cellEls.clear();

    const wrap = $("grid-wrap");
    const availW = wrap.clientWidth - 24;
    const availH = wrap.clientHeight - 16;
    const size = Math.max(
      24,
      Math.min(52, Math.floor(availW / grid.cols) - 5, Math.floor(availH / grid.rows) - 5)
    );
    gridEl.style.setProperty("--cell-size", size + "px");
    gridEl.style.gridTemplateColumns = `repeat(${grid.cols}, ${size}px)`;

    const occupied = new Map();
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
    // mënyra 🎯: zbulo pikërisht qelizën e prekur (paguhet vetëm këtu)
    if (current.targetMode && !current.revealed.has(key)) {
      exitTargetMode();
      if (!spendFor(COST_TARGET)) return;
      revealCell(key, true);
      Sound.hint();
      checkIndirectlyCompleted();
      setTimeout(checkWin, 500);
      return;
    }
    // përndryshe: trego kuptimin e fjalës së gjetur që përmban qelizën
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
  let selection = [];
  let dragging = false;

  function renderWheel() {
    wheelEl.querySelectorAll(".wheel-letter").forEach((n) => n.remove());
    selection = [];
    drawLines();
    updateCurrentWord();

    const letters = current.letters;
    const R = wheelEl.clientWidth / 2;
    const r = R - 38;
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
    Sound.tone(390, 0.08, "triangle", 0.1);
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
      svg =
        `<polyline points="${coords.join(" ")}" fill="none" stroke="rgba(232,182,76,0.35)" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<polyline points="${coords.join(" ")}" fill="none" stroke="#e8b64c" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    linesEl.setAttribute("viewBox", `0 0 ${wheelEl.clientWidth} ${wheelEl.clientHeight}`);
    linesEl.innerHTML = svg;
  }

  function wheelPoint(ev) {
    const rect = wheelEl.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  function hitNode(pt) {
    const hitR = 33;
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
        Sound.untick(selection.length);
        updateCurrentWord();
      }
      return;
    }
    selection.push(i);
    current.wheelNodes[i].el.classList.add("selected");
    Sound.tick(selection.length);
    vibrate(10);
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
    if (i >= 0) selectNode(i);
    drawLines(pt);
  });

  function endDrag() {
    if (!dragging || !current) return;
    dragging = false;
    const word = selection.map((i) => current.wheelNodes[i].ch).join("");
    const usedNodes = selection.map((i) => current.wheelNodes[i]);
    selection.forEach((i) => current.wheelNodes[i].el.classList.remove("selected"));
    selection = [];
    drawLines();
    updateCurrentWord();
    if (word.length >= 2) submitWord(word, usedNodes);
  }
  wheelEl.addEventListener("pointerup", endDrag);
  wheelEl.addEventListener("pointercancel", endDrag);

  /* ---------- Kontrolli i fjalës ---------- */
  function submitWord(word, usedNodes) {
    const { level } = current;

    if (level.words.includes(word)) {
      if (current.foundWords.has(word)) {
        toast("E gjetur tashmë");
        return;
      }
      onCorrectFind();
      revealWordAnimated(word, usedNodes);
      return;
    }

    if (BONUS_WORDS.has(word) && canFormFromWheel(word)) {
      if (current.bonusFound.has(word)) {
        toast("Bonus i marrë tashmë");
        return;
      }
      current.bonusFound.add(word);
      onCorrectFind();
      Sound.bonus();
      addCoins(BONUS_REWARD, wheelEl);
      addJarStar(wheelEl);
      saveProgress();
      toast(`✨ Fjalë bonus: ${word} (+${BONUS_REWARD} 🪙)`);
      return;
    }

    current.wrongGuesses++;
    setStreak(0);
    Sound.bad();
    const cw = $("current-word");
    cw.classList.remove("shake");
    void cw.offsetWidth;
    cw.classList.add("shake");
    toast("Nuk është fjalë e nivelit");
  }

  function onCorrectFind() {
    $("tutorial").classList.remove("show");
    setStreak(streak + 1);
    if (streak >= 3) {
      addCoins(STREAK_REWARD, $("streak-badge"));
      toast(`🔥 Seri ${streak}! +${STREAK_REWARD} 🪙`, 1100);
    }
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

  function revealCell(key, flash) {
    if (current.revealed.has(key)) return;
    current.revealed.add(key);
    const cell = current.cellEls.get(key);
    cell.classList.add("revealed", "pop");
    if (flash) cell.classList.add("gold-flash");
  }

  /* Shkronjat fluturojnë nga rrota drejt qelizave të rrjetës. */
  function showPraise(text) {
    const el = $("praise");
    el.textContent = text;
    el.classList.remove("go");
    void el.offsetWidth;
    el.classList.add("go");
  }

  function revealWordAnimated(word, usedNodes) {
    current.foundWords.add(word);
    Sound.word();
    if (word.length === current.level.letters.length) showPraise("LEGJENDARE!");
    else if (word.length >= 6) showPraise("MREKULLI!");
    else if (word.length === 5) showPraise("SHKËLQYESHËM!");
    const placement = current.grid.placements.find((p) => p.word === word);
    const keys = wordCells(placement);

    keys.forEach((k, i) => {
      const cell = current.cellEls.get(k);
      if (current.revealed.has(k)) return;
      const fromEl = usedNodes && usedNodes[i] ? usedNodes[i].el : wheelEl;
      current.flying++;
      flyLetterTo(word[i], fromEl.getBoundingClientRect(), cell.getBoundingClientRect(), i * 60, () => {
        revealCell(k);
        current.flying--;
        if (current.flying === 0) {
          checkIndirectlyCompleted();
          checkWin();
        }
      });
    });

    const gloss = GLOSSES[word];
    toast(gloss ? `${word} — ${gloss}` : word, 2200);
    // nëse çdo qelizë ishte zbuluar tashmë (nga ndihmat), kontrollo direkt
    if (keys.every((k) => current.revealed.has(k))) {
      checkIndirectlyCompleted();
      setTimeout(checkWin, 300);
    }
  }

  function checkIndirectlyCompleted() {
    for (const p of current.grid.placements) {
      if (current.foundWords.has(p.word)) continue;
      if (wordCells(p).every((k) => current.revealed.has(k))) {
        current.foundWords.add(p.word);
      }
    }
    updateWordCount();
    saveProgress();
  }

  /* ---------- Ndihmat ---------- */
  function unrevealedKeys() {
    const keys = new Set();
    for (const p of current.grid.placements) {
      for (const k of wordCells(p)) {
        if (!current.revealed.has(k)) keys.add(k);
      }
    }
    return [...keys];
  }

  function spendFor(cost) {
    if (store.coins < cost) {
      toast("S'ke monedha të mjaftueshme 🪙");
      Sound.bad();
      return false;
    }
    store.coins -= cost;
    current.toolUses++;
    updateCoins();
    return true;
  }

  function useHint() {
    const keys = unrevealedKeys();
    if (keys.length === 0 || !spendFor(COST_HINT)) return;
    Sound.hint();
    revealCell(keys[Math.floor(Math.random() * keys.length)], true);
    checkIndirectlyCompleted();
    setTimeout(checkWin, 500);
  }

  function useBomb() {
    const keys = unrevealedKeys();
    if (keys.length === 0 || !spendFor(COST_BOMB)) return;
    Sound.hint();
    vibrate([30, 40, 30, 40, 30]);
    for (let n = 0; n < 3 && keys.length > 0; n++) {
      const i = Math.floor(Math.random() * keys.length);
      revealCell(keys.splice(i, 1)[0], true);
    }
    checkIndirectlyCompleted();
    setTimeout(checkWin, 500);
  }

  function enterTargetMode() {
    if (current.targetMode) { exitTargetMode(); return; }
    const keys = unrevealedKeys();
    if (keys.length === 0) return;
    if (store.coins < COST_TARGET) {
      toast("S'ke monedha të mjaftueshme 🪙");
      Sound.bad();
      return;
    }
    current.targetMode = true;
    $("btn-target").classList.add("armed");
    keys.forEach((k) => current.cellEls.get(k).classList.add("pickable"));
    toast("🎯 Prek qelizën që do të zbulosh", 2400);
  }

  function exitTargetMode() {
    if (!current || !current.targetMode) return;
    current.targetMode = false;
    $("btn-target").classList.remove("armed");
    current.cellEls.forEach((el) => el.classList.remove("pickable"));
  }

  /* ---------- Fitorja ---------- */
  function computeStars() {
    if (current.toolUses === 0 && current.wrongGuesses <= 2) return 3;
    if (current.toolUses <= 1) return 2;
    return 1;
  }

  function checkWin() {
    if (!current || current.won) return;
    const all = current.grid.placements.every((p) => current.foundWords.has(p.word));
    if (!all) return;
    current.won = true;
    exitTargetMode();
    store.resume = null;
    store.winsSinceAd = store.winsSinceAd + 1;

    const stars = computeStars();
    store.setStar(current.index, stars);
    addCoins(LEVEL_REWARD, $("grid"));
    if (current.index === store.completed) {
      store.completed = current.index + 1;
    }

    Sound.win();
    confetti();

    const starEls = $("win-stars").querySelectorAll("i");
    starEls.forEach((el, i) => el.classList.toggle("lit", i < stars));

    // përmbledhja e fjalëve — prek një fjalë për kuptimin e saj
    const wordsEl = $("win-words");
    wordsEl.innerHTML = "";
    current.grid.placements
      .map((p) => p.word)
      .sort((a, b) => b.length - a.length)
      .forEach((w) => {
        const chip = document.createElement("button");
        chip.className = "win-word-chip";
        chip.textContent = w;
        chip.addEventListener("click", () => showGloss(w));
        wordsEl.appendChild(chip);
      });

    const bonusCount = current.bonusFound.size;
    const isLast = current.index === LEVELS.length - 1;
    $("win-text").textContent =
      `Zbulove të gjitha fjalët e nivelit ${current.index + 1}! +${LEVEL_REWARD} 🪙` +
      (bonusCount ? ` · ${bonusCount} fjalë bonus ⭐` : "") +
      (isLast ? " — Përfundove gjithë lojën! 🇦🇱" : "");
    $("btn-next").style.display = isLast ? "none" : "";
    setTimeout(() => $("overlay-win").classList.add("show"), 650);
  }

  /* ---------- Reklamat dhe dyqani ---------- */

  /* Reklamë e plotë pas çdo AD_EVERY_WINS nivelesh, kurrë para nivelit
   * AD_MIN_LEVEL dhe kurrë për lojtarët premium. */
  function afterWinAd(next) {
    if (store.premium || store.completed < AD_MIN_LEVEL || store.winsSinceAd < AD_EVERY_WINS) {
      next();
      return;
    }
    store.winsSinceAd = 0;
    AdManager.showInterstitial(next);
  }

  function openShop() {
    const isPremium = store.premium;
    $("btn-remove-ads").style.display = isPremium ? "none" : "";
    $("premium-note").style.display = isPremium ? "" : "none";
    $("overlay-shop").classList.add("show");
  }

  $("btn-shop-close").addEventListener("click", () => $("overlay-shop").classList.remove("show"));
  document.querySelectorAll(".shop-open").forEach((el) => el.addEventListener("click", openShop));

  $("btn-watch-ad").addEventListener("click", () => {
    AdManager.showRewarded(
      () => {
        addCoins(AD_REWARD, $("btn-watch-ad"));
        toast(`📺 +${AD_REWARD} 🪙 — faleminderit!`);
      },
      () => toast("Reklama s'është gati — provo më vonë")
    );
  });

  $("btn-remove-ads").addEventListener("click", async () => {
    const result = await AdManager.purchaseRemoveAds();
    if (result === true) {
      store.premium = true;
      openShop();
      toast("✓ Reklamat u hoqën përgjithmonë!");
    } else if (result === false) {
      toast("Blerja nuk u krye");
    } else {
      toast("Blerjet funksionojnë vetëm në aplikacionin e telefonit 📱", 2400);
    }
  });

  /* ---------- Shpërblimi ditor ---------- */
  function checkDailyReward() {
    const today = new Date().toISOString().slice(0, 10);
    if (store.lastDaily === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    store.dailyStreak = store.lastDaily === yesterday ? store.dailyStreak + 1 : 1;
    store.lastDaily = today;
    const reward = 10 + 5 * Math.min(store.dailyStreak - 1, 4);
    $("daily-text").textContent =
      `Dita ${store.dailyStreak} radhazi 🔥 — ${reward} monedha dhuratë për ty!`;
    $("btn-daily-claim").onclick = () => {
      $("overlay-daily").classList.remove("show");
      addCoins(reward, $("btn-daily-claim"));
    };
    $("overlay-daily").classList.add("show");
  }

  /* ---------- Cilësimet ---------- */
  const VERSION = "1.2.0";

  function openSettings() {
    $("tgl-sound").checked = store.sound;
    $("tgl-music").checked = store.music;
    $("tgl-vibration").checked = store.vibration;
    $("version-note").textContent = `Fjalë Shqip v${VERSION} · Fjalët sipas Fjalorit të Gjuhës Shqipe`;
    $("overlay-settings").classList.add("show");
  }

  async function doRestorePurchases() {
    const r = await AdManager.restorePurchases();
    if (r === true) {
      store.premium = true;
      toast("✓ Blerjet u rikthyen — reklamat u hoqën!");
    } else if (r === false) {
      toast("S'u gjet asnjë blerje e mëparshme");
    } else {
      toast("Rikthimi funksionon vetëm në aplikacionin e telefonit 📱", 2200);
    }
  }

  $("tgl-sound").addEventListener("change", (e) => {
    store.sound = e.target.checked;
    if (store.sound) Sound.coin();
  });
  $("tgl-music").addEventListener("change", (e) => {
    store.music = e.target.checked;
    if (store.music) Music.start(); else Music.stop();
  });
  $("tgl-vibration").addEventListener("change", (e) => {
    store.vibration = e.target.checked;
    vibrate(40);
  });
  $("btn-settings").addEventListener("click", openSettings);
  $("btn-settings-home").addEventListener("click", openSettings);
  $("btn-settings-close").addEventListener("click", () => $("overlay-settings").classList.remove("show"));
  $("btn-restore").addEventListener("click", doRestorePurchases);
  $("btn-restore-shop").addEventListener("click", doRestorePurchases);
  $("btn-privacy").addEventListener("click", () => window.open("privacy.html", "_blank"));
  $("btn-rate").addEventListener("click", () =>
    toast("Faleminderit! ⭐ Vlerësimi hapet në App Store / Google Play", 2200));

  /* ---------- Lidhjet e butonave ---------- */
  $("btn-play").addEventListener("click", () => startLevel(Math.min(store.completed, LEVELS.length - 1)));
  $("btn-packs").addEventListener("click", () => { renderPacks(); showScreen("packs"); });
  $("btn-packs-back").addEventListener("click", () => showScreen("home"));
  $("btn-game-back").addEventListener("click", () => { exitTargetMode(); renderPacks(); showScreen("packs"); });
  $("btn-shuffle").addEventListener("click", shuffleWheel);
  $("btn-hint").addEventListener("click", useHint);
  $("btn-bomb").addEventListener("click", useBomb);
  $("btn-target").addEventListener("click", enterTargetMode);
  $("btn-next").addEventListener("click", () => {
    $("overlay-win").classList.remove("show");
    afterWinAd(() => startLevel(current.index + 1));
  });
  $("btn-win-menu").addEventListener("click", () => {
    $("overlay-win").classList.remove("show");
    afterWinAd(() => {
      renderPacks();
      showScreen("packs");
    });
  });
  $("btn-gloss-close").addEventListener("click", () => $("overlay-gloss").classList.remove("show"));

  window.addEventListener("resize", () => {
    if (current && screens.game.classList.contains("active")) {
      renderGrid();
      current.revealed.forEach((k) => {
        const cell = current.cellEls.get(k);
        if (cell) cell.classList.add("revealed");
      });
      renderWheel();
    }
  });

  /* ---------- Nisja ---------- */
  // pa menu konteksti me prekje të gjatë — si aplikacion i vërtetë
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  updateCoins();
  updateJar();
  AdManager.init();

  // ekrani i nisjes zhduket kur gjithçka është gati
  setTimeout(() => {
    const splash = $("splash");
    splash.classList.add("hide");
    setTimeout(() => splash.remove(), 600);
    checkDailyReward();
  }, 1100);

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
