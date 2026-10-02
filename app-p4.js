    if (index === currentCueIndex && !forceRender) {
      // just update classes if DOM exists
      const items = $$(".cue", cueList);
      items.forEach((el, i) => {
        el.classList.toggle("active", i === index);
        el.classList.toggle("looping", loopMode && i === index);
      });
      return;
    }
    currentCueIndex = index;
    const items = $$(".cue", cueList);
    if (items.length !== cues.length) {
      renderCues();
      return;
    }
    items.forEach((el, i) => {
      el.classList.toggle("active", i === index);
      el.classList.toggle("looping", loopMode && i === index);
    });
    scrollActiveCueIntoView();
  }

  function findCueAt(time) {
    // Binary-ish linear scan is fine for typical subtitle counts
    for (let i = 0; i < cues.length; i++) {
      if (time >= cues[i].start && time < cues[i].end) return i;
    }
    // If between cues, find nearest previous
    for (let i = cues.length - 1; i >= 0; i--) {
      if (time >= cues[i].start) return i;
    }
    return -1;
  }

  function seekToCue(index, play = false) {
    if (index < 0 || index >= cues.length) return;
    const cue = cues[index];
    if (mediaEl.src) {
      mediaEl.currentTime = cue.start + 0.01;
    }
    setActiveCue(index);
    if (play && mediaEl.src) {
      mediaEl.play().catch(() => {});
    }
    if (shadowMode) startShadowForCue(index);
  }

  function prevCue() {
    if (!cues.length) return;
    const idx = currentCueIndex <= 0 ? 0 : currentCueIndex - 1;
    seekToCue(idx, true);
  }

  function nextCue() {
    if (!cues.length) return;
    const idx = currentCueIndex < 0 ? 0 : Math.min(cues.length - 1, currentCueIndex + 1);
    // if already on a cue and past start, go next
    let target = idx;
    if (currentCueIndex >= 0 && currentCueIndex < cues.length - 1) {
      target = currentCueIndex + 1;
    }
    seekToCue(target, true);
  }

  // ── Media ──
  function loadMediaFile(file) {
    if (!file) return;
    if (mediaObjectUrl) URL.revokeObjectURL(mediaObjectUrl);
    mediaObjectUrl = URL.createObjectURL(file);
    const isAudio = /^audio\//i.test(file.type) || /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(file.name);

    mediaEl.src = mediaObjectUrl;
    mediaEl.classList.add("visible");
    mediaPlaceholder.classList.add("hidden");
    mediaWrap.classList.toggle("is-audio", isAudio);
    mediaEl.load();
    toast(`已載入媒體：${file.name}`);
  }

  function onTimeUpdate() {
    const t = mediaEl.currentTime;
    const dur = mediaEl.duration;
    timeDisplay.textContent = `${formatClock(t)} / ${isFinite(dur) ? formatClock(dur) : "--:--"}`;

    if (abLoop && abLoop.a != null && abLoop.b != null) {
      if (t >= abLoop.b - 0.05) {
        mediaEl.currentTime = abLoop.a;
      }
    } else if (loopMode && currentCueIndex >= 0 && cues[currentCueIndex]) {
      const cue = cues[currentCueIndex];
      if (t >= cue.end - 0.05) {
        mediaEl.currentTime = cue.start + 0.01;
      }
    }

    if (shadowMode && shadowPhase === "playing" && currentCueIndex >= 0) {
      const cue = cues[currentCueIndex];
      if (t >= cue.end - 0.05) {
        mediaEl.pause();
        shadowPhase = "pause";
        shadowBanner.textContent = "跟讀中…（停頓後會重播）";
        shadowBanner.classList.add("visible");
        clearTimeout(shadowTimer);
        shadowTimer = setTimeout(() => {
          if (!shadowMode) return;
          shadowPhase = "replay";
          shadowBanner.textContent = "重播句子 — 請跟著說";
          mediaEl.currentTime = cue.start + 0.01;
          mediaEl.play().catch(() => {});
          // after second play, show text briefly then advance? keep looping cue until user exits
          shadowPhase = "playing";
        }, 1500);
        return;
      }
    }

    const idx = findCueAt(t);
    if (idx !== currentCueIndex) setActiveCue(idx);
  }

  // ── Vocab ──
  function addVocab(word, context) {
    const w = word.trim();
    if (!w) return;
