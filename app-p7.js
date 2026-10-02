    }
  }

  async function fetchMediaAsAudioBuffer() {
    const res = await fetch(mediaEl.src);
    const buf = await res.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      return await ctx.decodeAudioData(buf.slice(0));
    } finally {
      await ctx.close().catch(() => {});
    }
  }

  function downsampleTo16k(audioBuffer) {
    const targetRate = 16000;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    // mixdown
    const mixed = new Float32Array(length);
    for (let c = 0; c < numChannels; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < length; i++) mixed[i] += data[i] / numChannels;
    }
    if (audioBuffer.sampleRate === targetRate) return mixed;
    const ratio = audioBuffer.sampleRate / targetRate;
    const newLen = Math.floor(length / ratio);
    const out = new Float32Array(newLen);
    for (let i = 0; i < newLen; i++) {
      const idx = i * ratio;
      const i0 = Math.floor(idx);
      const i1 = Math.min(i0 + 1, length - 1);
      const frac = idx - i0;
      out[i] = mixed[i0] * (1 - frac) + mixed[i1] * frac;
    }
    return out;
  }

  // ── Shadowing ──
  function toggleShadow() {
    shadowMode = !shadowMode;
    $("#btnShadow").classList.toggle("active", shadowMode);
    clearTimeout(shadowTimer);
    if (shadowMode) {
      shadowBanner.classList.add("visible");
      shadowBanner.textContent = "跟讀模式：播放一句 → 停頓 → 重播。按 S 或按鈕結束。";
      if (currentCueIndex < 0 && cues.length) seekToCue(0, true);
      else if (currentCueIndex >= 0) startShadowForCue(currentCueIndex);
      toast("已開啟跟讀模式");
    } else {
      shadowPhase = "idle";
      shadowBanner.classList.remove("visible");
      toast("已關閉跟讀模式");
    }
  }

  function startShadowForCue(index) {
    clearTimeout(shadowTimer);
    shadowPhase = "playing";
    shadowBanner.textContent = "播放中 — 仔細聽";
    shadowBanner.classList.add("visible");
    if (mediaEl.src) {
      mediaEl.currentTime = cues[index].start + 0.01;
      mediaEl.play().catch(() => {});
    }
  }

  // ── Loop / A-B ──
  function toggleLoop() {
    loopMode = !loopMode;
    if (loopMode) abLoop = null;
    updateLoopUI();
    toast(loopMode ? "循環目前句子" : "已關閉句子循環");
    setActiveCue(currentCueIndex, true);
  }

  function setABPoint(which) {
    const t = mediaEl.currentTime || 0;
    if (!abLoop) abLoop = { a: null, b: null };
    if (which === "a") {
      abLoop.a = t;
      toast(`A 點：${formatClock(t)}`);
    } else {
      abLoop.b = t;
      toast(`B 點：${formatClock(t)}`);
    }
    if (abLoop.a != null && abLoop.b != null && abLoop.b <= abLoop.a) {
      // swap
      const tmp = abLoop.a;
      abLoop.a = abLoop.b;
      abLoop.b = tmp;
    }
    if (abLoop.a != null && abLoop.b != null) {
      loopMode = false;
    }
    updateLoopUI();
  }

  function clearAB() {
    abLoop = null;
    updateLoopUI();
    toast("已清除 A-B 循環");
  }

  function updateLoopUI() {
    loopBtn.classList.toggle("active", loopMode);
    if (abLoop && abLoop.a != null && abLoop.b != null) {
      abIndicator.textContent = `A-B ${formatClock(abLoop.a)}–${formatClock(abLoop.b)}`;
      abIndicator.classList.remove("hidden");
    } else if (loopMode) {
      abIndicator.textContent = "循環句子";
      abIndicator.classList.remove("hidden");
    } else {
      abIndicator.classList.add("hidden");
    }
  }

  // ── Drawers ──
  function openDrawer(id) {
    $("#drawerBackdrop").classList.add("open");
    $(id).classList.add("open");
  }
  function closeDrawers() {
    $("#drawerBackdrop").classList.remove("open");
    $$(".drawer").forEach((d) => d.classList.remove("open"));
  }
  function openVocabDrawer() {
    renderVocabList();
    $("#flashcardPanel").classList.add("hidden");
