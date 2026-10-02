        e.preventDefault();
        e.stopPropagation();
        el.classList.remove("dragover");
      });
    });
    el.addEventListener("drop", (e) => {
      const files = [...(e.dataTransfer?.files || [])];
      if (files.length) onFiles(files);
    });
  }

  // ── Init UI bindings ──
  function init() {
    // Apply prefs
    speedSelect.value = String(prefs.speed);
    mediaEl.playbackRate = prefs.speed;
    practiceSelect.value = prefs.practiceMode;
    updateVocabBadge();

    mediaEl.addEventListener("timeupdate", onTimeUpdate);
    mediaEl.addEventListener("loadedmetadata", onTimeUpdate);
    mediaEl.addEventListener("play", () => $("#btnPlay").textContent = "⏸");
    mediaEl.addEventListener("pause", () => $("#btnPlay").textContent = "▶");

    $("#btnPlay").addEventListener("click", () => {
      if (!mediaEl.src) {
        toast("請先上傳媒體檔案");
        return;
      }
      if (mediaEl.paused) mediaEl.play().catch(() => {});
      else mediaEl.pause();
    });

    $("#btnPrev").addEventListener("click", prevCue);
    $("#btnNext").addEventListener("click", nextCue);
    loopBtn.addEventListener("click", toggleLoop);
    $("#btnShadow").addEventListener("click", toggleShadow);
    $("#btnA").addEventListener("click", () => setABPoint("a"));
    $("#btnB").addEventListener("click", () => setABPoint("b"));
    $("#btnClearAB").addEventListener("click", clearAB);

    speedSelect.addEventListener("change", () => {
      prefs.speed = parseFloat(speedSelect.value) || 1;
      mediaEl.playbackRate = prefs.speed;
      savePrefs();
    });

    practiceSelect.addEventListener("change", () => {
      prefs.practiceMode = practiceSelect.value;
      savePrefs();
      renderCues();
    });

    // Media upload
    const mediaInput = $("#mediaInput");
    $("#mediaDrop").addEventListener("click", () => mediaInput.click());
    mediaInput.addEventListener("change", () => {
      if (mediaInput.files?.[0]) loadMediaFile(mediaInput.files[0]);
    });
    setupDropZone($("#mediaDrop"), (files) => {
      const f = files.find((x) => /^video\/|^audio\//.test(x.type) || /\.(mp4|webm|mkv|mp3|m4a|wav|ogg|flac|aac|mov)$/i.test(x.name));
      if (f) loadMediaFile(f);
      else toast("請放入影音檔案");
    });

    // Caption uploads
    $("#capEnInput").addEventListener("change", async () => {
      const f = $("#capEnInput").files?.[0];
      if (f) await loadCaptionFile(f, "en");
      $("#capEnInput").value = "";
    });
    $("#capZhInput").addEventListener("change", async () => {
      const f = $("#capZhInput").files?.[0];
      if (f) await loadCaptionFile(f, "zh");
      $("#capZhInput").value = "";
    });
    $("#capBiInput").addEventListener("change", async () => {
      const f = $("#capBiInput").files?.[0];
      if (f) await loadCaptionFile(f, "bilingual");
      $("#capBiInput").value = "";
    });

    setupDropZone($("#captionDrop"), async (files) => {
      const f = files.find((x) => /\.(srt|vtt|txt)$/i.test(x.name));
      if (f) await loadCaptionFile(f, "auto");
      else toast("請放入 .srt 或 .vtt");
    });

    $("#btnLoadUrl").addEventListener("click", () => { loadCaptionFromUrl(); });
    $("#captionUrlInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        loadCaptionFromUrl();
      }
    });

    $("#btnPasteEn").addEventListener("click", () => {
      loadCaptionText($("#pasteArea").value, "en");
    });
    $("#btnPasteZh").addEventListener("click", () => {
      loadCaptionText($("#pasteArea").value, "zh");
    });
    $("#btnPasteBi").addEventListener("click", () => {
      loadCaptionText($("#pasteArea").value, "auto");
    });

    $("#btnLoadSample").addEventListener("click", loadSample);
    $("#btnExportSrt").addEventListener("click", exportSRT);
    $("#btnExportTxt").addEventListener("click", exportTXT);
    $("#btnWhisper").addEventListener("click", runWhisperTranscribe);

