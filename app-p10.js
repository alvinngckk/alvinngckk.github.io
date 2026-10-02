      toast("無法解析字幕檔，請確認為 SRT 或 VTT");
      return;
    }

    // Detect if bilingual already
    const hasBoth = parsed.some((c) => c.en && c.zh);
    const mostlyZh = parsed.filter((c) => c.zh && !c.en).length > parsed.length * 0.5;
    const mostlyEn = parsed.filter((c) => c.en && !c.zh).length > parsed.length * 0.5;

    if (lang === "auto" || lang === "bilingual") {
      if (hasBoth) {
        cues = parsed.map((c, i) => ({ ...c, id: i }));
      } else if (mostlyZh) {
        cues = mergeCaptionTracks(
          cues.filter((c) => c.en).length ? cues : [],
          parsed
        );
        if (!cues.length) {
          cues = parsed.map((c, i) => ({
            id: i,
            start: c.start,
            end: c.end,
            en: "",
            zh: c.zh || c.en,
          }));
        }
      } else {
        cues = mergeCaptionTracks(parsed, cues.filter((c) => c.zh));
        if (!cues.length) cues = parsed.map((c, i) => ({ ...c, id: i }));
      }
    } else if (lang === "en") {
      cues = mergeCaptionTracks(parsed, cues);
    } else if (lang === "zh") {
      const zhTrack = parsed.map((c) => ({
        ...c,
        zh: c.zh || c.en,
        en: "",
      }));
      cues = mergeCaptionTracks(cues.length ? cues : parsed.map((c) => ({ ...c, zh: "" })), zhTrack);
    }

    currentCueIndex = -1;
    renderCues();
    toast(`已載入字幕：${cues.length} 句`);
  }

  function loadCaptionText(text, lang) {
    const parsed = parseCaptions(text);
    if (!parsed.length) {
      toast("無法解析貼上的字幕");
      return;
    }
    if (lang === "en") {
      cues = mergeCaptionTracks(parsed, cues);
    } else if (lang === "zh") {
      const zhTrack = parsed.map((c) => ({ ...c, zh: c.zh || c.en, en: "" }));
      cues = mergeCaptionTracks(cues.length ? cues : parsed.map((c) => ({ ...c, zh: "" })), zhTrack);
    } else {
      cues = parsed.map((c, i) => ({ ...c, id: i }));
    }
    currentCueIndex = -1;
    renderCues();
    toast(`已載入字幕：${cues.length} 句`);
  }

  async function loadSample() {
    try {
      const res = await fetch("./sample-bilingual.srt");
      const text = await res.text();
      cues = parseCaptions(text).map((c, i) => ({ ...c, id: i }));
      currentCueIndex = -1;
      renderCues();
      toast("已載入示範雙語字幕（非真實電影內容）");
    } catch (e) {
      toast("無法載入示範字幕");
    }
  }

  // ── Keyboard ──
  function onKeydown(e) {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;

    switch (e.key) {
      case " ":
        e.preventDefault();
        if (!mediaEl.src) return;
        if (mediaEl.paused) mediaEl.play().catch(() => {});
        else mediaEl.pause();
        break;
      case "ArrowLeft":
        e.preventDefault();
        prevCue();
        break;
      case "ArrowRight":
        e.preventDefault();
        nextCue();
        break;
      case "l":
      case "L":
        e.preventDefault();
        toggleLoop();
        break;
      case "s":
      case "S":
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          toggleShadow();
        }
        break;
      case "a":
      case "A":
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          setABPoint("a");
        }
        break;
      case "b":
      case "B":
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          setABPoint("b");
        }
        break;
      default:
        break;
    }
  }

  // ── Drag and drop ──
  function setupDropZone(el, onFiles) {
    ["dragenter", "dragover"].forEach((ev) => {
      el.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach((ev) => {
      el.addEventListener(ev, (e) => {
