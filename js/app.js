/* =========================================================
   SORT/CODE LAB — UI controller
   ========================================================= */
(function () {
  "use strict";

  const Data = window.SortLab;
  if (!Data) {
    throw new Error("SortLab data failed to load.");
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const dom = {
    algorithmList: $("#algorithmList"),
    algoIndex: $("#algoIndex"),
    algoName: $("#algoName"),
    algoEn: $("#algoEn"),
    algoSummary: $("#algoSummary"),
    algoMeta: $("#algoMeta"),
    tracePhase: $("#tracePhase"),
    barPlot: $("#barPlot"),
    pointerRow: $("#pointerRow"),
    axisRow: $("#axisRow"),
    auxPanel: $("#auxPanel"),
    auxCells: $("#auxCells"),
    treePanel: $("#treePanel"),
    treeSvg: $("#treeSvg"),
    stage: $("#stage"),
    stageNote: $("#stageNote"),
    metricCompare: $("#metricCompare"),
    metricWrites: $("#metricWrites"),
    metricSwaps: $("#metricSwaps"),
    stepNow: $("#stepNow"),
    stepTotal: $("#stepTotal"),
    timeline: $("#timeline"),
    timelineFill: $("#timelineFill"),
    speedRange: $("#speedRange"),
    speedValue: $("#speedValue"),
    resetBtn: $("#resetBtn"),
    prevBtn: $("#prevBtn"),
    playBtn: $("#playBtn"),
    playLabel: $("#playLabel"),
    nextBtn: $("#nextBtn"),
    endBtn: $("#endBtn"),
    stepEyebrow: $("#stepEyebrow"),
    stepTitle: $("#stepTitle"),
    stepNote: $("#stepNote"),
    whyText: $("#whyText"),
    watchGrid: $("#watchGrid"),
    mentalTitle: $("#mentalTitle"),
    invariantText: $("#invariantText"),
    takeaways: $("#takeaways"),
    complexityStrip: $("#complexityStrip"),
    codeFile: $("#codeFile"),
    codeView: $("#codeView"),
    codeScroll: $("#codeScroll"),
    codeLineCount: $("#codeLineCount"),
    activeLineLabel: $("#activeLineLabel"),
    copyCode: $("#copyCode"),
    codeTips: $("#codeTips"),
    arrayForm: $("#arrayForm"),
    arrayInput: $("#arrayInput"),
    arrayHint: $("#arrayHint"),
    arrayPreview: $("#arrayPreview"),
    dataLength: $("#dataLength"),
    randomArray: $("#randomArray"),
    soundToggle: $("#soundToggle"),
    openGuide: $("#openGuide"),
    guideModal: $("#guideModal"),
    closeGuide: $("#closeGuide"),
    startGuide: $("#startGuide"),
    toast: $("#toast"),
    toastText: $("#toastText"),
    liveStatus: $("#liveStatus"),
    brandHome: $("#brandHome"),
    stageTitle: $("#stageTitle")
  };

  const state = {
    algorithm: Data.algorithms[0],
    values: Data.defaultArray.slice(),
    trace: [],
    index: 0,
    playing: false,
    speed: Number(dom.speedRange.value) || 1.4,
    timer: null,
    toastTimer: null,
    lastDataError: false,
    ready: false,
    soundEnabled: true
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phaseNames = {
    READY: "READY TO TRACE",
    COMPARE: "COMPARE",
    SWAP: "SWAP",
    WRITE: "WRITE",
    SCAN: "SCAN",
    SELECT: "SELECT KEY",
    PIVOT: "PARTITION / PIVOT",
    LOCK: "POSITION LOCKED",
    HEAPIFY: "HEAPIFY",
    SPLIT: "DIVIDE",
    MERGE: "MERGE",
    BASE: "BASE CASE",
    GAP: "GAP UPDATE",
    EXIT: "EARLY EXIT",
    COMPLETE: "COMPLETE"
  };

  /* ---------------------------------------------------------
     Utility
     --------------------------------------------------------- */

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function pad(value, size = 3) {
    return String(value).padStart(size, "0");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function announce(message) {
    dom.liveStatus.textContent = "";
    window.setTimeout(() => {
      dom.liveStatus.textContent = message;
    }, 20);
  }

  function showToast(message, kind = "info") {
    dom.toastText.textContent = message;
    dom.toast.classList.toggle("is-error", kind === "error");
    dom.toast.classList.add("is-visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      dom.toast.classList.remove("is-visible");
    }, 2800);
    announce(message);
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(values) {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function uniqueRandomValues(length) {
    const pool = [];
    for (let i = 4; i <= 98; i += 1) pool.push(i);
    return shuffle(pool).slice(0, length);
  }

  function valuesForPreset(kind) {
    const length = state.values.length || 12;
    if (kind === "reversed") {
      return Array.from({ length }, (_, i) => 95 - Math.round((i * 75) / Math.max(1, length - 1))).sort((a, b) => b - a);
    }
    if (kind === "nearly") {
      const base = Array.from({ length }, (_, i) => 8 + Math.round((i * 82) / Math.max(1, length - 1)));
      const swaps = Math.max(1, Math.min(3, Math.floor(length / 5)));
      for (let i = 0; i < swaps; i += 1) {
        const left = randomInt(0, Math.max(0, length - 3));
        [base[left], base[left + 1]] = [base[left + 1], base[left]];
      }
      return base;
    }
    if (kind === "duplicates") {
      const pool = [8, 18, 28, 38, 48, 58, 68];
      return Array.from({ length }, () => pool[randomInt(0, pool.length - 1)]);
    }
    return uniqueRandomValues(length);
  }

  function formatValues(values) {
    return values.join(", ");
  }

  function readArrayInput() {
    const raw = dom.arrayInput.value.trim();
    if (!raw) return { error: "请输入至少 3 个整数。" };
    const tokens = raw.split(/[\s,，;；]+/).filter(Boolean);
    if (tokens.some((token) => !/^\d+$/.test(token))) {
      return { error: "只接受整数，请用逗号或空格分隔。" };
    }
    const values = tokens.map(Number);
    if (values.length < Data.limits.minLength || values.length > Data.limits.maxLength) {
      return { error: `数组长度需要在 ${Data.limits.minLength}–${Data.limits.maxLength} 个元素之间。` };
    }
    if (values.some((v) => v < Data.limits.minValue || v > Data.limits.maxValue)) {
      return { error: `每个数值需要在 ${Data.limits.minValue}–${Data.limits.maxValue} 之间。` };
    }
    return { values };
  }

  function setInputError(message) {
    const isError = Boolean(message);
    dom.arrayInput.classList.toggle("is-error", isError);
    dom.arrayInput.setAttribute("aria-invalid", isError ? "true" : "false");
    dom.arrayHint.classList.toggle("is-error", isError);
    dom.arrayHint.textContent = message || `3–${Data.limits.maxLength} 个整数 · 1–99 · 支持重复值`;
  }

  /* ---------------------------------------------------------
     Audio feedback
     A tiny synthesized instrument: no assets, no network.
     The AudioContext is only created from a user gesture.
     --------------------------------------------------------- */

  const SOUND_STORAGE_KEY = "sortcode-lab.sound";
  const sound = {
    ctx: null,
    master: null,
    compressor: null,
    lastStepAt: 0
  };

  function readSoundPreference() {
    try {
      return window.localStorage.getItem(SOUND_STORAGE_KEY) !== "off";
    } catch (error) {
      return true;
    }
  }

  function persistSoundPreference(enabled) {
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? "on" : "off");
    } catch (error) {
      /* localStorage may be unavailable in a private context; sound still works. */
    }
  }

  function ensureAudio() {
    if (!state.soundEnabled) return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sound.ctx) {
      try {
        sound.ctx = new AudioContextClass();
        sound.compressor = sound.ctx.createDynamicsCompressor();
        sound.compressor.threshold.value = -24;
        sound.compressor.knee.value = 20;
        sound.compressor.ratio.value = 5;
        sound.compressor.attack.value = 0.004;
        sound.compressor.release.value = 0.24;
        sound.master = sound.ctx.createGain();
        sound.master.gain.value = 0.8;
        sound.compressor.connect(sound.master);
        sound.master.connect(sound.ctx.destination);
      } catch (error) {
        sound.ctx = null;
        return null;
      }
    }

    if (sound.ctx.state === "suspended") {
      sound.ctx.resume().catch(() => {});
    }
    return sound.ctx;
  }

  function tone(frequency, duration, options = {}) {
    const ctx = ensureAudio();
    if (!ctx) return;

    const start = ctx.currentTime + (options.delay || 0);
    const level = options.gain == null ? 0.03 : options.gain;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();

    oscillator.type = options.type || "sine";
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), start + duration);
    }

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(level, start + 0.007);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(envelope);
    envelope.connect(sound.compressor);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }

  function playCompleteChime() {
    if (!state.soundEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      tone(frequency, index === notes.length - 1 ? 0.34 : 0.2, {
        delay: index * 0.09,
        gain: index === notes.length - 1 ? 0.036 : 0.028,
        type: "sine"
      });
    });
  }

  function playStepSound(step) {
    if (!state.soundEnabled || !step) return;
    const now = performance.now();
    if (now - sound.lastStepAt < 34) return;
    sound.lastStepAt = now;

    if (step.phase === "COMPLETE") {
      playCompleteChime();
      return;
    }

    if (step.phase === "COMPARE") {
      const index = step.compare[0];
      const value = Number.isFinite(index) ? step.array[index] : 50;
      tone(255 + value * 2.25, 0.045, { type: "triangle", gain: 0.02 });
      return;
    }

    if (step.phase === "SWAP" || step.phase === "WRITE") {
      tone(170, 0.085, { endFrequency: 126, type: "sine", gain: 0.042 });
      tone(84, 0.07, { endFrequency: 70, type: "triangle", gain: 0.016, delay: 0.008 });
      return;
    }

    if (step.phase === "PIVOT") {
      tone(470, 0.11, { endFrequency: 620, type: "sine", gain: 0.026 });
      return;
    }

    if (step.phase === "SELECT" || step.phase === "LOCK") {
      tone(350, 0.055, { endFrequency: 405, type: "sine", gain: 0.018 });
      return;
    }

    if (["HEAPIFY", "MERGE", "SPLIT", "GAP", "BASE", "EXIT"].includes(step.phase)) {
      tone(245, 0.045, { endFrequency: 280, type: "triangle", gain: 0.014 });
      return;
    }

    tone(205, 0.03, { type: "square", gain: 0.008 });
  }

  function playReverseTick() {
    if (!state.soundEnabled) return;
    tone(235, 0.04, { endFrequency: 185, type: "triangle", gain: 0.013 });
  }

  function playUi(kind) {
    if (!state.soundEnabled) return;
    if (kind === "switch") {
      tone(320, 0.045, { endFrequency: 375, type: "triangle", gain: 0.016 });
      tone(485, 0.05, { type: "sine", gain: 0.012, delay: 0.045 });
    } else if (kind === "confirm") {
      tone(660, 0.08, { type: "sine", gain: 0.018 });
      tone(880, 0.1, { type: "sine", gain: 0.012, delay: 0.06 });
    } else if (kind === "error") {
      tone(150, 0.12, { endFrequency: 112, type: "triangle", gain: 0.026 });
    } else if (kind === "start") {
      tone(290, 0.08, { endFrequency: 440, type: "triangle", gain: 0.02 });
    } else if (kind === "pause") {
      tone(420, 0.065, { endFrequency: 285, type: "triangle", gain: 0.014 });
    } else if (kind === "reset") {
      tone(270, 0.08, { endFrequency: 180, type: "sine", gain: 0.018 });
    } else if (kind === "jump") {
      tone(330, 0.07, { endFrequency: 610, type: "triangle", gain: 0.018 });
    } else if (kind === "scrub") {
      tone(370, 0.025, { type: "sine", gain: 0.009 });
    } else {
      tone(510, 0.025, { type: "square", gain: 0.009 });
    }
  }

  function updateSoundButton() {
    if (!dom.soundToggle) return;
    dom.soundToggle.classList.toggle("is-muted", !state.soundEnabled);
    dom.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
    dom.soundToggle.setAttribute("aria-label", state.soundEnabled ? "关闭音效" : "开启音效");
    dom.soundToggle.title = state.soundEnabled ? "关闭音效（M）" : "开启音效（M）";
  }

  function setSoundEnabled(enabled) {
    const next = Boolean(enabled);
    if (next === state.soundEnabled) return;
    state.soundEnabled = next;
    persistSoundPreference(next);
    updateSoundButton();

    if (sound.ctx && sound.master) {
      sound.master.gain.setTargetAtTime(next ? 0.8 : 0.0001, sound.ctx.currentTime, 0.012);
    }
    if (next) {
      ensureAudio();
      playUi("confirm");
      showToast("音效已开启 · 按 M 可静音");
    } else {
      showToast("音效已关闭 · 按 M 可开启");
    }
  }

  function toggleSound() {
    setSoundEnabled(!state.soundEnabled);
  }

  /* ---------------------------------------------------------
     C syntax highlighting
     --------------------------------------------------------- */

  const C_TYPES = new Set(["void", "int", "char", "long", "short", "unsigned", "signed", "const", "static", "size_t"]);
  const C_KEYWORDS = new Set(["for", "while", "if", "else", "return", "break", "continue", "switch", "case", "do"]);

  function highlightC(source) {
    const regex = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_]\w*\b|\b\d+\b|[+\-*/%=<>!&|^~?:;,(){}[\]])/g;
    let html = "";
    let last = 0;
    let match;

    while ((match = regex.exec(source)) !== null) {
      const token = match[0];
      if (match.index > last) html += escapeHtml(source.slice(last, match.index));
      let cls = "";
      if (token.startsWith("/*") || token.startsWith("//")) cls = "tok-comment";
      else if (/^".*"$/.test(token) || /^'.*'$/.test(token)) cls = "tok-string";
      else if (/^\d+$/.test(token)) cls = "tok-number";
      else if (C_TYPES.has(token)) cls = "tok-type";
      else if (C_KEYWORDS.has(token)) cls = "tok-keyword";
      else if (/^[A-Za-z_]\w*$/.test(token)) {
        const after = source.slice(match.index + token.length);
        cls = /^\s*\(/.test(after) ? "tok-fn" : "";
      } else cls = "tok-op";

      html += cls ? `<span class="${cls}">${escapeHtml(token)}</span>` : escapeHtml(token);
      last = match.index + token.length;
    }

    if (last < source.length) html += escapeHtml(source.slice(last));
    return html || "&nbsp;";
  }

  /* ---------------------------------------------------------
     Algorithm list & header
     --------------------------------------------------------- */

  function renderAlgorithmList() {
    dom.algorithmList.innerHTML = Data.algorithms.map((algorithm) => `
      <button type="button" class="algo-item${algorithm.id === state.algorithm.id ? " is-active" : ""}"
        data-algo="${algorithm.id}" role="listitem" aria-pressed="${algorithm.id === state.algorithm.id}">
        <span class="algo-number">${pad(algorithm.index, 2)}</span>
        <span class="algo-item-name">
          <strong>${escapeHtml(algorithm.name)}</strong>
          <span>${escapeHtml(algorithm.en)}</span>
        </span>
        <span class="algo-badge">${escapeHtml(algorithm.complexity.average)}</span>
      </button>
    `).join("");

    $$(".algo-item", dom.algorithmList).forEach((button) => {
      button.addEventListener("click", () => {
        selectAlgorithm(button.dataset.algo);
      });
    });
  }

  function renderHeader() {
    const algorithm = state.algorithm;
    dom.algoIndex.textContent = pad(algorithm.index, 2);
    dom.algoName.textContent = algorithm.name;
    dom.algoEn.textContent = algorithm.en;
    dom.algoSummary.textContent = algorithm.summary;
    dom.algoMeta.innerHTML = `
      <span class="meta-chip is-accent"><b>${escapeHtml(algorithm.complexity.average)}</b> AVG</span>
      <span class="meta-chip"><b>${escapeHtml(algorithm.stable)}</b></span>
      <span class="meta-chip"><b>${escapeHtml(algorithm.inPlace)}</b></span>
      <span class="meta-chip"><b id="metaStepCount">${pad(state.trace.length, 2)}</b> STEPS</span>
    `;
    dom.mentalTitle.textContent = algorithm.mental.title;
    dom.invariantText.textContent = algorithm.mental.invariant;
    dom.takeaways.innerHTML = algorithm.mental.takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const c = algorithm.complexity;
    dom.complexityStrip.innerHTML = `
      <span>BEST <b>${escapeHtml(c.best)}</b></span>
      <span>AVG <b>${escapeHtml(c.average)}</b></span>
      <span>WORST <b>${escapeHtml(c.worst)}</b></span>
      <span>SPACE <b>${escapeHtml(c.space)}</b></span>
    `;
    dom.codeTips.innerHTML = algorithm.codeTips.map((tip, index) => `
      <li><span>${pad(index + 1, 2)}</span><div><strong>${escapeHtml(tip.title)}</strong>${escapeHtml(tip.text)}</div></li>
    `).join("");
  }

  function updateAlgorithmActive() {
    $$(".algo-item", dom.algorithmList).forEach((button) => {
      const active = button.dataset.algo === state.algorithm.id;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  /* ---------------------------------------------------------
     Code panel
     --------------------------------------------------------- */

  function renderCode() {
    const algorithm = state.algorithm;
    dom.codeFile.textContent = algorithm.file;
    dom.codeLineCount.textContent = `${algorithm.totalLines} LINES`;
    dom.codeView.innerHTML = algorithm.code.map((line, index) => {
      const anchor = line.anchor || "";
      const clickable = Boolean(anchor && state.trace.some((step) => step.lineKey === anchor));
      return `<div class="code-line${clickable ? " is-jumpable" : ""}" data-line="${index + 1}" data-anchor="${escapeHtml(anchor)}"${clickable ? ' role="button" tabindex="0"' : ""}>
        <span class="line-number">${String(index + 1).padStart(2, "0")}</span>
        <span class="line-code">${highlightC(line.t)}</span>
      </div>`;
    }).join("");

    $$(".code-line", dom.codeView).forEach((line) => {
      const activate = () => jumpToCodeLine(line);
      line.addEventListener("click", activate);
      line.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    });
  }

  function jumpToCodeLine(line) {
    const anchor = line.dataset.anchor;
    if (!anchor) {
      showToast("这一行是结构或括号，没有独立的数组操作。");
      return;
    }
    const index = state.trace.findIndex((step) => step.lineKey === anchor);
    if (index < 0) {
      showToast("这一行在当前轨迹里没有执行记录。");
      return;
    }
    pause();
    goToStep(index, { tone: false });
    playUi("jump");
    showToast(`已跳到第 ${pad(index + 1)} 步 · 代码第 ${line.dataset.line} 行`);
  }

  function setActiveCodeLine(lineNumber) {
    $$(".code-line", dom.codeView).forEach((line) => {
      line.classList.toggle("is-active", Number(line.dataset.line) === lineNumber);
    });
    const active = $(`.code-line[data-line="${lineNumber}"]`, dom.codeView);
    if (!active) return;
    dom.activeLineLabel.textContent = `LINE ${String(lineNumber).padStart(2, "0")} / ${String(state.algorithm.totalLines).padStart(2, "0")}`;
    const relativeTop = active.offsetTop - dom.codeScroll.clientHeight / 2 + active.offsetHeight / 2;
    const maxTop = Math.max(0, dom.codeScroll.scrollHeight - dom.codeScroll.clientHeight);
    const top = clamp(relativeTop, 0, maxTop);
    if (Math.abs(dom.codeScroll.scrollTop - top) > 6) {
      dom.codeScroll.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
    }
  }

  /* ---------------------------------------------------------
     Stage / bars
     --------------------------------------------------------- */

  function rebuildBars() {
    const n = state.trace[0]?.array.length || state.values.length;
    dom.barPlot.innerHTML = "";
    dom.axisRow.innerHTML = "";
    dom.pointerRow.innerHTML = "";
    for (let i = 0; i < n; i += 1) {
      const slot = document.createElement("div");
      slot.className = "bar-slot";
      slot.dataset.index = String(i);
      slot.innerHTML = `
        <span class="bar-value">0</span>
        <span class="bar" aria-hidden="true"></span>
      `;
      dom.barPlot.appendChild(slot);

      const axis = document.createElement("span");
      axis.className = "axis-slot";
      axis.textContent = String(i);
      dom.axisRow.appendChild(axis);
    }
    const dense = n > 12 && window.innerWidth < 620;
    dom.barPlot.classList.toggle("is-dense", dense);
    dom.axisRow.classList.toggle("is-dense", dense);
    dom.dataLength.textContent = `${n} / ${Data.limits.maxLength}`;
  }

  function renderBars(step) {
    const maxValue = 100;
    const compare = new Set(step.compare);
    const swap = new Set(step.swap);
    const write = new Set(step.write);
    const sorted = new Set(step.sorted);
    const pointed = new Set(step.pointers.map((pointer) => pointer.index));
    const slots = $$(".bar-slot", dom.barPlot);

    slots.forEach((slot, i) => {
      const value = step.array[i];
      const bar = $(".bar", slot);
      const label = $(".bar-value", slot);
      const height = 5 + (value / maxValue) * 86;
      const inRange = step.range && i >= step.range[0] && i <= step.range[1];
      const stateName = swap.has(i)
        ? "swap"
        : compare.has(i)
          ? "compare"
          : write.has(i)
            ? "swap"
            : step.pivot === i
              ? "pivot"
              : step.keyIndex === i
                ? "key"
                : sorted.has(i)
                  ? "sorted"
                  : "default";

      slot.className = `bar-slot${inRange ? " is-in-range" : ""}${stateName !== "default" ? ` is-${stateName}` : ""}${write.has(i) ? " is-write" : ""}${pointed.has(i) ? " is-pointed" : ""}`;
      slot.dataset.index = String(i);
      bar.style.setProperty("--h", `${height}%`);
      label.textContent = value;
      const stateLabel = stateName === "default" ? "普通" : {
        swap: "移动",
        compare: "比较中",
        pivot: "基准",
        key: "待插入",
        sorted: "已就位"
      }[stateName];
      slot.setAttribute("aria-label", `索引 ${i}，值 ${value}，${stateLabel}${inRange ? "，在当前区间" : ""}`);
    });

    dom.barPlot.setAttribute("aria-label", `当前数组：${step.array.join(", ")}`);
    dom.stageTitle.textContent = `数组可视化：${step.array.join(", ")}`;
    renderPointers(step);
  }

  function renderPointers(step) {
    dom.pointerRow.innerHTML = "";
    const n = step.array.length;
    for (let i = 0; i < n; i += 1) {
      const slot = document.createElement("span");
      slot.className = "pointer-slot";
      const matches = step.pointers.filter((pointer) => pointer.index === i);
      matches.slice(0, 3).forEach((pointer) => {
        const chip = document.createElement("span");
        chip.className = `pointer${pointer.tone ? ` is-${pointer.tone}` : ""}`;
        chip.textContent = pointer.label;
        chip.title = `${pointer.label} 指向索引 ${i}`;
        slot.appendChild(chip);
      });
      dom.pointerRow.appendChild(slot);
    }
  }

  function renderAux(step) {
    const hasAux = Boolean(step.aux);
    dom.auxPanel.hidden = !hasAux;
    dom.stage.classList.toggle("has-aux", hasAux);
    if (!hasAux) {
      dom.auxCells.innerHTML = "";
      return;
    }
    dom.auxCells.innerHTML = step.aux.map((value, index) => {
      const classes = [
        "aux-cell",
        index === step.auxWrite ? "is-written" : "",
        step.compare.includes(index) ? "is-source" : ""
      ].filter(Boolean).join(" ");
      return `<span class="${classes}" title="tmp[${index}]">${value == null ? "·" : escapeHtml(value)}</span>`;
    }).join("");
  }

  function renderTree(step) {
    const isHeap = state.algorithm.id === "heap" && step.heapSize && step.phase !== "COMPLETE";
    dom.treePanel.hidden = !isHeap;
    dom.stage.classList.toggle("has-tree", Boolean(isHeap));
    if (!isHeap) {
      dom.treeSvg.innerHTML = "";
      return;
    }

    const size = step.heapSize;
    const width = Math.max(300, Math.round(dom.treeSvg.clientWidth || 860));
    const compact = width < 560;
    const height = compact ? 74 : 86;
    const maxDepth = size > 0 ? Math.floor(Math.log2(size)) : 0;
    const levelGap = maxDepth > 0 ? Math.min(compact ? 17 : 20, (compact ? 50 : 62) / maxDepth) : 0;
    const radius = compact ? 7 : (maxDepth >= 4 ? 9 : 10);
    const positions = [];

    for (let i = 0; i < size; i += 1) {
      const depth = Math.floor(Math.log2(i + 1));
      const levelStart = 2 ** depth - 1;
      const offset = i - levelStart;
      const count = 2 ** depth;
      const x = ((offset + 0.5) / count) * width;
      const y = 9 + depth * levelGap;
      positions.push({ x, y });
    }

    let markup = "";
    for (let i = 1; i < size; i += 1) {
      const parent = Math.floor((i - 1) / 2);
      markup += `<line class="tree-edge" x1="${positions[parent].x.toFixed(1)}" y1="${positions[parent].y.toFixed(1)}" x2="${positions[i].x.toFixed(1)}" y2="${positions[i].y.toFixed(1)}" />`;
    }

    const compareSet = new Set(step.compare);
    const pointerSet = new Set(step.pointers.map((pointer) => pointer.index));
    positions.forEach((position, index) => {
      const nodeClass = [
        "tree-node",
        compareSet.has(index) ? "is-compare" : "",
        pointerSet.has(index) || step.pivot === index || step.keyIndex === index ? "is-active" : ""
      ].filter(Boolean).join(" ");
      const label = String(step.array[index]);
      const fontSize = compact ? (label.length > 2 ? 6.2 : 7.2) : (label.length > 2 ? 8 : 9.4);
      markup += `<g class="${nodeClass}" transform="translate(${position.x.toFixed(1)} ${position.y.toFixed(1)})">
        <circle r="${radius}"></circle>
        <text y="0.4" style="font-size:${fontSize}px">${escapeHtml(label)}</text>
      </g>`;
    });

    dom.treeSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    dom.treeSvg.style.height = `${height}px`;
    dom.treeSvg.setAttribute("aria-label", `当前最大堆，共 ${size} 个节点`);
    dom.treeSvg.innerHTML = markup;
  }

  /* ---------------------------------------------------------
     Step rendering
     --------------------------------------------------------- */

  function renderStep() {
    const step = state.trace[state.index];
    if (!step) return;
    const total = state.trace.length;
    const progress = total <= 1 ? 0 : (state.index / (total - 1)) * 100;
    const lineNumber = state.algorithm.lineMap[step.lineKey] || 1;

    renderBars(step);
    renderAux(step);
    renderTree(step);

    dom.tracePhase.textContent = phaseNames[step.phase] || step.phase;
    dom.tracePhase.dataset.phase = step.phase;
    dom.stageNote.textContent = step.note;
    dom.metricCompare.textContent = step.stats.comparisons;
    dom.metricWrites.textContent = step.stats.writes;
    dom.metricSwaps.textContent = step.stats.swaps;
    dom.stepNow.textContent = pad(state.index + 1);
    dom.stepTotal.textContent = pad(total);
    dom.timeline.max = String(Math.max(0, total - 1));
    dom.timeline.value = String(state.index);
    dom.timelineFill.style.width = `${progress}%`;
    dom.timeline.setAttribute("aria-valuetext", `第 ${state.index + 1} 步，共 ${total} 步`);
    dom.stepEyebrow.textContent = step.phase;
    dom.stepTitle.textContent = step.title;
    dom.stepNote.textContent = step.note;
    dom.whyText.textContent = step.why || state.algorithm.stepsWhy;
    dom.watchGrid.innerHTML = step.vars.length
      ? step.vars.slice(0, 4).map((variable) => {
        const accent = /key|pivot|min|gap|largest|mid|i$|j$/i.test(variable.name) ? " is-accent" : "";
        return `<div class="watch-item${accent}"><span>${escapeHtml(variable.name)}</span><b title="${escapeHtml(variable.value)}">${escapeHtml(variable.value)}</b></div>`;
      }).join("")
      : `<span class="watch-empty">当前步骤没有活动变量</span>`;

    setActiveCodeLine(lineNumber);
    updateTransportState();

    const metaCount = $("#metaStepCount");
    if (metaCount) metaCount.textContent = pad(total, 2);
  }

  function updateTransportState() {
    const atStart = state.index <= 0;
    const atEnd = state.index >= state.trace.length - 1;
    dom.prevBtn.disabled = atStart;
    dom.nextBtn.disabled = atEnd;
    dom.resetBtn.disabled = atStart && !state.playing;
    dom.playBtn.classList.toggle("is-playing", state.playing);
    dom.playLabel.textContent = state.playing ? "暂停" : atEnd ? "重新播放" : "自动播放";
    dom.playBtn.setAttribute("aria-label", state.playing ? "暂停播放" : "自动播放");
  }

  function goToStep(index, options = {}) {
    if (!state.trace.length) return;
    const next = clamp(Number(index), 0, state.trace.length - 1);
    const changed = next !== state.index;
    state.index = next;
    renderStep();
    if (changed) {
      if (!options.silent) {
        announce(`第 ${state.index + 1} 步，共 ${state.trace.length} 步：${state.trace[state.index].title}`);
      }
      if (options.tone !== false) playStepSound(state.trace[state.index]);
    }
  }

  function nextStep() {
    if (state.index >= state.trace.length - 1) {
      pause();
      updateTransportState();
      return;
    }
    pause();
    goToStep(state.index + 1);
  }

  function prevStep() {
    pause();
    if (state.index > 0) {
      goToStep(state.index - 1, { silent: true, tone: false });
      playReverseTick();
      announce(`第 ${state.index + 1} 步，共 ${state.trace.length} 步：${state.trace[state.index].title}`);
    }
  }

  function resetTrace() {
    pause();
    goToStep(0, { silent: true, tone: false });
    playUi("reset");
    showToast("轨迹已回到起点。");
  }

  function jumpToEnd() {
    pause();
    goToStep(state.trace.length - 1, { silent: true, tone: false });
    playUi("jump");
    showToast("已跳到轨迹末尾。");
  }

  function clearPlaybackTimer() {
    if (state.timer) {
      window.clearTimeout(state.timer);
      state.timer = null;
    }
  }

  function schedulePlayback() {
    clearPlaybackTimer();
    if (!state.playing) return;
    if (state.index >= state.trace.length - 1) {
      pause();
      showToast("已经到达轨迹末尾。");
      return;
    }
    const delay = Math.max(150, 720 / state.speed);
    state.timer = window.setTimeout(() => {
      if (!state.playing) return;
      if (state.index >= state.trace.length - 1) {
        pause();
        return;
      }
      goToStep(state.index + 1, { silent: true });
      schedulePlayback();
    }, delay);
  }

  function play() {
    if (state.playing) return;
    if (state.index >= state.trace.length - 1) {
      state.index = 0;
      renderStep();
    }
    state.playing = true;
    updateTransportState();
    playUi("start");
    announce("开始自动播放。");
    schedulePlayback();
  }

  function pause() {
    if (!state.playing) {
      clearPlaybackTimer();
      return;
    }
    state.playing = false;
    clearPlaybackTimer();
    updateTransportState();
    playUi("pause");
    announce("已暂停。");
  }

  function togglePlayback() {
    if (state.playing) pause();
    else play();
  }

  /* ---------------------------------------------------------
     Trace lifecycle
     --------------------------------------------------------- */

  function renderArrayPreview() {
    if (!dom.arrayPreview) return;
    dom.arrayPreview.innerHTML = state.values
      .map((value) => `<span>${value}</span>`)
      .join("");
  }

  function buildTrace(options = {}) {
    pause();
    state.trace = state.algorithm.build(state.values);
    state.index = 0;
    if (state.trace.length === 0) {
      throw new Error("Trace generation returned no steps.");
    }
    renderHeader();
    updateAlgorithmActive();
    if (!options.keepBars) rebuildBars();
    renderCode();
    renderStep();
    setInputError("");
    dom.arrayInput.value = formatValues(state.values);
    renderArrayPreview();
    dom.dataLength.textContent = `${state.values.length} / ${Data.limits.maxLength}`;
  }

  function selectAlgorithm(id) {
    const algorithm = Data.algorithms.find((item) => item.id === id);
    if (!algorithm || algorithm.id === state.algorithm.id) return;
    pause();
    state.algorithm = algorithm;
    updateAlgorithmActive();
    buildTrace();
    playUi("switch");
    showToast(`已切换到「${algorithm.name}」 · ${algorithm.complexity.average}`);
  }

  function applyValues(values, message) {
    state.values = values.slice();
    buildTrace();
    setInputError("");
    playUi("confirm");
    if (message) showToast(message);
  }

  /* ---------------------------------------------------------
     Events
     --------------------------------------------------------- */

  dom.arrayForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = readArrayInput();
    if (result.error) {
      setInputError(result.error);
      playUi("error");
      showToast(result.error, "error");
      dom.arrayInput.focus();
      return;
    }
    applyValues(result.values, `已载入 ${result.values.length} 个新元素。`);
  });

  dom.arrayInput.addEventListener("input", () => {
    if (dom.arrayInput.classList.contains("is-error")) setInputError("");
  });

  dom.randomArray.addEventListener("click", () => {
    const values = valuesForPreset("random");
    applyValues(values, "已生成一组新的随机数据。");
  });

  $$("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = button.dataset.preset;
      const values = valuesForPreset(preset);
      const names = { random: "随机", nearly: "近乎有序", reversed: "逆序", duplicates: "少量重复" };
      applyValues(values, `已载入「${names[preset] || preset}」预设。`);
    });
  });

  dom.playBtn.addEventListener("click", togglePlayback);
  dom.prevBtn.addEventListener("click", prevStep);
  dom.nextBtn.addEventListener("click", nextStep);
  dom.endBtn.addEventListener("click", jumpToEnd);
  dom.resetBtn.addEventListener("click", resetTrace);
  if (dom.soundToggle) dom.soundToggle.addEventListener("click", toggleSound);

  dom.timeline.addEventListener("input", () => {
    pause();
    goToStep(Number(dom.timeline.value), { silent: true, tone: false });
    playUi("scrub");
  });

  dom.speedRange.addEventListener("input", () => {
    state.speed = Number(dom.speedRange.value);
    dom.speedValue.textContent = `${state.speed.toFixed(1)}×`;
    if (state.playing) schedulePlayback();
  });

  dom.copyCode.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.algorithm.codeText);
      playUi("confirm");
      showToast("当前 C 代码已复制。");
    } catch (error) {
      const helper = document.createElement("textarea");
      helper.value = state.algorithm.codeText;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
      playUi("confirm");
      showToast("当前 C 代码已复制。");
    }
  });

  /* ---------------------------------------------------------
     Guide dialog
     --------------------------------------------------------- */

  function openGuide() {
    if (typeof dom.guideModal.showModal === "function") {
      if (!dom.guideModal.open) dom.guideModal.showModal();
    } else {
      dom.guideModal.setAttribute("open", "");
    }
    document.body.classList.add("guide-open");
    window.setTimeout(() => dom.closeGuide.focus(), 80);
  }

  function closeGuide() {
    if (typeof dom.guideModal.close === "function" && dom.guideModal.open) dom.guideModal.close();
    else dom.guideModal.removeAttribute("open");
    document.body.classList.remove("guide-open");
  }

  dom.openGuide.addEventListener("click", openGuide);
  dom.closeGuide.addEventListener("click", closeGuide);
  dom.startGuide.addEventListener("click", () => {
    closeGuide();
    dom.stage.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
  });

  dom.guideModal.addEventListener("click", (event) => {
    if (event.target === dom.guideModal) closeGuide();
  });
  dom.guideModal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeGuide();
  });

  /* ---------------------------------------------------------
     Keyboard
     --------------------------------------------------------- */

  function isTypingTarget(target) {
    return target instanceof HTMLElement && (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    );
  }

  document.addEventListener("keydown", (event) => {
    const typing = isTypingTarget(event.target);
    const guideOpen = dom.guideModal.open || dom.guideModal.hasAttribute("open");

    if (event.key === "Escape") {
      if (guideOpen) {
        event.preventDefault();
        closeGuide();
      }
      return;
    }

    if (!typing && event.key.toLowerCase() === "m") {
      event.preventDefault();
      toggleSound();
      return;
    }

    if (guideOpen || typing) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextStep();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      prevStep();
    } else if (event.code === "Space") {
      event.preventDefault();
      togglePlayback();
    } else if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      resetTrace();
    } else if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      applyValues(valuesForPreset("random"), "已生成一组新的随机数据。");
    } else if (event.key.toLowerCase() === "g") {
      event.preventDefault();
      openGuide();
    } else if (/^[1-7]$/.test(event.key)) {
      const algorithm = Data.algorithms[Number(event.key) - 1];
      if (algorithm) {
        event.preventDefault();
        selectAlgorithm(algorithm.id);
      }
    }
  });

  dom.brandHome.addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (!state.trace.length) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      rebuildBars();
      renderStep();
    }, 160);
  });

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */

  function init() {
    state.soundEnabled = readSoundPreference();
    state.speed = Number(dom.speedRange.value);
    dom.speedValue.textContent = `${state.speed.toFixed(1)}×`;
    dom.arrayInput.value = formatValues(state.values);
    updateSoundButton();
    renderAlgorithmList();
    renderHeader();
    buildTrace({ keepBars: false });
    updateTransportState();
  }

  init();
})();
